# API Endpoint Creation Guide

This guide explains how to create new API endpoints following best practices in this NestJS backend.

## Step-by-Step Process

### 1. Define the Feature/Module

Before creating endpoints, ensure you have a clear module structure:

```
src/modules/your-feature/
├── your-feature.module.ts
├── your-feature.controller.ts
├── your-feature.service.ts
├── dto/
│   ├── create-your-feature.dto.ts
│   ├── update-your-feature.dto.ts
│   └── your-feature-response.dto.ts
└── tests/
    └── your-feature.service.spec.ts
```

### 2. Create DTOs (Data Transfer Objects)

DTOs validate incoming data and document API requests/responses.

**Request DTO Example:**
```typescript
// dto/create-post.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'My Blog Post' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'This is the content...', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}
```

**Response DTO Example:**
```typescript
// dto/post-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PostResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  content?: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

### 3. Create Service

Business logic goes in the service layer.

```typescript
// your-feature.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostResponseDto } from './dto/post-response.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreatePostDto): Promise<PostResponseDto> {
    const post = await this.prisma.post.create({
      data: {
        ...dto,
        userId,
      },
    });

    return post;
  }

  async findAll(): Promise<PostResponseDto[]> {
    return this.prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<PostResponseDto> {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async update(id: string, dto: UpdatePostDto): Promise<PostResponseDto> {
    const post = await this.prisma.post.update({
      where: { id },
      data: dto,
    });

    return post;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.post.delete({
      where: { id },
    });
  }
}
```

### 4. Create Controller

Controllers define HTTP endpoints and route requests to services.

```typescript
// your-feature.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Posts')
@Controller('posts')
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.create(userId, createPostDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    type: [PostResponseDto],
  })
  async findAll(): Promise<PostResponseDto[]> {
    return this.postsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    type: PostResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Post not found' })
  async findOne(@Param('id') id: string): Promise<PostResponseDto> {
    return this.postsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a post' })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    type: PostResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.postsService.remove(id);
  }
}
```

### 5. Create Module

Wire everything together in a module.

```typescript
// your-feature.module.ts
import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
```

### 6. Register Module in AppModule

```typescript
// app.module.ts
import { PostsModule } from './modules/posts/posts.module';

@Module({
  imports: [
    // ... other modules
    PostsModule,
  ],
})
export class AppModule {}
```

## Best Practices

### HTTP Status Codes
- `200 OK` - Successful GET, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

### API Decorators

**@ApiTags** - Groups endpoints in Swagger
**@ApiOperation** - Describes what the endpoint does
**@ApiResponse** - Documents possible responses
**@ApiBearerAuth** - Requires JWT authentication

### Validation

Always validate input using class-validator:

```typescript
import {
  IsString,
  IsEmail,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
```

### Error Handling

Use built-in NestJS exceptions:

```typescript
import {
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

if (!resource) {
  throw new NotFoundException('Resource not found');
}
```

### Authentication & Authorization

```typescript
// Public endpoint
@Public()
@Get('public')
async getPublic() {
  return 'This is public';
}

// Protected endpoint (JWT required)
@Get('protected')
async getProtected(@CurrentUser() user) {
  return user;
}

// Role-based access
@Roles(Role.ADMIN)
@Get('admin')
async getAdmin() {
  return 'Admin only';
}
```

### Rate Limiting

Apply custom rate limits to specific endpoints:

```typescript
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
@Post('send-email')
async sendEmail() {
  // ...
}
```

## Testing

Create tests for your endpoints:

```typescript
// your-feature.service.spec.ts
describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: PrismaService,
          useValue: {
            post: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(PostsService);
    prisma = module.get(PrismaService);
  });

  it('should create a post', async () => {
    const dto = { title: 'Test Post', content: 'Content' };
    const userId = 'user-id';
    
    jest.spyOn(prisma.post, 'create').mockResolvedValue({
      id: 'post-id',
      ...dto,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(userId, dto);
    expect(result.title).toBe(dto.title);
  });
});
```

## Checklist

Before committing new endpoints:

- [ ] DTOs created with validation decorators
- [ ] Swagger decorators added (@ApiProperty, @ApiOperation, etc.)
- [ ] Service implements business logic
- [ ] Controller handles HTTP layer only
- [ ] Error handling implemented
- [ ] Authentication/authorization configured
- [ ] Rate limiting considered
- [ ] Tests written
- [ ] Module registered in AppModule
- [ ] Documentation updated

## Common Patterns

### Pagination

```typescript
class PaginationQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

async findAll(query: PaginationQueryDto) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.post.findMany({ skip, take: limit }),
    this.prisma.post.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### File Upload

```typescript
@Post('upload')
@ApiFile('file')
async uploadFile(
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser('id') userId: string,
) {
  return this.storageService.uploadFile(file, userId);
}
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Swagger/OpenAPI Spec](https://swagger.io/specification/)
- [class-validator](https://github.com/typestack/class-validator)
- [Prisma Documentation](https://www.prisma.io/docs/)

