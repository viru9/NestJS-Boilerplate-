import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.openai.apiKey');

    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured');
      return;
    }

    this.openai = new OpenAI({
      apiKey,
      organization: this.configService.get<string>('ai.openai.orgId'),
    });
  }

  /**
   * Generate chat completion (non-streaming)
   */
  async generateCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model =
      options?.model ||
      this.configService.get<string>('ai.openai.model') ||
      'gpt-4';
    const maxTokens =
      options?.maxTokens ||
      this.configService.get<number>('ai.openai.maxTokens');
    const temperature =
      options?.temperature ||
      this.configService.get<number>('ai.openai.temperature');

    this.logger.debug(`Generating completion with model: ${model}`);

    const completion = await this.openai.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_tokens: maxTokens,
      temperature,
    });

    return {
      content: completion.choices[0].message.content,
      model: completion.model,
      tokens: completion.usage?.total_tokens || 0,
      finishReason: completion.choices[0].finish_reason,
    };
  }

  /**
   * Generate streaming chat completion
   */
  async *generateStreamingCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const model =
      options?.model ||
      this.configService.get<string>('ai.openai.model') ||
      'gpt-4';
    const maxTokens =
      options?.maxTokens ||
      this.configService.get<number>('ai.openai.maxTokens');
    const temperature =
      options?.temperature ||
      this.configService.get<number>('ai.openai.temperature');

    this.logger.debug(`Generating streaming completion with model: ${model}`);

    const stream = await this.openai.chat.completions.create({
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_tokens: maxTokens,
      temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const finishReason = chunk.choices[0]?.finish_reason;

      yield {
        content,
        model: chunk.model,
        finishReason,
      };
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(
    text: string,
    model: string = 'text-embedding-3-small',
  ) {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    this.logger.debug(`Generating embeddings with model: ${model}`);

    const response = await this.openai.embeddings.create({
      model,
      input: text,
    });

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      tokens: response.usage.total_tokens,
    };
  }

  /**
   * Check if OpenAI is configured
   */
  isConfigured(): boolean {
    return !!this.openai;
  }
}
