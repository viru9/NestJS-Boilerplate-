import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OpenAIService } from './services/openai.service';
import { ConversationService } from './services/conversation.service';
import {
  ChatRequestDto,
  ChatResponseDto,
  EmbeddingRequestDto,
  EmbeddingResponseDto,
} from './dto/chat-request.dto';
import {
  CreateConversationDto,
  ConversationResponseDto,
  UsageStatsDto,
} from './dto/conversation.dto';
import { MessageRole } from '@prisma/client';

@ApiTags('AI')
@Controller('ai')
@ApiBearerAuth()
export class AiController {
  constructor(
    private openaiService: OpenAIService,
    private conversationService: ConversationService,
  ) {}

  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Send chat message (non-streaming)' })
  @ApiResponse({
    status: 200,
    description: 'Chat response generated',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async chat(
    @CurrentUser('id') userId: string,
    @Body() chatRequest: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    // Get or create conversation
    let conversationId = chatRequest.conversationId;
    if (!conversationId) {
      const conversation =
        await this.conversationService.createConversation(userId);
      conversationId = conversation.id;
    }

    // Get conversation history
    const history = await this.conversationService.getConversationHistory(
      conversationId,
      userId,
      10,
    );

    // Add user message
    await this.conversationService.addMessage(
      conversationId,
      MessageRole.USER,
      chatRequest.message,
    );

    // Append current message to history
    history.push({
      role: 'user',
      content: chatRequest.message,
    });

    // Generate AI response
    const response = await this.openaiService.generateCompletion(history, {
      model: chatRequest.model,
      maxTokens: chatRequest.maxTokens,
      temperature: chatRequest.temperature,
    });

    // Save AI response
    const aiMessage = await this.conversationService.addMessage(
      conversationId,
      MessageRole.ASSISTANT,
      response.content || '',
      {
        model: response.model,
        tokens: response.tokens,
      },
    );

    // Update user token usage
    await this.conversationService.updateTokenUsage(userId, response.tokens);

    return {
      conversationId,
      messageId: aiMessage.id,
      content: response.content || '',
      model: response.model,
      tokens: response.tokens,
      createdAt: aiMessage.createdAt,
    };
  }

  @Post('embeddings')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate embeddings for text' })
  @ApiResponse({
    status: 200,
    description: 'Embeddings generated',
    type: EmbeddingResponseDto,
  })
  async generateEmbeddings(
    @CurrentUser('id') userId: string,
    @Body() request: EmbeddingRequestDto,
  ): Promise<EmbeddingResponseDto> {
    const result = await this.openaiService.generateEmbeddings(
      request.text,
      request.model,
    );

    // Update user token usage
    await this.conversationService.updateTokenUsage(userId, result.tokens);

    return result;
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created',
    type: ConversationResponseDto,
  })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    const conversation = await this.conversationService.createConversation(
      userId,
      dto.title,
    );

    return {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      messageCount: 0,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Conversations retrieved',
  })
  async listConversations(
    @CurrentUser('id') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.conversationService.listConversations(userId, page, limit);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation with messages' })
  @ApiResponse({
    status: 200,
    description: 'Conversation retrieved',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ) {
    return this.conversationService.getConversation(conversationId, userId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete conversation' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
  ): Promise<void> {
    await this.conversationService.deleteConversation(conversationId, userId);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get user AI usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Usage stats retrieved',
    type: UsageStatsDto,
  })
  async getUsageStats(
    @CurrentUser('id') userId: string,
  ): Promise<UsageStatsDto> {
    return this.conversationService.getUserUsageStats(userId);
  }
}
