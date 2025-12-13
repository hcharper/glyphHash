# 🚀 glyphHash Testnet Launch Roadmap

## Current Status ✅
- [x] Monorepo infrastructure
- [x] NestJS API backend with 8 modules
- [x] Next.js 15 frontend
- [x] PostgreSQL + Redis + LocalStack containers
- [x] Prisma schema and migrations
- [x] Basic UI components
- [x] Hedera SDK integration (mock mode)

## Phase 1: Core Authentication & Hedera Setup (1-2 hours)

### 1.1 Configure Clerk Authentication
**Priority: HIGH**

**Steps:**
1. Create Clerk account at https://dashboard.clerk.com
2. Create new application (choose "Next.js" template)
3. Copy credentials to `apps/web/.env.local`:
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
   CLERK_SECRET_KEY=sk_test_your_key
   ```
4. Re-enable ClerkProvider in `apps/web/src/app/layout.tsx`
5. Update middleware to use Clerk auth
6. Test sign-up/sign-in flows

**Why:** Authentication is required for multi-tenancy and user isolation

---

### 1.2 Configure Hedera Testnet
**Priority: HIGH**

**Steps:**
1. Create testnet account at https://portal.hedera.com/register
2. Get your Account ID (format: `0.0.xxxxx`)
3. Get your Private Key (starts with `302e020100...`)
4. Update `.env`:
   ```bash
   HEDERA_OPERATOR_ID=0.0.12345  # Your actual account ID
   HEDERA_OPERATOR_KEY=302e020100300506032b657004220420...  # Your private key
   ```
5. Fund account with testnet HBAR (100 HBAR free from portal)
6. Restart API server

**Why:** Real HCS topic creation and message submission

**Test:**
```bash
curl http://localhost:4000/api/docs  # Check Swagger
# Try creating a tenant via API - should create real HCS topic
```

---

## Phase 2: End-to-End Testing (2-3 hours)

### 2.1 Test Complete User Flow
**Priority: HIGH**

**Flow to test:**
1. ✅ Sign up new user → Creates account in Clerk
2. ✅ Onboarding → Creates Tenant record + HCS topic on testnet
3. ✅ Dashboard → View tenant stats
4. ✅ Create compliance log → Stores in PostgreSQL
5. ✅ Submit to HCS → Message posted to Hedera topic
6. ✅ Mirror Node worker → Confirms message, updates status to CONFIRMED
7. ✅ View confirmed log → See consensus timestamp

**Expected Results:**
- Tenant has real HCS topic ID (e.g., `0.0.123456`)
- Logs show CONFIRMED status after ~3-10 seconds
- Mirror Node query returns consensus timestamp
- Dashboard shows accurate stats

**Debug endpoints:**
```bash
# Check tenant topic
curl http://localhost:4000/tenants

# Check logs
curl http://localhost:4000/compliance-logs

# Check dashboard stats
curl http://localhost:4000/compliance-logs/dashboard/stats
```

---

### 2.2 Test File Upload & Encryption
**Priority: MEDIUM**

**Steps:**
1. Restart LocalStack: `docker restart glyphhash-localstack`
2. Create S3 bucket:
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 mb s3://glyphhash-evidence
   ```
3. Test file upload flow:
   - Request pre-signed URL
   - Encrypt file client-side
   - Upload to S3
   - Store evidence hash in database
   - Submit compliance log with evidence

**Why:** Evidence files are core to compliance logging

---

### 2.3 Test Worker Service
**Priority: MEDIUM**

**Steps:**
1. Start worker in separate terminal:
   ```bash
   cd apps/api
   npm run start:worker
   ```
2. Submit compliance log
3. Verify worker polls Mirror Node
4. Check log status changes to CONFIRMED
5. Verify consensus timestamp is populated

**Why:** Automatic confirmation of HCS messages

---

## Phase 3: Production Hardening (3-4 hours)

### 3.1 Security Enhancements
**Priority: HIGH**

