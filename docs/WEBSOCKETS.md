# WebSocket Guide

This document covers real-time communication using WebSocket with Socket.IO.

## Overview

The backend uses Socket.IO for real-time, bidirectional communication. Currently, WebSocket is implemented for:
- **AI Chat Streaming** (real-time AI responses)

## Architecture

```
┌─────────────────┐
│  React Client   │
└────────┬────────┘
         │ Socket.IO Client
         ▼
┌─────────────────┐
│   AI Gateway    │  /ai namespace
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenAI Stream  │
└─────────────────┘
```

## Server Configuration

### Gateway Setup

Located in: `src/modules/ai/ai.gateway.ts`

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/ai',
})
export class AiGateway {
  // ...
}
```

### CORS Configuration

Update `.env` to allow your frontend origin:

```env
CORS_ORIGIN=http://localhost:5173
```

For production:
```env
CORS_ORIGIN=https://your-frontend-domain.com
```

Multiple origins:
```typescript
cors: {
  origin: ['http://localhost:5173', 'https://app.example.com'],
  credentials: true,
}
```

## Client Integration

### Installation

```bash
npm install socket.io-client
```

### Basic Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000/ai', {
  auth: {
    token: 'your-jwt-token'  // Optional: for authentication
  },
  transports: ['websocket'],  // Force WebSocket (skip polling)
});

// Connection events
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useAiSocket(accessToken: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:8000/ai', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  return { socket, isConnected };
}
```

Usage:
```typescript
function AiChat() {
  const { socket, isConnected } = useAiSocket(accessToken);

  // Use socket for communication
}
```

## AI Chat Streaming

### Client → Server Events

#### `chat:start`

Start a new streaming chat session.

```typescript
socket.emit('chat:start', {
  userId: 'user-uuid',
  message: 'Explain quantum computing',
  conversationId: 'conversation-uuid',  // Optional
  model: 'gpt-4',                       // Optional
  maxTokens: 4096,                      // Optional
  temperature: 0.7                      // Optional
});
```

**Parameters:**
- `userId` (required): User ID for authentication
- `message` (required): User's message
- `conversationId` (optional): Continue existing conversation
- `model` (optional): OpenAI model, defaults to `gpt-4`
- `maxTokens` (optional): Max response tokens, defaults to 4096
- `temperature` (optional): Creativity level, defaults to 0.7

#### `chat:stop`

Stop the current streaming session.

```typescript
socket.emit('chat:stop');
```

### Server → Client Events

#### `chat:conversation`

Emitted when a new conversation is created.

```typescript
socket.on('chat:conversation', (data) => {
  console.log('Conversation ID:', data.conversationId);
  // Save conversation ID for future messages
});
```

**Data:**
```typescript
{
  conversationId: string
}
```

#### `chat:user-message`

Emitted after user message is saved to database.

```typescript
socket.on('chat:user-message', (data) => {
  console.log('User message saved:', data.messageId);
});
```

**Data:**
```typescript
{
  messageId: string
  content: string
}
```

#### `chat:message`

Emitted for each chunk of the AI response (streaming).

```typescript
socket.on('chat:message', (data) => {
  // Append chunk to UI
  appendToChat(data.content);
});
```

**Data:**
```typescript
{
  content: string      // Chunk of text
  isComplete: boolean  // Always false during streaming
}
```

#### `chat:end`

Emitted when streaming is complete.

```typescript
socket.on('chat:end', (data) => {
  console.log('Stream complete');
  console.log('Total tokens:', data.totalTokens);
  console.log('Message ID:', data.messageId);
});
```

**Data:**
```typescript
{
  messageId: string
  conversationId: string
  totalTokens: number
  model: string
  finishReason: string  // 'stop', 'length', etc.
}
```

#### `chat:error`

Emitted when an error occurs.

```typescript
socket.on('chat:error', (error) => {
  console.error('Error:', error.message);
  // Show error to user
});
```

**Data:**
```typescript
{
  message: string
}
```

#### `chat:stopped`

