# Database Schema Documentation

Complete documentation for the backend database schema using Prisma ORM with PostgreSQL.

## Overview

**Database:** PostgreSQL 15+  
**ORM:** Prisma  
**Naming Convention:** snake_case for tables, camelCase for fields  
**Primary Keys:** UUID (using `@default(uuid())`)  
**Timestamps:** Automatic `createdAt` and `updatedAt`

## Database Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│    User     │ 1─────N │  Conversation    │ 1─────N │   Message    │
│             │         │                  │         │              │
│ - id        │         │ - id             │         │ - id         │
│ - email     │         │ - title          │         │ - role       │
│ - password  │         │ - userId  (FK)   │         │ - content    │
│ - firstName │         │ - metadata       │         │ - tokens     │
│ - lastName  │         │ - createdAt      │         │ - model      │
│ - role      │         │ - updatedAt      │         │ - convId(FK) │
│ - isActive  │         └──────────────────┘         └──────────────┘
│ - createdAt │
│ - updatedAt │         ┌──────────────────┐
└─────────────┘ 1─────N │  RefreshToken    │
       │                │                  │
       │                │ - id             │
       │                │ - token          │
       │                │ - userId  (FK)   │
       │                │ - expiresAt      │
       │                │ - createdAt      │
       │                └──────────────────┘
       │
       │                ┌──────────────────┐
       └──────────────N │      File        │
                        │                  │
                        │ - id             │
                        │ - userId  (FK)   │
                        │ - filename       │
                        │ - originalName   │
                        │ - mimetype       │
                        │ - size           │
                        │ - path           │
                        │ - url            │
                        │ - metadata       │
                        │ - createdAt      │
                        └──────────────────┘
```

## Models

### User

Stores user accounts with authentication and profile information.

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  firstName     String?
  lastName      String?
  avatarUrl     String?
  role          Role      @default(USER)
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)

  conversations   Conversation[]
  files           File[]
  refreshTokens   RefreshToken[]

  totalTokensUsed Int       @default(0)
  lastLoginAt     DateTime?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
  @@index([email])
}
```

**Fields:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Unique identifier | Primary Key |
| `email` | String | User email address | Unique, Indexed |
| `password` | String | Hashed password (bcrypt) | Required |
| `firstName` | String | User's first name | Optional |
| `lastName` | String | User's last name | Optional |
| `avatarUrl` | String | URL to avatar image | Optional |
| `role` | Role (Enum) | User role | Default: USER |
| `isActive` | Boolean | Account active status | Default: true |
| `emailVerified` | Boolean | Email verification status | Default: false |
| `totalTokensUsed` | Int | Total AI tokens consumed | Default: 0 |
| `lastLoginAt` | DateTime | Last login timestamp | Optional |
| `createdAt` | DateTime | Account creation time | Auto-generated |
| `updatedAt` | DateTime | Last update time | Auto-updated |

**Relations:**
- One-to-many with `Conversation`
- One-to-many with `File`
- One-to-many with `RefreshToken`

**Indexes:**
- Unique index on `email`
- Index on `email` for faster queries

---

### RefreshToken

