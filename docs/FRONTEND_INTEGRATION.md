# Frontend Integration Guide

This guide explains how to integrate your React frontend with this NestJS backend.

## Overview

The backend provides:
- **Authentication** (JWT-based)
- **User Management**
- **File Upload**
- **AI Chat** (REST + WebSocket streaming)
- **Email Services**

## Quick Start

### 1. Install Dependencies

In your React project:

```bash
npm install axios socket.io-client
npm install @tanstack/react-query  # For API state management
```

### 2. Environment Variables

Create `.env` in your React project:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_WS_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

## API Service Setup

### Create API Client

**`src/services/api.ts`**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refreshToken }
        );

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## Authentication

### Auth Service

**`src/services/authService.ts`**

```typescript
import api from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export const authService = {
  async login(credentials: LoginCredentials) {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },

  async register(userData: RegisterData) {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return data;
  },

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    await api.post('/auth/logout', { refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  async getCurrentUser() {
    const { data } = await api.get('/users/me');
    return data;
  },

  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  },
};
```

### Auth Context

**`src/contexts/AuthContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user on mount if authenticated
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password });
    setUser(data.user);
  };

  const register = async (userData: any) => {
    const data = await authService.register(userData);
    setUser(data.user);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

### Protected Route

**`src/components/ProtectedRoute.tsx`**

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

## AI Chat Integration

### AI Service

**`src/services/aiService.ts`**

```typescript
import api from './api';

export const aiService = {
  async sendMessage(message: string, conversationId?: string) {
    const { data } = await api.post('/ai/chat', {
      message,
      conversationId,
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7,
    });
    return data;
  },

  async getConversations(page = 1, limit = 20) {
    const { data } = await api.get('/ai/conversations', {
      params: { page, limit },
    });
    return data;
  },

  async getConversation(id: string) {
    const { data } = await api.get(`/ai/conversations/${id}`);
    return data;
  },

  async deleteConversation(id: string) {
    await api.delete(`/ai/conversations/${id}`);
  },

  async getUsageStats() {
    const { data } = await api.get('/ai/usage');
    return data;
  },
};
```

### WebSocket Hook

**`src/hooks/useAiChat.ts`**

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function useAiChat(userId: string, accessToken: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const newSocket = io(`${import.meta.env.VITE_WS_BASE_URL}/ai`, {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to AI WebSocket');
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from AI WebSocket');
    });

    newSocket.on('chat:conversation', (data) => {
      setConversationId(data.conversationId);
    });

    newSocket.on('chat:user-message', (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: data.content },
      ]);
    });

    newSocket.on('chat:message', (data) => {
      setCurrentResponse((prev) => prev + data.content);
    });

    newSocket.on('chat:end', () => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: currentResponse },
      ]);
      setCurrentResponse('');
      setIsStreaming(false);
    });

    newSocket.on('chat:error', (err) => {
      console.error('AI Error:', err.message);
      setError(err.message);
      setIsStreaming(false);
      setCurrentResponse('');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!socket || !message.trim() || isStreaming) return;

      setIsStreaming(true);
      setCurrentResponse('');
      setError(null);

      socket.emit('chat:start', {
        userId,
        message,
        conversationId,
        model: 'gpt-4',
        maxTokens: 4096,
        temperature: 0.7,
      });
    },
    [socket, userId, conversationId, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    if (socket) {
      socket.emit('chat:stop');
      setIsStreaming(false);
      setCurrentResponse('');
    }
  }, [socket]);

  return {
    messages,
    currentResponse,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    conversationId,
  };
}
```

### AI Chat Component

**`src/components/AiChat.tsx`**

