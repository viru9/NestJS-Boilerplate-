import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { FileResponseDto } from './dto/file-upload.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Storage')
@Controller('storage')
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        category: {
          type: 'string',
          enum: ['avatar', 'document', 'general'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Query('category') category?: string,
  ): Promise<FileResponseDto> {
    return this.storageService.uploadFile(file, userId, category);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'List user files' })
  @ApiResponse({
    status: 200,
    description: 'Files retrieved successfully',
    type: [FileResponseDto],
  })
  async listUserFiles(
    @Param('userId') userId: string,
    @Query('category') category?: string,
  ): Promise<FileResponseDto[]> {
    return this.storageService.listUserFiles(userId, category);
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Download file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const file = await this.storageService.downloadFile(fileId, userId);

    res.set({
      'Content-Type': file.mimetype,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    });

    res.send(file.buffer);
  }

  @Delete(':fileId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete file' })
  @ApiResponse({ status: 204, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.storageService.deleteFile(fileId, userId);
  }
}
