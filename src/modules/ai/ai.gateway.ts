import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OpenAIService } from './services/openai.service';
import { ConversationService } from './services/conversation.service';
import { MessageRole } from '@prisma/client';

// Simple WebSocket guard (you might want to implement JWT validation)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/ai',
})
export class AiGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AiGateway.name);

  constructor(
    private openaiService: OpenAIService,
    private conversationService: ConversationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('chat:start')
  async handleChatStream(
    @MessageBody()
    data: {
      userId: string;
      message: string;
      conversationId?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      this.logger.debug(`Starting chat stream for user ${data.userId}`);

      // Get or create conversation
      let conversationId = data.conversationId;
      if (!conversationId) {
        const conversation = await this.conversationService.createConversation(
          data.userId,
        );
        conversationId = conversation.id;

        // Send conversation ID to client
        client.emit('chat:conversation', { conversationId });
      }

      // Get conversation history
      const history = await this.conversationService.getConversationHistory(
        conversationId,
        data.userId,
        10,
      );

      // Add user message
      const userMessage = await this.conversationService.addMessage(
        conversationId,
        MessageRole.USER,
        data.message,
      );

      // Emit user message confirmation
      client.emit('chat:user-message', {
        messageId: userMessage.id,
        content: data.message,
      });

      // Append current message to history
      history.push({
        role: 'user',
        content: data.message,
      });

      // Generate streaming response
      let fullResponse = '';
      let model = '';
      let tokenCount = 0;

      const stream = this.openaiService.generateStreamingCompletion(history, {
        model: data.model,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          fullResponse += chunk.content;
          model = chunk.model;

          // Send chunk to client
          client.emit('chat:message', {
            content: chunk.content,
            isComplete: false,
          });
        }

        if (chunk.finishReason) {
          // Estimate token count (rough estimate: 1 token ≈ 4 characters)
          tokenCount = Math.ceil(
            (data.message.length + fullResponse.length) / 4,
          );

          // Save AI response
          const aiMessage = await this.conversationService.addMessage(
            conversationId,
            MessageRole.ASSISTANT,
            fullResponse,
            {
              model: model || data.model || 'gpt-4',
              tokens: tokenCount,
            },
          );

          // Update user token usage
          await this.conversationService.updateTokenUsage(
            data.userId,
            tokenCount,
          );

          // Send completion
          client.emit('chat:end', {
            messageId: aiMessage.id,
            conversationId,
            totalTokens: tokenCount,
            model: model || data.model,
            finishReason: chunk.finishReason,
          });
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An error occurred during chat';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Error in chat stream: ${errorMessage}`, errorStack);
      client.emit('chat:error', {
        message: errorMessage,
      });
    }
  }

  @SubscribeMessage('chat:stop')
  handleStopChat(@ConnectedSocket() client: Socket) {
    this.logger.debug(`Chat stopped for client ${client.id}`);
    client.emit('chat:stopped', { message: 'Chat stream stopped' });
  }
}