Emitted when stream is stopped by user.

```typescript
socket.on('chat:stopped', (data) => {
  console.log('Stream stopped');
});
```

## Complete Implementation Examples

### React Component

```typescript
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function AiChatComponent({ userId, accessToken }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState('');

  // Initialize WebSocket
  useEffect(() => {
    const newSocket = io('http://localhost:8000/ai', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to AI WebSocket');
    });

    newSocket.on('chat:conversation', (data) => {
      setConversationId(data.conversationId);
    });

    newSocket.on('chat:user-message', (data) => {
      // User message confirmed
      setMessages(prev => [...prev, {
        role: 'user',
        content: data.content
      }]);
    });

    newSocket.on('chat:message', (data) => {
      // Accumulate AI response
      setCurrentResponse(prev => prev + data.content);
    });

    newSocket.on('chat:end', (data) => {
      // Add complete AI response to messages
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: currentResponse
      }]);
      setCurrentResponse('');
      setIsStreaming(false);
    });

    newSocket.on('chat:error', (error) => {
      console.error('Error:', error.message);
      alert('Error: ' + error.message);
      setIsStreaming(false);
      setCurrentResponse('');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  const sendMessage = () => {
    if (!socket || !input.trim() || isStreaming) return;

    setIsStreaming(true);
    setCurrentResponse('');

    socket.emit('chat:start', {
      userId,
      message: input,
      conversationId,
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7
    });

    setInput('');
  };

  const stopStreaming = () => {
    if (socket) {
      socket.emit('chat:stop');
      setIsStreaming(false);
      setCurrentResponse('');
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
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isStreaming}
          placeholder="Type your message..."
        />
        
        {!isStreaming ? (
          <button onClick={sendMessage} disabled={!input.trim()}>
            Send
          </button>
        ) : (
          <button onClick={stopStreaming}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
```

### Vue 3 Composition API

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export default {
  setup() {
    const socket = ref(null);
    const messages = ref([]);
    const input = ref('');
    const isStreaming = ref(false);
    const currentResponse = ref('');
    const conversationId = ref(null);

    onMounted(() => {
      socket.value = io('http://localhost:8000/ai', {
        auth: { token: localStorage.getItem('accessToken') },
        transports: ['websocket'],
      });

      socket.value.on('chat:conversation', (data) => {
        conversationId.value = data.conversationId;
      });

      socket.value.on('chat:message', (data) => {
        currentResponse.value += data.content;
      });

      socket.value.on('chat:end', () => {
        messages.value.push({
          role: 'assistant',
          content: currentResponse.value
        });
        currentResponse.value = '';
        isStreaming.value = false;
      });

      socket.value.on('chat:error', (error) => {
        console.error('Error:', error.message);
        isStreaming.value = false;
      });
    });

    onUnmounted(() => {
      socket.value?.close();
    });

    const sendMessage = () => {
      if (!input.value.trim() || isStreaming.value) return;

      messages.value.push({
        role: 'user',
        content: input.value
      });

      socket.value.emit('chat:start', {
        userId: 'user-id',
        message: input.value,
        conversationId: conversationId.value,
      });

      input.value = '';
      isStreaming.value = true;
    };

    return {
      messages,
      input,
      isStreaming,
      currentResponse,
      sendMessage,
    };
  },
};
```

## Connection Management

### Reconnection

Socket.IO handles reconnection automatically:

```typescript
const socket = io('http://localhost:8000/ai', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
});

socket.on('reconnect_error', (error) => {
  console.error('Reconnection failed:', error);
});
```

### Heartbeat/Ping-Pong

Socket.IO automatically sends ping/pong messages. Configure intervals:

```typescript
// Server side (in gateway)
@WebSocketGateway({
  pingInterval: 10000,  // 10 seconds
  pingTimeout: 5000,    // 5 seconds
})
```

### Manual Disconnect

```typescript
// Gracefully disconnect
socket.disconnect();

