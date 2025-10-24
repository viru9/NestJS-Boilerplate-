import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
} from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({ example: 'Tell me about NestJS' })
  @IsString()
  message: string;

  @ApiProperty({ required: false, example: 'uuid-of-conversation' })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty({ required: false, example: 'gpt-4', default: 'gpt-4' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false, example: 4096, default: 4096 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8000)
  maxTokens?: number;

  @ApiProperty({ required: false, example: 0.7, default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}

export class ChatResponseDto {
  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  messageId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  tokens: number;

  @ApiProperty()
  createdAt: Date;
}

export class EmbeddingRequestDto {
  @ApiProperty({ example: 'Text to embed' })
  @IsString()
  text: string;

  @ApiProperty({ required: false, example: 'text-embedding-3-small' })
  @IsOptional()
  @IsString()
  model?: string;
}

export class EmbeddingResponseDto {
  @ApiProperty({ type: [Number] })
  embedding: number[];

  @ApiProperty()
  model: string;

  @ApiProperty()
  tokens: number;
}