Manages JWT refresh tokens for authentication.

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@map("refresh_tokens")
  @@index([token])
  @@index([userId])
}
```

**Fields:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Unique identifier | Primary Key |
| `token` | String | Hashed refresh token | Unique, Indexed |
| `userId` | String | User who owns the token | Foreign Key |
| `user` | User | Relation to User | Cascade delete |
| `expiresAt` | DateTime | Token expiration time | Required |
| `createdAt` | DateTime | Token creation time | Auto-generated |

**Relations:**
- Many-to-one with `User` (cascade delete)

**Indexes:**
- Unique index on `token`
- Index on `userId`

**Notes:**
- Tokens are hashed before storage for security
- Expired tokens are cleaned up via scheduled job
- Cascade delete removes tokens when user is deleted

---

### Conversation

Stores AI chat conversation metadata.

```prisma
model Conversation {
  id        String    @id @default(uuid())
  title     String?
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages  Message[]
  metadata  Json?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@map("conversations")
  @@index([userId])
}
```

**Fields:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Unique identifier | Primary Key |
| `title` | String | Conversation title | Optional |
| `userId` | String | User who owns conversation | Foreign Key |
| `user` | User | Relation to User | Cascade delete |
| `messages` | Message[] | Messages in conversation | One-to-many |
| `metadata` | Json | Additional metadata | Optional |
| `createdAt` | DateTime | Creation time | Auto-generated |
| `updatedAt` | DateTime | Last update time | Auto-updated |

**Relations:**
- Many-to-one with `User` (cascade delete)
- One-to-many with `Message`

**Indexes:**
- Index on `userId` for user queries

**Metadata Examples:**
```json
{
  "model": "gpt-4",
  "temperature": 0.7,
  "tags": ["work", "coding"],
  "archived": false
}
```

---

### Message

Stores individual messages within conversations.

```prisma
model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           MessageRole
  content        String       @db.Text
  tokens         Int?
  model          String?
  metadata       Json?
  createdAt      DateTime     @default(now())

  @@map("messages")
  @@index([conversationId])
}
```

**Fields:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Unique identifier | Primary Key |
| `conversationId` | String | Parent conversation | Foreign Key |
| `conversation` | Conversation | Relation to Conversation | Cascade delete |
| `role` | MessageRole (Enum) | Message sender role | Required |
| `content` | String (Text) | Message content | Required, Text type |
| `tokens` | Int | Token count for AI messages | Optional |
| `model` | String | AI model used | Optional |
| `metadata` | Json | Additional data | Optional |
| `createdAt` | DateTime | Message timestamp | Auto-generated |

**Relations:**
- Many-to-one with `Conversation` (cascade delete)

**Indexes:**
- Index on `conversationId` for conversation queries

**Message Roles:**
- `USER` - User-sent messages
- `ASSISTANT` - AI-generated responses
- `SYSTEM` - System prompts/instructions

---

### File

Tracks uploaded files and their metadata.

```prisma
model File {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename     String
  originalName String
  mimetype     String
  size         Int
  path         String
  url          String
  metadata     Json?
  createdAt    DateTime @default(now())

  @@map("files")
  @@index([userId])
}
```

**Fields:**

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | String (UUID) | Unique identifier | Primary Key |
| `userId` | String | User who uploaded file | Foreign Key |
| `user` | User | Relation to User | Cascade delete |
| `filename` | String | Stored filename (unique) | Required |
| `originalName` | String | Original filename from user | Required |
| `mimetype` | String | MIME type (image/png, etc.) | Required |
| `size` | Int | File size in bytes | Required |
| `path` | String | File system path | Required |
| `url` | String | Public URL to access file | Required |
| `metadata` | Json | Additional file metadata | Optional |
| `createdAt` | DateTime | Upload timestamp | Auto-generated |

**Relations:**
- Many-to-one with `User` (cascade delete)

**Indexes:**
- Index on `userId` for user file queries

**Metadata Examples:**
```json
{
  "width": 1920,
  "height": 1080,
  "format": "png",
  "folder": "avatars"
}
```

---

## Enums

### Role

User role enumeration for access control.

```prisma
enum Role {
  USER
  ADMIN
  PREMIUM
}
```

**Values:**
- `USER` - Standard user (default)
- `ADMIN` - Administrator with full access
- `PREMIUM` - Premium user with enhanced features

**Usage:**
```typescript
// Check user role
if (user.role === Role.ADMIN) {
  // Allow admin operations
}
```

---

### MessageRole

Message sender role in conversations.

```prisma
enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

**Values:**
- `USER` - Message from user
- `ASSISTANT` - Message from AI assistant
- `SYSTEM` - System-generated message

**Usage:**
```typescript
const message = await prisma.message.create({
  data: {
    conversationId,
    role: MessageRole.ASSISTANT,
    content: aiResponse,
    tokens: tokenCount,
  },
});
```

---

## Database Operations

### Common Queries

#### Create User

```typescript
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    password: hashedPassword,
    firstName: 'John',
    lastName: 'Doe',
    role: Role.USER,
  },
});
```

#### Find User with Relations

```typescript
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: {
    conversations: {
      take: 10,
      orderBy: { updatedAt: 'desc' },
    },
    files: {
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
  },
});
```

#### Create Conversation with Message

```typescript
const conversation = await prisma.conversation.create({
  data: {
    userId,
    title: 'My AI Chat',
    messages: {
      create: [
        {
          role: MessageRole.USER,
          content: 'Hello AI',
        },
      ],
    },
  },
  include: {
    messages: true,
  },
});
```

#### Get Conversation History

```typescript
const conversation = await prisma.conversation.findUnique({
  where: { id: conversationId },
  include: {
    messages: {
      orderBy: { createdAt: 'asc' },
      take: 50, // Last 50 messages
    },
  },
});
```

#### Update Token Usage

```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    totalTokensUsed: {
      increment: tokens,
    },
  },
});
```

#### Clean Up Expired Tokens

```typescript
await prisma.refreshToken.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),
    },
  },
});
```

---

## Indexes & Performance

### Existing Indexes

