import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AiController } from './ai.controller';
import { AiGateway } from './ai.gateway';
import { OpenAIService } from './services/openai.service';
import { ConversationService } from './services/conversation.service';
import { AiTaskProcessor } from './processors/ai-task.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ai-tasks',
    }),
  ],
  controllers: [AiController],
  providers: [AiGateway, OpenAIService, ConversationService, AiTaskProcessor],
  exports: [OpenAIService, ConversationService],
})
export class AiModule {}