// Force disconnect
socket.close();
```

## Authentication

### JWT Authentication (Recommended)

Pass JWT token during connection:

```typescript
const socket = io('http://localhost:8000/ai', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

**Server-side validation:**

```typescript
// src/modules/ai/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth.token;

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

Apply to gateway:

```typescript
@UseGuards(WsJwtGuard)
@SubscribeMessage('chat:start')
async handleChatStream(...) {
  // ...
}
```

## Error Handling

### Connection Errors

```typescript
socket.on('connect_error', (error) => {
  if (error.message === 'unauthorized') {
    // Refresh token and reconnect
    refreshAuthToken().then(newToken => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

### Event Errors

```typescript
socket.on('chat:error', (error) => {
  switch (error.code) {
    case 'RATE_LIMIT':
      showNotification('Too many requests. Please wait.');
      break;
    case 'INVALID_MODEL':
      showNotification('Invalid AI model selected.');
      break;
    default:
      showNotification('An error occurred: ' + error.message);
  }
});
```

## Performance Optimization

### Transport Selection

Force WebSocket (skip polling):
```typescript
const socket = io(url, {
  transports: ['websocket'],
});
```

### Compression

Enable compression for large payloads:
```typescript
// Server-side
@WebSocketGateway({
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3,
    },
  },
})
```

### Buffering

Buffer messages during disconnection:
```typescript
const socket = io(url, {
  ackTimeout: 10000,
  retries: 3,
});
```

## Testing

### Unit Tests

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

describe('AI Gateway', () => {
  let app: INestApplication;
  let socket: Socket;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.listen(3000);

    socket = io('http://localhost:8000/ai', {
      transports: ['websocket'],
    });
  });

  afterAll(async () => {
    socket.close();
    await app.close();
  });

  it('should connect successfully', (done) => {
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });
  });

  it('should stream chat response', (done) => {
    let chunks = [];

    socket.on('chat:message', (data) => {
      chunks.push(data.content);
    });

    socket.on('chat:end', () => {
      expect(chunks.length).toBeGreaterThan(0);
      done();
    });

    socket.emit('chat:start', {
      userId: 'test-user',
      message: 'Hello',
    });
  });
});
```

## Monitoring

### Connection Count

```typescript
// src/modules/ai/ai.gateway.ts
private connectedClients = 0;

handleConnection(client: Socket) {
  this.connectedClients++;
  this.logger.log(`Client connected. Total: ${this.connectedClients}`);
}

handleDisconnect(client: Socket) {
  this.connectedClients--;
  this.logger.log(`Client disconnected. Total: ${this.connectedClients}`);
}
```

### Event Logging

```typescript
@SubscribeMessage('chat:start')
async handleChatStream(...) {
  this.logger.debug(`Chat started for user ${data.userId}`);
  // ... implementation
}
```

## Best Practices

1. **Always Handle Errors**: Listen to `connect_error` and event-specific errors
2. **Graceful Disconnection**: Cleanup resources on disconnect
3. **Authentication**: Validate JWT tokens for secure connections
4. **Rate Limiting**: Prevent abuse with rate limiting
5. **Heartbeat**: Use ping/pong for connection health checks
6. **Compression**: Enable for large payloads
7. **Namespace Isolation**: Use namespaces to separate concerns
8. **Error Recovery**: Implement reconnection logic
9. **Testing**: Write integration tests for WebSocket events
10. **Monitoring**: Track connection counts and errors

## Troubleshooting

### Connection Fails

- Check CORS configuration
- Verify backend is running
- Check network/firewall settings
- Ensure correct WebSocket URL

### Streaming Stops Unexpectedly

- Check OpenAI API key
- Verify rate limits not exceeded
- Check server logs for errors
- Monitor token usage

### High Latency

- Use CDN for frontend
- Enable compression
- Choose faster AI models
- Reduce max_tokens

## Next Steps

- Add WebSocket authentication middleware
- Implement room-based chat (multiple users)
- Add typing indicators
- Build admin dashboard for monitoring
- Add message editing/deletion via WebSocket

