# AI Integration Guide

This document covers the AI module, including OpenAI integration, conversation management, streaming responses, and background processing.

## Overview

The AI module provides:
- **OpenAI Chat Completions** (streaming and non-streaming)
- **Conversation Management** (save chat history)
- **Token Usage Tracking** (monitor API consumption)
- **Embeddings Generation** (vector embeddings)
- **Real-time Streaming** (via WebSocket)
- **Background Processing** (Bull queue for long tasks)

## Architecture

```
┌─────────────────┐
│   REST Client   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Controller  │  (HTTP endpoints)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenAI Service │  (API wrapper)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Conversation    │  (Database)
│    Service      │
└─────────────────┘

┌─────────────────┐
│   WS Client     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AI Gateway    │  (WebSocket)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenAI Stream  │
└─────────────────┘
```

## Configuration

Add these environment variables to `.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_ORG_ID=org-your-org-id  # Optional
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7
```

## REST API Endpoints

### 1. Send Chat Message (Non-Streaming)

**POST** `/api/v1/ai/chat`

Request:
```json
{
  "message": "Explain NestJS to me",
  "conversationId": "uuid",  // Optional, creates new if not provided
  "model": "gpt-4",           // Optional, defaults to env config
  "maxTokens": 4096,          // Optional
  "temperature": 0.7          // Optional
}
```

Response:
```json
{
  "conversationId": "uuid",
  "messageId": "uuid",
  "content": "NestJS is a progressive Node.js framework...",
  "model": "gpt-4",
  "tokens": 256,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

**Example using Axios:**

```typescript
const response = await axios.post('/api/v1/ai/chat', {
  message: 'Explain NestJS',
  conversationId: existingConversationId, // or omit for new conversation
}, {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});

console.log(response.data.content);
```

### 2. Generate Embeddings

**POST** `/api/v1/ai/embeddings`

Request:
```json
{
  "text": "Text to generate embeddings for",
  "model": "text-embedding-3-small"  // Optional
}
```

Response:
```json
{
  "embedding": [0.123, -0.456, ...],  // Array of floats
  "model": "text-embedding-3-small",
  "tokens": 10
}
```

### 3. Create Conversation

**POST** `/api/v1/ai/conversations`

Request:
```json
{
  "title": "My AI Chat"  // Optional
}
```

Response:
```json
{
  "id": "uuid",
  "title": "My AI Chat",
  "userId": "uuid",
  "messageCount": 0,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 4. List Conversations

**GET** `/api/v1/ai/conversations?page=1&limit=20`

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Chat about NestJS",
      "userId": "uuid",
      "messageCount": 5,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

### 5. Get Conversation with Messages

**GET** `/api/v1/ai/conversations/:id`

Response:
```json
{
  "id": "uuid",
  "title": "Chat about NestJS",
  "userId": "uuid",
  "messages": [
    {
      "id": "uuid",
      "role": "USER",
      "content": "What is NestJS?",
      "tokens": null,
      "model": null,
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "role": "ASSISTANT",
      "content": "NestJS is a progressive Node.js framework...",
      "tokens": 256,
      "model": "gpt-4",
      "createdAt": "2024-01-15T10:30:05Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:05Z"
}
```

### 6. Delete Conversation

**DELETE** `/api/v1/ai/conversations/:id`

Response: `204 No Content`

### 7. Get Usage Statistics

**GET** `/api/v1/ai/usage`

Response:
```json
{
  "totalTokens": 12500,
  "conversationsCount": 15,
  "messagesCount": 87,
  "lastUsed": "2024-01-15T11:00:00Z"
}
```

## WebSocket Streaming

### Connection

Connect to the WebSocket namespace:

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8000/ai', {
  auth: {
    token: accessToken  // JWT token
  }
});
```

### Events

#### Client → Server

**`chat:start`** - Start streaming chat

```typescript
socket.emit('chat:start', {
  userId: 'your-user-id',
  message: 'Explain NestJS',
  conversationId: 'uuid',  // Optional
  model: 'gpt-4',           // Optional
  maxTokens: 4096,          // Optional
  temperature: 0.7          // Optional
});
```

**`chat:stop`** - Stop streaming

```typescript
socket.emit('chat:stop');
```

#### Server → Client

**`chat:conversation`** - New conversation created
```typescript
socket.on('chat:conversation', (data) => {
  console.log('Conversation ID:', data.conversationId);
});
```

**`chat:user-message`** - User message saved
```typescript
socket.on('chat:user-message', (data) => {
  console.log('Message ID:', data.messageId);
  console.log('Content:', data.content);
});
```

**`chat:message`** - Streaming response chunk
```typescript
socket.on('chat:message', (data) => {
  console.log('Chunk:', data.content);
  // Append to UI
  appendToChat(data.content);
});
```

**`chat:end`** - Stream complete
```typescript
socket.on('chat:end', (data) => {
  console.log('Total tokens:', data.totalTokens);
  console.log('Model:', data.model);
  console.log('Message ID:', data.messageId);
});
```

**`chat:error`** - Error occurred
```typescript
socket.on('chat:error', (error) => {
  console.error('Error:', error.message);
});
```

**`chat:stopped`** - Stream stopped by user
```typescript
socket.on('chat:stopped', (data) => {
  console.log('Stream stopped');
});
```

### Complete React Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function AiChat({ userId, accessToken }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:8000/ai', {
      auth: { token: accessToken }
    });

    newSocket.on('connect', () => {
      console.log('Connected to AI WebSocket');
    });

    newSocket.on('chat:conversation', (data) => {
      setConversationId(data.conversationId);
    });

    newSocket.on('chat:message', (data) => {
      setResponse(prev => prev + data.content);
    });

    newSocket.on('chat:end', (data) => {
      setIsStreaming(false);
      console.log('Stream complete:', data);
    });

    newSocket.on('chat:error', (error) => {
      console.error('Error:', error.message);
      setIsStreaming(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken]);

  const sendMessage = () => {
    if (!socket || !message.trim()) return;

    setIsStreaming(true);
    setResponse('');

    socket.emit('chat:start', {
      userId,
      message,
      conversationId,
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7
    });

    setMessage('');
  };

  const stopStream = () => {
    if (socket) {
      socket.emit('chat:stop');
      setIsStreaming(false);
    }
  };

  return (
    <div>
      <div className="messages">
        <div className="user-message">{message}</div>
        <div className="ai-response">{response}</div>
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={isStreaming}
      />

      <button onClick={sendMessage} disabled={isStreaming}>
        Send
      </button>

      {isStreaming && (
        <button onClick={stopStream}>Stop</button>
      )}
    </div>
  );
}
```

