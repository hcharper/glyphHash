# Development Guide

## Getting Started

### Initial Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/yourorg/glyphHash.git
   cd glyphHash
   npm install
   ```

2. **Configure Hedera Testnet**
   - Create account at https://portal.hedera.com
   - Get testnet HBAR from faucet
   - Add credentials to `.env`

3. **Configure Clerk**
   - Create app at https://clerk.com
   - Enable organizations
   - Add API keys to `.env` and `apps/web/.env.local`

4. **Start development**
   ```bash
   npm run setup
   ```

## Project Architecture

### Backend (NestJS)

- **Module Structure**: Each feature has its own module (tenants, compliance-logs, etc.)
- **Dependency Injection**: Services injected via constructor
- **Guards**: `ClerkAuthGuard` protects authenticated routes
- **Decorators**: `@CurrentUser()` extracts user from JWT

### Frontend (Next.js 15)

- **App Router**: Server Components by default
- **Client Components**: Use `'use client'` directive
- **API Calls**: Centralized in `lib/api.ts`
- **Encryption**: WebCrypto in `lib/crypto.ts`

### Database (Prisma + PostgreSQL)

- **Schema**: Single source of truth in `apps/api/prisma/schema.prisma`
- **Migrations**: Track schema changes
- **Multi-tenancy**: `tenantId` column on all relevant models

## Common Tasks

### Testing the Upload UI

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open browser**:
   ```
   http://localhost:3001
   ```

3. **Upload a test file**:
   - Title: "Test Compliance Document"
   - Description: "Testing file upload functionality"
   - Category: Security Monitoring
   - Severity: Medium
   - Drag & drop any PDF, image, or text file

4. **Monitor the process**:
   - Watch browser console for hash calculation
   - See progress bar: Hashing → Uploading → Submitting
   - View success message with blockchain confirmation
   - Click HashScan link to verify on Hedera testnet

5. **Check the results**:
   - Database: `docker exec -it glyphhash-postgres psql -U postgres -d glyphhash -c "SELECT id, title, status, hcs_message_id FROM compliance_logs ORDER BY created_at DESC LIMIT 5;"`
   - API logs: Check terminal running `npm run start:dev`
   - S3 (LocalStack): File uploaded to bucket
   - Hedera: Visit https://hashscan.io/testnet

### Adding a New Compliance Category

1. Update `packages/types/src/index.ts`:
   ```typescript
   export enum ComplianceCategory {
     // ... existing
     NEW_CATEGORY = 'NEW_CATEGORY',
   }
   ```

2. Update Prisma schema and migrate:
   ```bash
   cd apps/api
   npx prisma migrate dev --name add_new_category
   ```

3. Update frontend dropdown in `apps/web/src/components/upload-evidence.tsx`:
   ```tsx
   <option value="NEW_CATEGORY">New Category</option>
   ```

### Adding a New API Endpoint

1. Add to service:
   ```typescript
   // apps/api/src/feature/feature.service.ts
   async newMethod(data: any) {
     return this.prisma.model.create({ data });
   }
   ```

2. Add to controller:
   ```typescript
   // apps/api/src/feature/feature.controller.ts
   @Post('new-endpoint')
   async newEndpoint(@Body() body: any) {
     return this.service.newMethod(body);
   }
   ```

3. Add to frontend API client:
   ```typescript
   // apps/web/src/lib/api.ts
   export const api = {
     newEndpoint: (data: any) => apiClient.post('/new-endpoint', data),
   };
   ```

### Testing Hedera Integration

```typescript
// Test HCS topic creation
const topicId = await hederaService.createTopic('Test Topic');

// Test message submission
const result = await hederaService.submitMessage(
  topicId,
  JSON.stringify({ test: 'message' })
);

// Verify on Mirror Node
const messages = await mirrorNodeService.getTopicMessages(topicId);
```

## Debugging

### API Debugging

```bash
# Start in debug mode
npm run start:debug --workspace=apps/api

# Attach debugger in VS Code
# Use "Attach to NestJS" launch configuration
```

### Worker Debugging

```bash
# Run worker with logs
NODE_ENV=development npm run start:worker --workspace=apps/api
```

### Database Debugging

```bash
# Open Prisma Studio
npm run db:studio

# View raw SQL queries
# Add to .env: DATABASE_URL="...?ssl=false&connection_limit=5&pool_timeout=0"
```

## Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with recommended rules
- **Formatting**: Prettier (2 spaces, single quotes)
- **Naming**: 
  - PascalCase for classes/interfaces
  - camelCase for functions/variables
  - SCREAMING_SNAKE_CASE for constants

## Performance Tips

### API Optimization

- Use `select` in Prisma queries to fetch only needed fields
- Add database indexes for frequently queried columns
- Use Redis caching for expensive queries
- Implement pagination for list endpoints

### Frontend Optimization

- Use React Server Components for static content
- Lazy load heavy components
- Optimize images with Next.js Image component
- Implement infinite scroll for long lists

## Security Best Practices

- Never commit `.env` files
- Use environment variables for all secrets
- Validate all user inputs with Zod
- Implement rate limiting on sensitive endpoints
- Use prepared statements (Prisma does this automatically)
- Enable CORS only for trusted origins
- Keep dependencies updated

## Deployment

### Production Checklist

1. Update all environment variables for production
2. Change database URL to production instance
3. Use Hedera mainnet (not testnet)
4. Enable SSL for all connections
5. Set `NODE_ENV=production`
6. Configure proper logging (Winston, DataDog, etc.)
7. Set up monitoring and alerts
8. Configure backup strategy
9. Test disaster recovery

### Docker Deployment

```bash
# Build production images
docker build -f apps/api/Dockerfile -t glyphhash-api:latest .
docker build -f apps/web/Dockerfile -t glyphhash-web:latest .

# Push to registry
docker push yourregistry/glyphhash-api:latest
docker push yourregistry/glyphhash-web:latest

# Deploy with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Common Issues

**Issue**: Prisma can't connect to database
```bash
# Solution: Check DATABASE_URL and ensure PostgreSQL is running
docker ps | grep postgres
npm run docker:up
```

**Issue**: Hedera transactions fail
```bash
# Solution: Verify account has sufficient HBAR balance
# Check operator credentials in .env
# Ensure network is set correctly (testnet/mainnet)
```

**Issue**: Worker not processing messages
```bash
# Solution: Check Redis connection
docker logs glyphhash-redis
# Verify HCS topic IDs are correct
# Check Mirror Node URL is accessible
```

**Issue**: Frontend can't reach API
```bash
# Solution: Verify NEXT_PUBLIC_API_URL is set correctly
# Check CORS configuration in API
# Ensure API is running on correct port
```

## Resources

- [NestJS Docs](https://docs.nestjs.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Hedera Docs](https://docs.hedera.com/)
- [Clerk Docs](https://clerk.com/docs)
