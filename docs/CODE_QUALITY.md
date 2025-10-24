# Code Quality Guide

This document covers code quality tools, standards, and best practices for the backend project.

## Overview

The project uses several tools to maintain code quality:
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **Husky** - Git hooks automation
- **lint-staged** - Run linters on staged files only
- **TypeScript** - Static type checking

## ESLint

### Configuration

ESLint is configured in `eslint.config.mjs` with:
- TypeScript support
- NestJS-specific rules
- Prettier integration
- Import/export conventions

### Run ESLint

```bash
# Lint all files
npm run lint

# Lint and auto-fix
npm run lint --fix

# Lint specific files
npx eslint src/modules/auth/**/*.ts
```

### Common Rules

```typescript
// ✅ Good
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}
}

// ❌ Bad
export class AuthService {
  constructor(private prisma: PrismaService) {} // Missing 'readonly'
}
```

```typescript
// ✅ Good
const result = await this.userService.findOne(id);

// ❌ Bad
const result = this.userService.findOne(id); // Missing await
```

## Prettier

### Configuration

Prettier is configured in `.prettierrc` with:
- Semi-colons: `true`
- Single quotes: `true`
- Tab width: `2`
- Trailing comma: `all`
- Print width: `80`

### Run Prettier

```bash
# Format all files
npm run format

# Check formatting without fixing
npx prettier --check \"src/**/*.ts\"

# Format specific files
npx prettier --write src/modules/auth/auth.service.ts
```

### Example Formatting

```typescript
// Prettier will format this:
const user = {email:"test@example.com",name:"John",role:"USER"}

// To this:
const user = {
  email: 'test@example.com',
  name: 'John',
  role: 'USER',
};
```

## Husky Git Hooks

### Overview

Husky runs automated checks before commits and pushes to ensure code quality.

### Pre-commit Hook

**Location:** `.husky/pre-commit`

Automatically runs on `git commit`:
1. Runs ESLint on staged TypeScript files
2. Runs Prettier on staged files
3. Fails commit if errors found

**What it checks:**
```bash
# Staged *.ts files
- ESLint with auto-fix
- Prettier with auto-fix

# Staged *.json, *.md files
- Prettier with auto-fix
```

### Commit Message Hook

**Location:** `.husky/commit-msg`

Enforces conventional commit format:

```
type(scope): subject
```

**Valid types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `build` - Build system changes
- `ci` - CI/CD changes

**Examples:**

```bash
# ✅ Valid
git commit -m "feat(auth): add JWT authentication"
git commit -m "fix(api): resolve CORS issue"
git commit -m "docs(readme): update installation steps"

# ❌ Invalid
git commit -m "added authentication"
git commit -m "fix bug"
git commit -m "WIP"
```

### Bypass Hooks (Emergency Only)

```bash
# Skip pre-commit (not recommended)
git commit --no-verify -m "feat: emergency fix"

# Skip commit-msg validation
HUSKY=0 git commit -m "any message"
```

**⚠️ Warning:** Only use this in emergencies!

## lint-staged

### Configuration

Configured in `package.json`:

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### How It Works

1. You stage files with `git add`
2. You run `git commit`
3. lint-staged intercepts and:
   - Identifies staged files
   - Runs appropriate linters/formatters
   - Auto-fixes issues
   - Re-stages fixed files
   - Continues with commit

### Example Workflow

```bash
# Make changes
vim src/modules/auth/auth.service.ts

# Stage files
git add src/modules/auth/auth.service.ts

# Commit (hooks run automatically)
git commit -m "feat(auth): add password reset"
```

**Output:**
```
✔ Preparing lint-staged...
✔ Running tasks for staged files...
  ✔ package.json — 0 files
  ✔ eslint --fix — 1 file
  ✔ prettier --write — 1 file
✔ Applying modifications from tasks...
✔ Cleaning up temporary files...
```

## TypeScript

