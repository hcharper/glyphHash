# GlyphHash 🔐

**Blockchain-Verified Compliance Auditing Platform on Hedera**

GlyphHash provides immutable audit trails for SOC 2, ISO 27001, NIST, and HIPAA compliance. 
Built on Hedera's enterprise-grade distributed ledger technology.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Hedera](https://img.shields.io/badge/Hedera-HCS-purple)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-MVP-yellow)

## ⚠️ Status: MVP for Shareholder Demo

This is a **minimum viable product** demonstrating the core GlyphHash workflow:
1. Create Hedera topic with company binding
2. Upload documents with blockchain-anchored hashes
3. Auditor verification against Hedera

**Currently running on Hedera Testnet** - not for production use.

## 🎯 Value Proposition

**The Problem:** SOC 2 audits cost $50,000+, with 65+ hours spent verifying evidence timestamps.

**The Solution:** GlyphHash uses Hedera blockchain to provide instant, mathematical proof of when compliance evidence was created.

**The Result:** Reduce audit costs by eliminating timestamp verification work. ROI: 114-340x return on investment.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Next.js 14 Frontend (React + TypeScript)           │
│   • App Router • Petroglyph UI Theme • Real-time Dashboard     │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Express.js API Gateway                        │
│   • Topic Management • Document Upload • Verification           │
└────┬───────────────────────┬────────────────────────┬───────────┘
     │                       │                        │
┌────▼─────┐          ┌──────▼──────┐         ┌──────▼──────┐
│PostgreSQL│          │   Local     │         │ Hedera HCS  │
│  (Data)  │          │  Storage    │         │ + Mirror    │
└──────────┘          └─────────────┘         └─────────────┘
```

## 📁 Project Structure

```
glyphHash/
├── apps/
│   ├── api/                    # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/        # REST endpoints
│   │   │   ├── services/      # Business logic
│   │   │   ├── middleware/    # Error handling, validation
│   │   │   └── lib/           # Prisma, Hedera, Storage
│   │   └── prisma/            # Database schema
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/           # App Router pages
│           │   ├── demo/      # Shareholder demo flow
│           │   └── dashboard/ # Admin dashboard
│           └── lib/           # API client, utilities
├── packages/
│   ├── types/                  # Shared TypeScript types
│   └── hedera/                 # Hedera SDK wrapper
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md        # Technical architecture
│   └── ROADMAP.md             # Future development
├── docker-compose.yml          # Local development
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: ≥20.0.0
- **Docker** & **Docker Compose** (for PostgreSQL)
- **Hedera Testnet Account**: [Get one here](https://portal.hedera.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourorg/glyphHash.git
cd glyphHash

# Copy environment files
cp .env.example .env

# Edit .env with your Hedera testnet credentials
nano .env

# Install dependencies
npm install

# Start database
docker-compose up -d postgres

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Hedera Testnet Setup

1. Go to [Hedera Portal](https://portal.hedera.com)
2. Create a testnet account
3. Get free testnet HBAR from the faucet
4. Copy your Account ID and Private Key to `.env`

## 🎮 Demo Flow

Visit `http://localhost:3000/demo` to experience:

1. **Create Topic** - Creates a dedicated Hedera HCS topic
2. **Upload Document** - Hashes file and submits to blockchain
3. **Verify** - Cross-references document against Hedera record

All transactions are visible on [HashScan Testnet](https://hashscan.io/testnet).

## 📖 Documentation

- [Architecture Guide](docs/ARCHITECTURE.md) - Technical deep dive
- [Roadmap](docs/ROADMAP.md) - Future features and timeline
- [API Reference](docs/API.md) - Endpoint documentation

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🛠️ Development

```bash
# Start all services in development
npm run dev

# Start only API
npm run dev --workspace=@glyphhash/api

# Start only frontend
npm run dev --workspace=@glyphhash/web

# Database migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## 🔮 Roadmap Highlights

See [ROADMAP.md](docs/ROADMAP.md) for the full plan.

### Phase 1: MVP (Current) ✅
- Topic creation with binding
- Document upload & hashing
- Basic verification
- Shareholder demo

### Phase 2: Production Ready
- Auth0 authentication
- S3 storage integration
- Real-time WebSocket updates
- PDF report generation

### Phase 3: Enterprise
- Multi-tenant architecture
- USDC payment integration
- Advanced analytics
- Compliance frameworks (SOC 2, ISO 27001)

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

**GlyphHash** — Blockchain-verified compliance on Hedera
