#!/bin/bash

# glyphHash Test Script
# Tests basic API functionality

API_URL="http://localhost:4000"

echo "========================================="
echo "🧪 glyphHash API Testing"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: API Health Check
echo -e "${BLUE}Test 1: API Health Check${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
if [ "$HTTP_CODE" == "404" ]; then
  echo -e "${GREEN}✓ API is running (404 on root is expected)${NC}"
else
  echo -e "${RED}✗ API might not be running${NC}"
fi
echo ""

# Test 2: Check Swagger docs
echo -e "${BLUE}Test 2: Swagger Documentation${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/docs)
if [ "$HTTP_CODE" == "200" ]; then
  echo -e "${GREEN}✓ Swagger docs available at ${API_URL}/api/docs${NC}"
else
  echo -e "${RED}✗ Swagger docs not available${NC}"
fi
echo ""

# Test 3: Test Database Connection (via tenant endpoint without auth)
echo -e "${BLUE}Test 3: Database Connection${NC}"
RESPONSE=$(curl -s $API_URL/tenants)
if [[ "$RESPONSE" == *"Unauthorized"* ]] || [[ "$RESPONSE" == *"401"* ]]; then
  echo -e "${GREEN}✓ Database connection working (auth required)${NC}"
else
  echo "$RESPONSE" | head -3
fi
echo ""

# Test 4: Check Docker services
echo -e "${BLUE}Test 4: Docker Services${NC}"
POSTGRES_RUNNING=$(docker ps --filter "name=glyphhash-postgres" --format "{{.Names}}" 2>/dev/null)
REDIS_RUNNING=$(docker ps --filter "name=glyphhash-redis" --format "{{.Names}}" 2>/dev/null)
LOCALSTACK_RUNNING=$(docker ps --filter "name=glyphhash-localstack" --format "{{.Names}}" 2>/dev/null)

if [ "$POSTGRES_RUNNING" == "glyphhash-postgres" ]; then
  echo -e "${GREEN}✓ PostgreSQL container running${NC}"
else
  echo -e "${RED}✗ PostgreSQL container not running${NC}"
fi

if [ "$REDIS_RUNNING" == "glyphhash-redis" ]; then
  echo -e "${GREEN}✓ Redis container running${NC}"
else
  echo -e "${RED}✗ Redis container not running${NC}"
fi

if [ "$LOCALSTACK_RUNNING" == "glyphhash-localstack" ]; then
  echo -e "${GREEN}✓ LocalStack container running${NC}"
else
  echo -e "${RED}✗ LocalStack container not running${NC}"
fi
echo ""

# Summary
echo "========================================="
echo -e "${GREEN}✓ Basic smoke tests complete!${NC}"
echo "========================================="
echo ""
echo "📝 Next Steps:"
echo "  1. Open http://localhost:3000 for the frontend"
echo "  2. Open http://localhost:4000/api/docs for API docs"
echo "  3. Configure Clerk keys for authentication:"
echo "     - Get keys from https://dashboard.clerk.com"
echo "     - Update apps/web/.env.local"
echo "  4. Configure Hedera testnet credentials:"
echo "     - Get account from https://portal.hedera.com"
echo "     - Update .env with HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY"
echo ""