**Tasks:**
- [ ] Generate secure JWT_SECRET (replace placeholder)
- [ ] Generate secure MASTER_ENCRYPTION_KEY (32 bytes)
- [ ] Add rate limiting configuration
- [ ] Enable CORS for production domain
- [ ] Add input validation on all endpoints
- [ ] Implement proper error handling (don't leak sensitive info)
- [ ] Add request logging (Winston)
- [ ] Set up proper secrets management (not .env)

---

### 3.2 Database & Performance
**Priority: MEDIUM**

**Tasks:**
- [ ] Add database indexes (already in schema, verify)
- [ ] Set up connection pooling
- [ ] Add Redis caching for frequently accessed data
- [ ] Optimize Prisma queries (use `select` to limit fields)
- [ ] Add pagination to all list endpoints
- [ ] Set up database backups

---

### 3.3 Frontend Polish
**Priority: MEDIUM**

**Tasks:**
- [ ] Re-enable authentication on all routes
- [ ] Add loading states (Suspense boundaries)
- [ ] Add error boundaries
- [ ] Implement real-time updates (SSE or polling)
- [ ] Add toast notifications
- [ ] Complete dashboard charts
- [ ] Build compliance log table with filtering
- [ ] Add evidence file viewer
- [ ] Test responsive design

---

## Phase 4: Deployment (2-3 hours)

### 4.1 Backend Deployment Options

**Option A: Vercel (Easiest)**
- Deploy API as Vercel Serverless Functions
- Use Vercel Postgres or Supabase
- Use Upstash Redis
- ⚠️ Worker service needs separate hosting

**Option B: Railway/Render (Recommended)**
- Deploy API + Worker as separate services
- Built-in PostgreSQL + Redis
- Persistent storage
- WebSocket support

**Option C: VPS (DigitalOcean/Linode)**
- Full control
- Use Docker Compose
- Set up reverse proxy (Nginx)
- SSL with Let's Encrypt

---

### 4.2 Frontend Deployment

**Vercel (Recommended):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
cd apps/web
vercel --prod
```

**Configure environment variables in Vercel dashboard:**
- All `NEXT_PUBLIC_*` variables
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` (your production API URL)

---

### 4.3 Production Configuration

**Update `.env` for production:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/glyphhash
REDIS_HOST=prod-redis-host
AWS_ENDPOINT=  # Remove for real AWS S3
S3_BUCKET_NAME=glyphhash-evidence-prod
HEDERA_NETWORK=testnet  # Or mainnet when ready
```

---

## Phase 5: Testing & Monitoring (1-2 hours)

### 5.1 Integration Testing
- [ ] Write API endpoint tests (Jest/Supertest)
- [ ] Write frontend E2E tests (Playwright/Cypress)
- [ ] Test error scenarios (network failures, invalid data)
- [ ] Test Hedera throttling/rate limits

### 5.2 Monitoring Setup
- [ ] Set up error tracking (Sentry)
- [ ] Set up logging (Datadog/LogRocket)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Set up performance monitoring (Vercel Analytics)
- [ ] Create status page

---

## Phase 6: Documentation & Go-Live (1 hour)

### 6.1 Documentation
- [ ] Update README with production setup
- [ ] Create API documentation (Swagger is done ✅)
- [ ] Write user guide
- [ ] Create demo video
- [ ] Document Hedera topic structure

### 6.2 Launch Checklist
- [ ] All tests passing
- [ ] Security audit complete
- [ ] Performance tested (load testing)
- [ ] Backup strategy in place
- [ ] Monitoring active
- [ ] Domain configured
- [ ] SSL certificate valid
- [ ] Terms of Service & Privacy Policy

---

## Quick Start: Minimal Testnet Launch (Today!)

**If you want to ship ASAP, here's the 2-hour path:**

### Step 1: Hedera Setup (15 min)
1. Get Hedera testnet account
2. Add credentials to `.env`
3. Restart API

### Step 2: Clerk Setup (15 min)
1. Create Clerk app
2. Add keys to `apps/web/.env.local`
3. Re-enable auth in code
4. Restart frontend

### Step 3: Test Flow (30 min)
1. Sign up → Onboarding → Create log → Submit to HCS
2. Verify topic on HashScan: https://hashscan.io/testnet/topic/0.0.YOUR_TOPIC_ID
3. Verify worker confirms message

### Step 4: Deploy Frontend (30 min)
```bash
cd apps/web
vercel --prod
```

### Step 5: Deploy API (30 min)
Use Railway:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Done!** You now have a working dapp on testnet! 🎉

---

## Post-Launch Roadmap

### Future Features
- [ ] Hedera Spheres support (private networks)
- [ ] Real USDC payments via HTS
- [ ] Smart contract integration
- [ ] Compliance report PDF generation
- [ ] Advanced analytics
- [ ] API webhooks
- [ ] Mobile app
- [ ] Multi-chain support (Ethereum, Polygon)

### Mainnet Migration
When ready for production:
1. Create Hedera mainnet account
2. Associate USDC token
3. Update `HEDERA_NETWORK=mainnet`
4. Higher rates! ($0.0001/txn vs free testnet)

---

## Estimated Total Time

- **Minimal launch**: 2 hours
- **Full testnet ready**: 8-12 hours
- **Production hardened**: 15-20 hours

---

## Need Help?

**Resources:**
- Hedera Docs: https://docs.hedera.com
- Clerk Docs: https://clerk.com/docs
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs

**Community:**
- Hedera Discord: https://hedera.com/discord
- r/Hedera: https://reddit.com/r/hedera

**Issues?**
Check `DEVELOPMENT.md` for troubleshooting!
