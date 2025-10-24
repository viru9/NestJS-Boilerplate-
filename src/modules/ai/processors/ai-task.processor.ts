import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { OpenAIService } from '../services/openai.service';
import { ConversationService } from '../services/conversation.service';
import { MessageRole } from '@prisma/client';

@Processor('ai-tasks')
export class AiTaskProcessor {
  private readonly logger = new Logger(AiTaskProcessor.name);

  constructor(
    private openaiService: OpenAIService,
    private conversationService: ConversationService,
  ) {}

  @Process('generate-completion')
  async handleCompletion(
    job: Job<{
      userId: string;
      conversationId: string;
      message: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }>,
  ) {
    this.logger.debug(`Processing AI completion job ${job.id}`);

    try {
      const { userId, conversationId, message, model, maxTokens, temperature } =
        job.data;

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
        message,
      );

      // Append current message
      history.push({ role: 'user', content: message });

      // Update job progress
      await job.progress(50);

      // Generate response
      const response = await this.openaiService.generateCompletion(history, {
        model,
        maxTokens,
        temperature,
      });

      // Handle null content (shouldn't happen but OpenAI API allows it)
      const content = response.content ?? '';

      if (!content) {
        this.logger.warn(`AI response had empty content for job ${job.id}`);
      }

      // Save AI response
      await this.conversationService.addMessage(
        conversationId,
        MessageRole.ASSISTANT,
        content,
        {
          model: response.model,
          tokens: response.tokens,
        },
      );

      // Update token usage
      await this.conversationService.updateTokenUsage(userId, response.tokens);

      // Update job progress
      await job.progress(100);

      this.logger.debug(`Completed AI job ${job.id}`);

      return {
        conversationId,
        content,
        tokens: response.tokens,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process AI job ${job.id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Process('generate-embeddings')
  async handleEmbeddings(
    job: Job<{
      userId: string;
      text: string;
      model?: string;
    }>,
  ) {
    this.logger.debug(`Processing embeddings job ${job.id}`);

    try {
      const { userId, text, model } = job.data;

      // Generate embeddings
      const result = await this.openaiService.generateEmbeddings(text, model);

      // Update token usage
      await this.conversationService.updateTokenUsage(userId, result.tokens);

      this.logger.debug(`Completed embeddings job ${job.id}`);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to process embeddings job ${job.id}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
