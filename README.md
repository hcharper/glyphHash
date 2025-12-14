# glyphHash 🔐

**Multi-tenant immutable compliance logging SaaS on Hedera network**

glyphHash is a production-ready Web3 compliance platform that creates tamper-proof audit trails for GRC (Governance, Risk, and Compliance) use cases including SOC 2, ISO 27001, NIST, and HIPAA. Built on Hedera's enterprise-grade distributed ledger technology.

![Architecture](https://img.shields.io/badge/Architecture-Monorepo-blue)
![Hedera](https://img.shields.io/badge/Hedera-HCS%20%2B%20HTS-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![NestJS](https://img.shields.io/badge/NestJS-10-red)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Beta-yellow)

## ⚠️ Disclaimer

**This software is in active development and not yet audited for production use.**

- ✅ **Currently running on Hedera Testnet** - Do not use with sensitive production data
- ⚠️ **Beta Software** - Features and APIs may change
- 🔐 **Security Notice** - Encryption keys are managed by users; no warranty is provided
- 📋 **Not SOC 2 Certified** - This tool assists with compliance but does not guarantee regulatory approval
- ⚖️ **No Liability** - Use at your own risk; consult your legal/compliance team before deployment

**For production use:** Deploy to mainnet, conduct security audit, and review with your compliance team.

## ✨ Features

- **🔒 Immutable Audit Trails**: Compliance logs anchored to Hedera Consensus Service (HCS)
- **🏢 Multi-Tenancy**: Complete tenant isolation with dedicated HCS topics per organization
- **� File Upload UI**: Drag-and-drop evidence upload with real-time progress and hash calculation
- **🔐 Client-Side Encryption**: AES-256-GCM encryption of evidence files before upload
- **#️⃣ SHA-256 Hashing**: Browser-based file hashing before blockchain submission
- **💰 Automated Payments**: HTS USDC micro-payments triggered on log confirmation
- **📊 Real-Time Dashboard**: Live updates via Redis pub/sub and Server-Sent Events
- **🔍 Mirror Node Integration**: Background worker polls for HCS consensus timestamps
- **🎯 GRC Compliance**: Purpose-built for SOC 2, ISO 27001, NIST, HIPAA audit requirements
- **🚀 Production-Ready**: Docker compose, CI/CD, proper error handling, and monitoring

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Next.js Frontend                        │
│  • App Router (RSC)  • Clerk Auth  • TanStack Table  • Recharts│
└────────────────────┬────────────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
┌─────────▼────────┐  ┌─────────▼────────┐
│   NestJS API     │  │  Mirror Worker   │
│  • REST + SSE    │  │  • HCS Polling   │
│  • Prisma ORM    │  │  • Payment Trig  │
└────┬──────┬──────┘  └─────────┬────────┘
     │      │                   │
     │      └───────┬───────────┘
     │              │
┌────▼─────┐ ┌─────▼──────┐ ┌──────────────┐
│PostgreSQL│ │   Redis    │ │ Hedera HCS   │
│(RLS)     │ │(Pub/Sub)   │ │ + HTS (USDC) │
└──────────┘ └────────────┘ └──────────────┘
     │
┌────▼─────────┐
│ S3/LocalStack│
│ (Evidence)   │
└──────────────┘
```

## � Documentation

Comprehensive documentation is available in the [docs/](docs/) folder:

- **[Development Guide](docs/DEVELOPMENT.md)** - Setup, installation, and testing
- **[Roadmap](docs/ROADMAP.md)** - Deployment plan and launch timeline
- **[Market Analysis](docs/MARKET-ANALYSIS.md)** - Business model and market opportunity
- **[Data Architecture](docs/DATA-ARCHITECTURE.md)** - User flows and storage design
- **[Project Structure](docs/STRUCTURE.md)** - Codebase organization
- **[Deliverables](docs/DELIVERABLES.md)** - Complete feature list

## �📁 Project Structure

```
glyphHash/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/          # Clerk authentication
│   │   │   ├── tenants/       # Multi-tenant management
│   │   │   ├── compliance-logs/ # Core compliance logging
│   │   │   ├── hedera/        # HCS + HTS integration
│   │   │   ├── storage/       # S3 evidence storage
│   │   │   ├── payments/      # USDC payment processing
│   │   │   ├── prisma/        # Database client
│   │   │   ├── redis/         # Caching & pub/sub
│   │   │   ├── main.ts        # API server
│   │   │   └── worker.ts      # Mirror Node worker
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Database schema
│   │   ├── Dockerfile
│   │   └── Dockerfile.worker
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/           # App Router pages
│       │   ├── components/    # React components (shadcn/ui)
│       │   └── lib/           # API client, crypto utils
│       └── Dockerfile
├── packages/
│   ├── types/                  # Shared TypeScript types
│   └── config/                 # Shared configuration & validation
├── contracts/
│   └── CompliancePaymentTrigger.sol  # Solidity smart contract
├── docker-compose.yml          # Local development stack
├── .github/
│   └── workflows/
│       └── ci.yml             # CI/CD pipeline
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: ≥20.0.0
- **Docker** & **Docker Compose**
- **Hedera Testnet Account**: [Create here](https://portal.hedera.com)
- **Clerk Account**: [Sign up](https://clerk.com) for auth

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/yourorg/glyphHash.git
cd glyphHash

# Copy environment files
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# Edit .env with your Hedera credentials
nano .env

# Install, build, and start everything
npm run setup
```

This single command will:
1. Install all dependencies
2. Start Docker services (Postgres, Redis, LocalStack)
3. Run Prisma migrations
4. Generate Prisma client
5. Start API, Worker, and Web in dev mode

### Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure
npm run docker:up

# 3. Setup database
cd apps/api
npx prisma migrate dev
npx prisma generate
cd ../..

# 4. Start development servers (in separate terminals)
npm run dev --workspace=apps/api    # API on :4000
npm run dev --workspace=apps/web    # Web on :3000

# Start worker separately
cd apps/api && npm run start:worker
```

## 🔧 Configuration

### Environment Variables

#### Root `.env`
```bash
# Hedera Network
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT_ID
HEDERA_OPERATOR_KEY=302e020100300506032b6570042204...
HEDERA_MIRROR_NODE_URL=https://testnet.mirrornode.hedera.com
HEDERA_USDC_TOKEN_ID=0.0.YOUR_USDC_TOKEN_ID

# Database
DATABASE_URL=postgresql://glyphhash:glyphhash_pass@localhost:5432/glyphhash

# Clerk
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# AWS/LocalStack
AWS_ENDPOINT=http://localhost:4566
S3_BUCKET_NAME=glyphhash-evidence
```

#### Frontend `apps/web/.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Setting up Hedera Testnet

1. Create account at [Hedera Portal](https://portal.hedera.com)
2. Get testnet HBAR from [faucet](https://portal.hedera.com/faucet)
3. Copy Account ID and Private Key to `.env`
4. (Optional) Create USDC token for testing

## 📖 Usage

### 1. Tenant Onboarding

When a user signs up with Clerk and creates an organization:

```typescript
// Automatically creates:
// - Tenant record in PostgreSQL
// - Dedicated HCS topic on Hedera
// - Initial admin user

POST /tenants
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "clerkOrgId": "org_xxx"
}
```

### 2. Upload Evidence via Dashboard

The easiest way to create compliance logs is through the web UI:

1. **Navigate to Dashboard**: `http://localhost:3001`
2. **Fill in log details**:
   - Title (e.g., "Q4 2024 Security Audit")
   - Description
   - Category (Security Monitoring, Access Control, etc.)
   - Severity (Low, Medium, High, Critical)
3. **Drag & drop file** or click to select (PDF, images, text, JSON, Excel - up to 100MB)
4. **Click "Upload & Submit to Blockchain"**
5. **Watch real-time progress**:
   - Calculating SHA-256 hash
   - Uploading to S3 storage
   - Submitting to Hedera blockchain
6. **Success!** View blockchain confirmation with HashScan link

### 3. Creating Compliance Logs via API

```typescript
// Frontend: Hash file before upload
const hash = await hashFile(file);

// Create log
POST /compliance-logs
{
  "title": "Security Patch Applied",
  "description": "Applied CVE-2024-xxx patch to production servers",
  "category": "CHANGE_MANAGEMENT",
  "severity": "HIGH",
  "evidenceHash": "sha256_hash",
  "metadata": { 
    "fileName": "patch-report.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf"
  }
}

// Get presigned S3 upload URL
GET /compliance-logs/:id/evidence-upload-url?fileName=patch-report.pdf&contentType=application/pdf

// Upload file directly to S3
PUT <presigned_url>
Body: <file_binary>

// Update log with evidence URL
PATCH /compliance-logs/:id/evidence
{
  "evidenceUrl": "tenant-id/uuid/patch-report.pdf",
  "evidenceHash": "sha256_hash"
}

// Submit to Hedera HCS
POST /compliance-logs/:id/submit
// Returns: { hcsMessageId: "0.0.123456@1234567890.123456789" }
// Returns: { hcsMessageId, sequenceNumber, consensusTimestamp }
```

### 3. Background Processing

The Mirror Node worker automatically:

1. Polls all tenant HCS topics every 10 seconds
2. Detects new consensus messages
3. Updates log status to `CONFIRMED`
4. Triggers USDC micro-payment (0.01 USD)
5. Publishes real-time update via Redis

### 4. Viewing Audit Trails

Dashboard displays:
- Total logs created
- Confirmed on HCS (immutable)
- Pending confirmation
- Payment history
- Timeline with consensus timestamps
- Download links (with client-side decryption)

## 🔐 Security Features

### Client-Side Encryption
- **Algorithm**: AES-256-GCM
- **Key Management**: Generated per file, stored encrypted
- **Browser API**: Uses WebCrypto API (no server-side decryption)

### Multi-Tenancy
- **Database**: Row-Level Security (RLS) or schema isolation
- **HCS Topics**: Dedicated topic per tenant
- **Storage**: S3 prefix isolation per tenant

### Authentication
- **Clerk**: Enterprise SSO, MFA, organization management
- **API**: JWT bearer tokens
- **Rate Limiting**: 100 req/min per IP

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific workspace
npm test --workspace=apps/api

# E2E tests (TODO)
npm run test:e2e
```

## 🐳 Docker Deployment

### Production Build

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Configuration

Set production environment variables:
- Use mainnet Hedera accounts
- Configure production Clerk instance
- Use AWS S3 (not LocalStack)
- Enable HTTPS and proper CORS
- Set strong JWT secrets

## 📊 Monitoring & Observability

### Logs
```bash
# View all logs
npm run docker:logs

# Specific service
docker logs glyphhash-api -f
docker logs glyphhash-worker -f
```

### Health Checks
```bash
# API health
curl http://localhost:4000/health

# Database
curl http://localhost:4000/health/db
```

### Metrics (TODO)
- Prometheus endpoints
- Grafana dashboards
- HCS message throughput
- Payment success rate

## 🚢 Production Checklist

- [ ] Use Hedera mainnet accounts
- [ ] Configure production Clerk instance
- [ ] Set up AWS S3 bucket with encryption
- [ ] Enable PostgreSQL SSL connections
- [ ] Configure Redis password
- [ ] Set strong MASTER_ENCRYPTION_KEY
- [ ] Enable rate limiting
- [ ] Set up monitoring & alerting
- [ ] Configure backup strategy
- [ ] Review CORS settings
- [ ] Enable HTTPS/TLS
- [ ] Set up CI/CD secrets

## 🛠️ Development

### Adding a New Module

```bash
# Generate NestJS module
cd apps/api
nest g module feature-name
nest g service feature-name
nest g controller feature-name
```

### Database Migrations

```bash
cd apps/api

# Create migration
npx prisma migrate dev --name add_feature

# Apply in production
npx prisma migrate deploy
```

### Adding UI Components

Uses [shadcn/ui](https://ui.shadcn.com/):

```bash
cd apps/web
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
```

## 📝 API Documentation

Interactive API docs available at:
```
http://localhost:4000/api/docs
```

Powered by Swagger/OpenAPI.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - Copyright (c) 2025 glyphHash

See [LICENSE](LICENSE) file for details.

**Summary:** Free to use, modify, and distribute. Provided "as is" without warranty.

## 🙏 Acknowledgments

- **Hedera Hashgraph**: For enterprise-grade DLT
- **Clerk**: For authentication infrastructure
- **NestJS & Next.js**: For robust frameworks
- **shadcn/ui**: For beaut/](docs/) folder in this repository
- **Issues**: [GitHub Issues](https://github.com/hcharper/glyphHash/issues)
- **Email**: hello@glyphhash.com
- **Website**: https://glyphhash.com (coming soon
- **Documentation**: [docs.glyphhash.com](https://docs.glyphhash.com) (TODO)
- **Discord**: [Join our community](https://discord.gg/glyphhash) (TODO)
- **Email**: support@glyphhash.com (TODO)
- **Issues**: [GitHub Issues](https://github.com/yourorg/glyphHash/issues)

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Core HCS integration on testnet
- [x] Multi-tenant infrastructure
- [x] Client-side encryption
- [x] Mirror Node w DID integration (verifiable credentials)
- [x] Basic dashboard

### Phase 2 (Q1 2026)
- [ ] Hedera Spheres (private networks) integration
- [ ] Advanced analytics & reporting
- [ ] Compliance report generation (PDF)
- [ ] Audit log search & filtering
- [ ] Custom retention policies

### Phase 3 (Q2 2026)
- [ ] Enterprise SSO integrations (Okta, Azure AD)
- [ ] API webhooks for log events
- [ ] Mobile app (React Native)
- [ ] Advanced access controls (RBAC)
- [ ] Compliance frameworks library

### Phase 4 (Q3 2026)
- [ ] AI-powered compliance recommendations
- [ ] Automated evidence collection
- [ ] Integration marketplace
- [ ] White-label solution

---

**Built with ❤️ for compliance teams everywhere**