### Strict Mode

TypeScript is configured with strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### Type Checking

```bash
# Check types
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Common Type Issues

```typescript
// ❌ Bad - Implicit any
function processUser(user) {
  return user.name;
}

// ✅ Good - Explicit type
function processUser(user: User) {
  return user.name;
}
```

```typescript
// ❌ Bad - Possible null
const user = await this.userService.findOne(id);
return user.email; // user might be null

// ✅ Good - Null check
const user = await this.userService.findOne(id);
if (!user) {
  throw new NotFoundException('User not found');
}
return user.email;
```

### Configuration Service Type Safety

Always provide type parameters when using `ConfigService.get()` to avoid `any` types:

```typescript
// ❌ Bad - Returns any (unsafe assignment)
const port = configService.get('app.port');
const corsOrigin = configService.get('app.corsOrigin');

// ✅ Good - Returns typed values
const port = configService.get<number>('app.port');
const corsOrigin = configService.get<string>('app.corsOrigin');

// ✅ Even better - With fallback for undefined
const port = configService.get<number>('app.port') ?? 3000;
const corsOrigin = configService.get<string>('app.corsOrigin') ?? 'http://localhost:5173';
const isEnabled = configService.get<boolean>('feature.enabled') ?? false;
```

**Type mapping for common config values:**
```typescript
// String values
configService.get<string>('app.apiPrefix')
configService.get<string>('jwt.secret')

// Number values
configService.get<number>('app.port')
configService.get<number>('jwt.expiresIn')

// Boolean values
configService.get<boolean>('sentry.enabled')
configService.get<boolean>('app.corsCredentials')
```

## Code Style Guidelines

### Naming Conventions

```typescript
// Classes - PascalCase
class UserService {}
class AuthController {}

// Interfaces - PascalCase with 'I' prefix (optional)
interface IUser {}
interface IAuthService {}

// Functions/Methods - camelCase
function findUser() {}
async function createUser() {}

// Variables - camelCase
const userId = '123';
let isActive = true;

// Constants - UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = 'https://api.example.com';

// Private properties - prefix with _
class UserService {
  private _cache: Map<string, User>;
}

// Files - kebab-case
// user-service.ts
// auth.controller.ts
// jwt.strategy.ts
```

### File Organization

```typescript
// 1. Imports
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// 2. Constants
const DEFAULT_PAGE_SIZE = 20;

// 3. Interfaces/Types
interface UserQuery {
  page: number;
  limit: number;
}

// 4. Class
@Injectable()
export class UserService {
  // Properties
  constructor(private prisma: PrismaService) {}

  // Public methods
  async findAll(query: UserQuery) {
    // ...
  }

  // Private methods
  private validateQuery(query: UserQuery) {
    // ...
  }
}
```

### Comments

```typescript
// ✅ Good - JSDoc for public methods
/**
 * Find a user by ID
 * @param id User ID
 * @returns User object or null
 * @throws NotFoundException if user not found
 */
async findOne(id: string): Promise<User> {
  // ...
}

// ✅ Good - Explain complex logic
// Calculate exponential backoff: 2^attempt * 1000ms
const delay = Math.pow(2, attempt) * 1000;

// ❌ Bad - Obvious comments
// Get user
const user = await this.userService.findOne(id);

// ❌ Bad - Commented out code
// const oldLogic = () => {
//   // ...
// };
```

### Error Handling

```typescript
// ✅ Good - Specific error types
try {
  await this.userService.create(data);
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('Email already exists');
    }
  }
  throw new InternalServerErrorException('Failed to create user');
}

// ❌ Bad - Generic error handling
try {
  await this.userService.create(data);
} catch (error) {
  throw new Error('Something went wrong');
}
```

### Async/Await

```typescript
// ✅ Good - Use async/await
async function getUser(id: string) {
  const user = await this.userService.findOne(id);
  const posts = await this.postService.findByUser(user.id);
  return { user, posts };
}

