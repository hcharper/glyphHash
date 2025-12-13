# glyphHash - Project Structure

## Complete File Tree

```
glyphHash/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD pipeline
│
├── apps/
│   ├── api/                          # NestJS Backend API
│   │   ├── prisma/
│   │   │   └── schema.prisma        # PostgreSQL schema definition
│   │   ├── src/
│   │   │   ├── auth/                # Authentication (Clerk integration)
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── clerk.strategy.ts
│   │   │   │   ├── clerk-auth.guard.ts
│   │   │   │   └── current-user.decorator.ts
│   │   │   ├── compliance-logs/     # Core compliance logging
│   │   │   │   ├── compliance-logs.module.ts
│   │   │   │   ├── compliance-logs.service.ts
│   │   │   │   └── compliance-logs.controller.ts
│   │   │   ├── hedera/              # Hedera HCS & HTS integration
│   │   │   │   ├── hedera.module.ts
│   │   │   │   ├── hedera.service.ts
│   │   │   │   └── mirror-node.service.ts
│   │   │   ├── payments/            # USDC payment processing
│   │   │   │   ├── payments.module.ts
│   │   │   │   └── payments.service.ts
│   │   │   ├── prisma/              # Database client
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── redis/               # Caching & pub/sub
│   │   │   │   ├── redis.module.ts
│   │   │   │   └── redis.service.ts
│   │   │   ├── storage/             # S3/LocalStack integration
│   │   │   │   ├── storage.module.ts
│   │   │   │   └── storage.service.ts
│   │   │   ├── tenants/             # Multi-tenant management
│   │   │   │   ├── tenants.module.ts
│   │   │   │   ├── tenants.service.ts
│   │   │   │   └── tenants.controller.ts
│   │   │   ├── app.module.ts        # Root module
│   │   │   ├── main.ts              # API server entry
│   │   │   └── worker.ts            # Mirror Node worker entry
│   │   ├── Dockerfile               # API production image
│   │   ├── Dockerfile.worker        # Worker production image
│   │   ├── jest.config.json
│   │   ├── nest-cli.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── public/                   # Static assets
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── dashboard/
│       │   │   │   ├── dashboard-client.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── onboarding/
│       │   │   │   ├── layout.tsx
│       │   │   │   └── page.tsx
│       │   │   ├── sign-in/
│       │   │   │   └── [[...sign-in]]/
│       │   │   │       └── page.tsx
│       │   │   ├── sign-up/
│       │   │   │   └── [[...sign-up]]/
│       │   │   │       └── page.tsx
│       │   │   ├── globals.css      # Tailwind styles
│       │   │   ├── layout.tsx       # Root layout with Clerk
│       │   │   └── page.tsx         # Home page
│       │   ├── components/
│       │   │   └── ui/              # shadcn/ui components
│       │   │       ├── button.tsx
│       │   │       └── card.tsx
│       │   ├── lib/
│       │   │   ├── api.ts           # API client (axios)
│       │   │   ├── crypto.ts        # WebCrypto utilities
│       │   │   └── utils.ts         # Shared utilities
│       │   └── middleware.ts        # Clerk auth middleware
│       ├── .env.local.example
│       ├── Dockerfile               # Web production image
│       ├── next.config.js
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       └── tsconfig.json
│
├── contracts/
│   ├── CompliancePaymentTrigger.sol # Solidity smart contract for HTS
│   └── README.md                     # Contract documentation
│
├── packages/
│   ├── config/                       # Shared configuration
│   │   ├── src/
│   │   │   └── index.ts             # Env validation, constants
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── types/                        # Shared TypeScript types
│       ├── src/
│       │   └── index.ts             # Domain types, enums, interfaces
│       ├── package.json
│       └── tsconfig.json
│
├── .env.example                      # Environment template
├── .gitignore
├── .prettierrc
├── docker-compose.yml                # Local development stack
├── DEVELOPMENT.md                    # Development guide
├── ecosystem.config.js               # PM2 configuration
├── LICENSE
├── package.json                      # Root monorepo config
├── README.md                         # Main documentation
├── STRUCTURE.md                      # This file
├── tsconfig.json                     # Root TypeScript config
└── turbo.json                        # Turborepo configuration
```

## Key Technologies by Layer

### Frontend (apps/web)
- **Framework**: Next.js 15 (App Router, React Server Components)
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: Clerk
- **Data Fetching**: Axios
- **Charts**: Recharts
- **Tables**: TanStack Table
- **Encryption**: WebCrypto API

### Backend (apps/api)
- **Framework**: NestJS 10
- **Database ORM**: Prisma
- **Auth**: Clerk + Passport JWT
- **Validation**: Zod, class-validator
- **Cache**: Redis (ioredis)
- **Storage**: AWS SDK (S3)
- **Blockchain**: @hashgraph/sdk
- **Docs**: Swagger/OpenAPI