## Background Processing (Bull Queue)

### Adding Jobs to Queue

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class AiService {
  constructor(
    @InjectQueue('ai-tasks') private aiQueue: Queue,
  ) {}

  async queueCompletion(
    userId: string,
    conversationId: string,
    message: string,
  ) {
    const job = await this.aiQueue.add('generate-completion', {
      userId,
      conversationId,
      message,
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7,
    });

    return {
      jobId: job.id,
      status: 'queued',
    };
  }

  async queueEmbeddings(userId: string, text: string) {
    const job = await this.aiQueue.add('generate-embeddings', {
      userId,
      text,
      model: 'text-embedding-3-small',
    });

    return {
      jobId: job.id,
      status: 'queued',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.aiQueue.getJob(jobId);
    
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      progress: job.progress(),
      state: await job.getState(),
      result: job.returnvalue,
    };
  }
}
```

## Rate Limiting

AI endpoints have specific rate limits:

- **Chat endpoints**: 20 requests per minute per user
- **Embeddings**: 20 requests per minute per user

Rate limiting is enforced using `@nestjs/throttler`.

## Token Usage & Billing

All API calls to OpenAI are tracked:

1. **Token Counting**: Tokens used are saved per message
2. **User Aggregation**: `user.totalTokensUsed` tracks lifetime usage
3. **Conversation Stats**: Token usage per conversation available

### Monitor Usage

```typescript
// Get user's total usage
const stats = await conversationService.getUserUsageStats(userId);
console.log(`Total tokens used: ${stats.totalTokens}`);
```

### Implement Billing/Limits

```typescript
// Example: Block users who exceed limits
if (user.totalTokensUsed > 1000000) {
  throw new ForbiddenException('Token limit exceeded');
}
```

## Error Handling

### Common Errors

1. **OpenAI API Key Missing**
   - Error: `OpenAI client not initialized`
   - Fix: Set `OPENAI_API_KEY` in `.env`

2. **Rate Limit Exceeded**
   - HTTP: `429 Too Many Requests`
   - Fix: Implement backoff or upgrade OpenAI plan

3. **Invalid Model**
   - Error: `The model 'gpt-5' does not exist`
   - Fix: Use valid models (gpt-4, gpt-3.5-turbo)

4. **Token Limit Exceeded**
   - Error: `This model's maximum context length is 8192 tokens`
   - Fix: Reduce `maxTokens` or limit conversation history