1. **users.email** - Unique constraint + index for fast login queries
2. **refresh_tokens.token** - Unique constraint + index for token validation
3. **refresh_tokens.userId** - Index for user token lookups
4. **conversations.userId** - Index for user conversation queries
5. **messages.conversationId** - Index for conversation message queries
6. **files.userId** - Index for user file queries

### Performance Tips

1. **Use `select` for specific fields:**
   ```typescript
   const user = await prisma.user.findUnique({
     where: { id },
     select: { id: true, email: true, firstName: true },
   });
   ```

2. **Paginate large result sets:**
   ```typescript
   const messages = await prisma.message.findMany({
     where: { conversationId },
     take: 20,
     skip: page * 20,
     orderBy: { createdAt: 'desc' },
   });
   ```

3. **Use `count` for totals:**
   ```typescript
   const total = await prisma.user.count({
     where: { role: Role.USER },
   });
   ```

4. **Batch operations:**
   ```typescript
   await prisma.message.createMany({
     data: messages.map(msg => ({
       conversationId,
       role: msg.role,
       content: msg.content,
     })),
   });
   ```

---

## Migrations

### Running Migrations

```bash
# Development - create and apply migration
npx prisma migrate dev --name add_user_fields

# Production - apply pending migrations
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Migration Files

Located in `prisma/migrations/`:
```
migrations/
├── 20240101_init/
│   └── migration.sql
├── 20240102_add_token_tracking/
│   └── migration.sql
└── migration_lock.toml
```

### Generate Prisma Client

After schema changes:
```bash
npx prisma generate
```

---

## Seed Data

Seed script creates sample data for development.

**Location:** `prisma/seed.ts`

**Run seed:**
```bash
npx prisma db seed
```

**Sample data created:**
- Admin user: `admin@example.com` / `Admin123!`
- Regular user: `user@example.com` / `User123!`
- Premium user: `premium@example.com` / `Premium123!`

---

## Backup & Restore

### Backup Database

```bash
# Docker
docker-compose exec postgres pg_dump -U postgres backend > backup.sql

# Local PostgreSQL
pg_dump -U postgres -d backend -F c -b -v -f backup.dump
```

### Restore Database

```bash
# Docker
docker-compose exec -T postgres psql -U postgres backend < backup.sql

# Local PostgreSQL
pg_restore -U postgres -d backend -v backup.dump
```

---

## Schema Validation

Prisma validates:
- ✅ Required fields are provided
- ✅ Unique constraints are enforced
- ✅ Foreign key relationships are valid
- ✅ Enum values are correct
- ✅ Data types match schema

**Example validation error:**
```typescript
// Missing required field
await prisma.user.create({
  data: {
    email: 'test@example.com',
    // Error: password is required
  },
});
```

---

## Best Practices

### 1. Use Transactions

For operations that must succeed or fail together:

```typescript
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email, password },
  });

  await tx.conversation.create({
    data: {
      userId: user.id,
      title: 'Welcome',
    },
  });
});
```

### 2. Cascade Deletes

Already configured in schema:
```prisma
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

Deleting a user automatically deletes:
- All refresh tokens
- All conversations
- All messages (via conversation cascade)
- All files

### 3. Soft Deletes

For users, consider soft delete:
```typescript
await prisma.user.update({
  where: { id },
  data: { isActive: false },
});
```

### 4. Metadata JSON

Use metadata fields for flexible data:
```typescript
await prisma.conversation.update({
  where: { id },
  data: {
    metadata: {
      archived: true,
      archivedAt: new Date(),
      reason: 'User request',
    },
  },
});
```

---

## Troubleshooting

### Connection Issues

```bash
# Check connection
npx prisma db pull

# Test connection
npx prisma studio
```

### Schema Sync Issues

```bash
# Reset to match schema
npx prisma db push --force-reset

# Or migrate
npx prisma migrate reset
```

### Query Performance

Enable query logging:
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

---

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)

---

## Schema Summary

**Total Models:** 5 (User, RefreshToken, Conversation, Message, File)  
**Total Enums:** 2 (Role, MessageRole)  
**Total Relations:** 6  
**Total Indexes:** 6  

**Database Features:**
- ✅ UUID primary keys
- ✅ Automatic timestamps
- ✅ Cascade deletes
- ✅ Indexed foreign keys
- ✅ JSON metadata fields
- ✅ Role-based access control
- ✅ Token usage tracking
- ✅ File management

The schema is designed for:
- **Scalability** - Indexed queries, efficient relations
- **Security** - Hashed passwords, cascade deletes
- **Flexibility** - JSON metadata, optional fields
- **Performance** - Strategic indexes, optimized queries