// ❌ Bad - Promise chains
function getUser(id: string) {
  return this.userService.findOne(id)
    .then(user => this.postService.findByUser(user.id))
    .then(posts => ({ user, posts }));
}
```

## Editor Setup

### VS Code

**Recommended Extensions:**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "prisma.prisma",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

**Settings:**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### WebStorm/IntelliJ

1. Go to **Settings** > **Languages & Frameworks** > **JavaScript** > **Prettier**
2. Enable "On code reformat" and "On save"
3. Go to **Settings** > **Languages & Frameworks** > **JavaScript** > **Code Quality Tools** > **ESLint**
4. Enable "Automatic ESLint configuration"

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run format -- --check
      - run: npx tsc --noEmit
```

## Troubleshooting

### ESLint Errors

**Issue:** `Parsing error: Cannot find module 'typescript'`

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue:** ESLint ignoring certain files

```bash
# Check .eslintignore
cat .eslintignore

# Or add to eslint.config.mjs
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
```

### Prettier Conflicts

**Issue:** Prettier and ESLint conflicting

```bash
# Solution: Use eslint-config-prettier
npm install -D eslint-config-prettier

# In eslint.config.mjs
import prettier from 'eslint-config-prettier';

export default [
  // ... other configs
  prettier,
];
```

### Husky Not Running

**Issue:** Hooks not executing

```bash
# Reinstall Husky
npm uninstall husky
npm install -D husky
npm run prepare

# Make hooks executable (Unix/Mac)
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

**Issue:** `.git` not found

```bash
# Initialize git if not done
git init
npm run prepare
```

### lint-staged Slow

**Issue:** Takes too long on large commits

```bash
# Optimize lint-staged config
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix --max-warnings 0",  // Fail on warnings
      "prettier --write"
    ]
  }
}
```

## Best Practices

### 1. Commit Often

```bash
# Small, focused commits
git add src/modules/auth/auth.service.ts
git commit -m "feat(auth): add login method"

git add src/modules/auth/auth.controller.ts
git commit -m "feat(auth): add login endpoint"
```

### 2. Fix Issues Before Committing

```bash
# Run checks manually before committing
npm run lint
npm run format
npx tsc --noEmit
```

### 3. Use Conventional Commits

```bash
# Clear, descriptive commits
git commit -m "feat(api): add rate limiting to auth endpoints"
git commit -m "fix(db): resolve connection pool exhaustion"
git commit -m "docs(api): update authentication guide"
```

### 4. Review Staged Changes

```bash
# Check what will be committed
git diff --staged

# Review specific file
git diff --staged src/modules/auth/auth.service.ts
```

### 5. Keep Dependencies Updated

```bash
# Check for updates
npm outdated

# Update ESLint, Prettier, TypeScript
npm update eslint prettier typescript

# Update Husky
npm update husky lint-staged
```

## Metrics & Reports

### Generate Reports

```bash
# ESLint report
npx eslint src/ -f html -o eslint-report.html

# TypeScript errors
npx tsc --noEmit > typescript-errors.txt
```

### Code Coverage

```bash
# Run tests with coverage
npm run test:cov

# View coverage report
open coverage/lcov-report/index.html
```

## Summary

✅ **Automated Code Quality:**
- ESLint catches code issues
- Prettier enforces consistent formatting
- Husky runs checks automatically
- lint-staged optimizes performance
- TypeScript prevents type errors

✅ **Developer Experience:**
- Automatic fixing on commit
- Fast feedback loop
- Consistent code style
- Better code reviews
- Fewer bugs in production

✅ **Team Collaboration:**
- Enforced conventions
- Clear commit history
- Reduced merge conflicts
- Improved code readability
- Easier onboarding

## Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Prettier Documentation](https://prettier.io/docs/en/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [lint-staged Documentation](https://github.com/okonet/lint-staged)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