```typescript
import React, { useState } from 'react';
import { useAiChat } from '../hooks/useAiChat';
import { useAuth } from '../contexts/AuthContext';

export function AiChat() {
  const { user } = useAuth();
  const accessToken = localStorage.getItem('accessToken') || '';
  
  const {
    messages,
    currentResponse,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
  } = useAiChat(user!.id, accessToken);

  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="ai-chat">
      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        
        {currentResponse && (
          <div className="message assistant streaming">
            <strong>assistant:</strong> {currentResponse}
            <span className="cursor">▊</span>
          </div>
        )}

        {error && (
          <div className="error">
            Error: {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder="Type your message..."
        />
        
        {!isStreaming ? (
          <button type="submit" disabled={!input.trim()}>
            Send
          </button>
        ) : (
          <button type="button" onClick={stopStreaming}>
            Stop
          </button>
        )}
      </form>
    </div>
  );
}
```

## File Upload

### File Upload Service

**`src/services/fileService.ts`**

```typescript
import api from './api';

export const fileService = {
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/storage/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async downloadFile(fileId: string) {
    const response = await api.get(`/storage/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async deleteFile(fileId: string) {
    await api.delete(`/storage/${fileId}`);
  },

  async getUserFiles() {
    const { data } = await api.get('/storage/user/me');
    return data;
  },
};
```

### File Upload Component

**`src/components/FileUpload.tsx`**

```typescript
import React, { useState } from 'react';
import { fileService } from '../services/fileService';

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const result = await fileService.uploadFile(file);
      console.log('File uploaded:', result);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        onChange={handleFileChange}
        disabled={uploading}
      />
      
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## React Query Integration

### Setup

**`src/main.tsx`**

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
```

### Custom Hooks

**`src/hooks/useConversations.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../services/aiService';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => aiService.getConversations(),
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => aiService.getConversation(id),
    enabled: !!id,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => aiService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
```

## Error Handling

### Global Error Boundary

**`src/components/ErrorBoundary.tsx`**

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Testing

### API Service Tests

**`src/services/__tests__/authService.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { authService } from '../authService';
import api from '../api';

vi.mock('../api');

describe('authService', () => {
  it('should login successfully', async () => {
    const mockResponse = {
      data: {
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', email: 'test@example.com' },
      },
    };

    vi.mocked(api.post).mockResolvedValue(mockResponse);

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password',
    });

    expect(result).toEqual(mockResponse.data);
    expect(localStorage.getItem('accessToken')).toBe('token');
  });
});
```

## Best Practices

### 1. Environment Variables

Always use environment variables for API URLs:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

### 2. Token Management

Store tokens securely:
- Use `httpOnly` cookies for production
- Clear tokens on logout
- Handle token expiration

### 3. Error Handling

Handle API errors gracefully:

```typescript
try {
  await authService.login(credentials);
} catch (error: any) {
  if (error.response?.status === 401) {
    setError('Invalid credentials');
  } else if (error.response?.status === 429) {
    setError('Too many requests. Try again later.');
  } else {
    setError('An error occurred. Please try again.');
  }
}
```

### 4. Loading States

Always show loading states:

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await someApiCall();
  } finally {
    setIsLoading(false);
  }
};
```

### 5. WebSocket Cleanup

Clean up WebSocket connections:

```typescript
useEffect(() => {
  const socket = io(url);
  
  return () => {
    socket.close();
  };
}, []);
```

## Complete Example App

**`src/App.tsx`**

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AiChat } from './components/AiChat';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <AiChat />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

## Troubleshooting

### CORS Issues

If you get CORS errors, ensure your backend `.env` has:

```env
CORS_ORIGIN=http://localhost:5173
```

### WebSocket Connection Failed

Check:
1. Backend is running
2. CORS_ORIGIN is correct
3. Token is valid
4. WebSocket port is not blocked

### 401 Unauthorized

Token might be expired:
1. Check token in localStorage
2. Verify token refresh logic
3. Check backend logs

## Next Steps

1. ✅ Implement authentication
2. ✅ Add AI chat component
3. ✅ Set up file upload
4. ✅ Configure error handling
5. ✅ Add React Query for state
6. Add user profile page
7. Add conversation history
8. Add dark mode toggle
9. Add notifications
10. Deploy to production

## Resources

- [Backend API Docs](http://localhost:3000/api-docs)
- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)
- [React Query Docs](https://tanstack.com/query/latest)
- [Axios Docs](https://axios-http.com/docs/intro)