### Infrastructure
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Object Storage**: LocalStack (dev), AWS S3 (prod)
- **Blockchain**: Hedera (Testnet/Mainnet)
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

### Shared (packages/*)
- **Types**: TypeScript interfaces, enums
- **Config**: Zod schemas, constants
- **Utils**: Shared business logic

## Data Flow

### Creating a Compliance Log

```
User (Browser)
  │
  ├─> 1. Encrypt evidence file (WebCrypto AES-256-GCM)
  │
  ├─> 2. POST /compliance-logs
  │         │
  │         └─> NestJS API
  │               │
  │               ├─> Create log in PostgreSQL (status: PENDING)
  │               │
  │               └─> Return log ID
  │
  ├─> 3. GET /compliance-logs/:id/evidence-upload-url
  │         │
  │         └─> Generate pre-signed S3 URL
  │
  ├─> 4. PUT {S3 URL} (upload encrypted file)
  │
  ├─> 5. PATCH /compliance-logs/:id/evidence
  │         │
  │         └─> Update log with evidence hash & encryption metadata
  │
  └─> 6. POST /compliance-logs/:id/submit
            │
            └─> Submit to Hedera HCS
                  │
                  ├─> Create HCS message with log metadata
                  │
                  ├─> Update log (status: PROCESSING)
                  │
                  └─> Return consensus timestamp
```

### Background Worker Processing

```
Mirror Node Worker
  │
  ├─> Poll all tenant HCS topics (every 10s)
  │     │
  │     └─> GET /api/v1/topics/:topicId/messages?sequencenumber=gt:{last}
  │
  ├─> For each new message:
  │     │
  │     ├─> Decode base64 message
  │     │
  │     ├─> Parse JSON payload
  │     │
  │     ├─> Find matching compliance log
  │     │
  │     ├─> Update log status to CONFIRMED
  │     │
  │     ├─> Trigger USDC payment
  │     │     │
  │     │     ├─> Create payment record
  │     │     │
  │     │     └─> Transfer USDC via HTS (production only)
  │     │
  │     └─> Publish real-time event via Redis
  │             │
  │             └─> Frontend receives SSE update
```

## Environment Architecture

### Development
```
localhost:3000  → Next.js Dev Server
localhost:4000  → NestJS API
localhost:5432  → PostgreSQL (Docker)
localhost:6379  → Redis (Docker)
localhost:4566  → LocalStack S3 (Docker)
testnet.hedera  → Hedera Testnet
```

### Production
```
app.glyphhash.com     → Next.js (Vercel/Docker)
api.glyphhash.com     → NestJS (Docker/K8s)
RDS PostgreSQL        → AWS RDS
ElastiCache Redis     → AWS ElastiCache
S3                    → AWS S3 (encrypted)
mainnet.hedera.com    → Hedera Mainnet
```

## Database Schema

```sql
┌─────────────┐       ┌──────────────────┐       ┌────────────┐
│   Tenants   │◄──────│ ComplianceLogs   │──────►│  Payments  │
├─────────────┤       ├──────────────────┤       ├────────────┤
│ id          │       │ id               │       │ id         │
│ name        │       │ tenantId (FK)    │       │ tenantId   │
│ slug        │       │ userId (FK)      │       │ logId (FK) │
│ clerkOrgId  │       │ title            │       │ amount     │
│ hcsTopicId  │       │ description      │       │ tokenId    │
│ sphereId    │       │ category         │       │ txId       │
│ status      │       │ severity         │       │ status     │
└─────────────┘       │ evidenceUrl      │       └────────────┘
       │              │ evidenceHash     │
       │              │ encryptionMeta   │
       │              │ hcsMessageId     │
       │              │ hcsSeqNumber     │
       │              │ hcsConsensus     │
       │              │ status           │
       │              └──────────────────┘
       │                      ▲
       │                      │
       └──────────────────────┘
              Users
```

## Module Dependencies

```
AppModule
  ├── PrismaModule (Global)
  ├── RedisModule (Global)
  ├── AuthModule
  │     └── ClerkStrategy
  ├── TenantsModule
  │     ├── HederaModule
  │     └── HttpModule
  ├── ComplianceLogsModule
  │     ├── HederaModule
  │     ├── StorageModule
  │     ├── PaymentsModule
  │     └── RedisModule
  ├── HederaModule
  │     ├── HederaService
  │     └── MirrorNodeService
  ├── StorageModule
  │     └── StorageService (S3)
  └── PaymentsModule
        ├── HederaModule
        └── RedisModule
```

---

This structure follows industry best practices for:
- **Separation of Concerns**: Clear boundaries between layers
- **Scalability**: Monorepo with independent deployable apps
- **Maintainability**: Shared types and configurations
- **Security**: Multi-layered authentication and encryption
- **Performance**: Caching, optimistic updates, worker offloading
