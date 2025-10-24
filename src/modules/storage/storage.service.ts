import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { generateUniqueFilename } from '../../utils/helpers';

@Injectable()
export class StorageService {
  private uploadDir: string;
  private allowedTypes: string[];
  private maxFileSize: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>(
      'storage.uploadDir',
      './uploads',
    );
    this.allowedTypes = this.configService.get<string[]>(
      'storage.allowedFileTypes',
      ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    );
    this.maxFileSize = this.configService.get<number>(
      'storage.maxFileSize',
      10485760,
    );
  }

  /**
   * Upload file for user
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    category: string = 'general',
  ) {
    // Validate file type
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Allowed types: ${this.allowedTypes.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size ${file.size} exceeds maximum allowed size of ${this.maxFileSize}`,
      );
    }

    // Generate unique filename
    const filename = generateUniqueFilename(file.originalname);

    // Determine category folder
    const categoryFolder = category === 'avatar' ? 'avatars' : 'documents';
    const userFolder = path.join(this.uploadDir, categoryFolder, userId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    // Save file to disk
    const filePath = path.join(userFolder, filename);
    fs.writeFileSync(filePath, file.buffer);

    // Save file metadata to database
    const fileRecord = await this.prisma.file.create({
      data: {
        userId,
        filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath,
        url: `/api/v1/storage/${userId}/${filename}`,
        category,
      },
    });

    return fileRecord;
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string, userId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if user owns the file or is admin
    if (file.userId !== userId) {
      throw new BadRequestException(
        'You do not have permission to access this file',
      );
    }

    return file;
  }

  /**
   * Download file
   */
  async downloadFile(fileId: string, userId: string) {
    const file = await this.getFile(fileId, userId);

    if (!fs.existsSync(file.path)) {
      throw new NotFoundException('File not found on disk');
    }

    return {
      buffer: fs.readFileSync(file.path),
      filename: file.originalName,
      mimetype: file.mimetype,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, userId: string) {
    const file = await this.getFile(fileId, userId);

    // Delete from disk
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete from database
    await this.prisma.file.delete({
      where: { id: fileId },
    });
  }

  /**
   * List user files
   */
  async listUserFiles(userId: string, category?: string) {
    const where: { userId: string; category?: string } = { userId };

    if (category) {
      where.category = category;
    }

    return this.prisma.file.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
