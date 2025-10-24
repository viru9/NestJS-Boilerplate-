import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { MessageRole } from '@prisma/client';

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string) {
    return this.prisma.conversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
      },
    });
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * List user conversations
   */
  async listConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);

    return {
      data: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        userId: conv.userId,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    metadata?: { model?: string; tokens?: number },
  ) {
    return this.prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        model: metadata?.model,
        tokens: metadata?.tokens,
      },
    });
  }

  /**
   * Get conversation messages
   */
  async getMessages(conversationId: string, userId: string) {
    // Verify user owns the conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get conversation history for OpenAI format
   */
  async getConversationHistory(
    conversationId: string,
    userId: string,
    limit: number = 10,
  ) {
    const messages = await this.getMessages(conversationId, userId);

    // Return last N messages in OpenAI format
    return messages.slice(-limit).map((msg) => ({
      role: msg.role.toLowerCase(),
      content: msg.content,
    }));
  }

  /**
   * Update user token usage
   */
  async updateTokenUsage(userId: string, tokens: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalTokensUsed: {
          increment: tokens,
        },
      },
    });
  }

  /**
   * Get user usage statistics
   */
  async getUserUsageStats(userId: string) {
    const [user, conversationsCount, messagesCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalTokensUsed: true, updatedAt: true },
      }),
      this.prisma.conversation.count({ where: { userId } }),
      this.prisma.message.count({
        where: {
          conversation: {
            userId,
          },
        },
      }),
    ]);

    return {
      totalTokens: user?.totalTokensUsed || 0,
      conversationsCount,
      messagesCount,
      lastUsed: user?.updatedAt || new Date(),
    };
  }
}
