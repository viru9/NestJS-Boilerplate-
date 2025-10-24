import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ required: false, example: 'My AI Chat' })
  @IsOptional()
  @IsString()
  title?: string;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  messageCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty({ enum: ['USER', 'ASSISTANT', 'SYSTEM'] })
  role: string;

  @ApiProperty()
  content: string;

  @ApiProperty({ required: false })
  tokens?: number;

  @ApiProperty({ required: false })
  model?: string;

  @ApiProperty()
  createdAt: Date;
}

export class UsageStatsDto {
  @ApiProperty()
  totalTokens: number;

  @ApiProperty()
  conversationsCount: number;

  @ApiProperty()
  messagesCount: number;

  @ApiProperty()
  lastUsed: Date;
}