## Best Practices

### 1. Conversation History Management

Limit history to prevent token overuse:

```typescript
// Get last 10 messages only
const history = await conversationService.getConversationHistory(
  conversationId,
  userId,
  10  // Limit to 10 messages
);
```

### 2. Model Selection

Choose appropriate models:
- **gpt-4**: Best quality, slower, more expensive
- **gpt-3.5-turbo**: Fast, cheaper, good quality
- **gpt-4-turbo**: Balanced performance

### 3. Temperature Control

- **0.0-0.3**: Focused, deterministic
- **0.7**: Balanced (default)
- **1.0-2.0**: Creative, varied

### 4. Error Handling

Always handle streaming errors:

```typescript
socket.on('chat:error', (error) => {
  // Show error to user
  showNotification('AI Error: ' + error.message);
  
  // Reset state
  setIsStreaming(false);
  setResponse('');
});
```

### 5. User Experience

- Show loading states during streaming
- Provide stop button for long responses
- Cache responses in conversation history
- Show token usage (transparency)

## Testing

### Unit Tests

```typescript
describe('OpenAIService', () => {
  it('should generate completion', async () => {
    const result = await openaiService.generateCompletion([
      { role: 'user', content: 'Hello' }
    ]);

    expect(result.content).toBeDefined();
    expect(result.tokens).toBeGreaterThan(0);
  });
});
```

### WebSocket Tests

```typescript
import { io } from 'socket.io-client';

describe('AI Gateway', () => {
  let socket;

  beforeAll((done) => {
    socket = io('http://localhost:8000/ai');
    socket.on('connect', done);
  });

  it('should stream chat response', (done) => {
    let response = '';

    socket.on('chat:message', (data) => {
      response += data.content;
    });

    socket.on('chat:end', () => {
      expect(response.length).toBeGreaterThan(0);
      done();
    });

    socket.emit('chat:start', {
      userId: 'test-user',
      message: 'Hi',
    });
  });
});
```

## Monitoring

### Log AI Requests

All AI operations are logged:

```
[OpenAIService] Generating completion with model: gpt-4
[OpenAIService] Generating streaming completion with model: gpt-4
[OpenAIService] Generating embeddings with model: text-embedding-3-small
```

### Track Performance

Monitor these metrics:
- Average response time
- Token usage per user
- Error rates
- WebSocket connection count

## Security

### API Key Protection

- **Never expose** OpenAI API key to frontend
- Store in environment variables
- Rotate keys periodically

### User Authentication

- All endpoints require JWT authentication
- WebSocket connections must authenticate
- Rate limiting prevents abuse

### Content Filtering

Consider implementing:
- Input validation (max length)
- Content moderation (OpenAI Moderation API)
- Offensive content filtering

## Next Steps

1. **Implement Content Moderation**: Use OpenAI's moderation endpoint
2. **Add More Models**: Support Anthropic (Claude), Google (Gemini)
3. **Vector Database**: Integrate pgvector for embeddings
4. **RAG System**: Build retrieval-augmented generation
5. **Prompt Templates**: Create reusable prompt templates
6. **Usage Analytics**: Build dashboard for token usage

## Troubleshooting

### WebSocket Not Connecting

Check CORS configuration in `ai.gateway.ts`:
```typescript
cors: {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}
```

### Slow Responses

- Use streaming instead of waiting for full response
- Choose faster models (gpt-3.5-turbo)
- Reduce max_tokens

### High Token Usage

- Limit conversation history (fewer messages)
- Use shorter prompts
- Implement token budget per user

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review Sentry error tracking
3. Consult OpenAI documentation
4. Check Bull queue dashboard

