#!/bin/bash
# Sasyashri Development Environment Setup Script
# Run this after cloning the repository

set -e

echo "🚀 Setting up Sasyashri Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    else
        echo -e "${GREEN}✓${NC} $1 found"
    fi
}

echo -e "\n${BLUE}Checking prerequisites...${NC}"
check_command node
check_command pnpm
check_command docker
check_command docker compose
check_command git

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# Enable pnpm
echo -e "\n${BLUE}Configuring pnpm...${NC}"
corepack enable
corepack prepare pnpm@latest --activate

# Create .env.local if not exists
if [ ! -f .env.local ]; then
    echo -e "\n${BLUE}Creating .env.local from template...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}⚠️  Please edit .env.local with your actual values!${NC}"
else
    echo -e "${GREEN}✓${NC} .env.local already exists"
fi

# Generate secure secrets if not set
if grep -q "your_64_character_jwt_secret_here" .env.local; then
    echo -e "\n${BLUE}Generating secure secrets...${NC}"
    JWT_SECRET=$(openssl rand -base64 48)
    JWT_REFRESH_SECRET=$(openssl rand -base64 48)
    LIVEKIT_SECRET=$(openssl rand -base64 32)
    MINIO_PASSWORD=$(openssl rand -base64 24)
    GRAFANA_PASSWORD=$(openssl rand -base64 16)

    # Update .env.local (macOS/Linux compatible sed)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your_64_character_jwt_secret_here_minimum_64_chars/$JWT_SECRET/" .env.local
        sed -i '' "s/your_64_character_refresh_secret_here_minimum_64_chars/$JWT_REFRESH_SECRET/" .env.local
        sed -i '' "s/your_livekit_api_secret_min_32_chars/$LIVEKIT_SECRET/" .env.local
        sed -i '' "s/minioadmin123/$MINIO_PASSWORD/" .env.local
        sed -i '' "s/admin123/$GRAFANA_PASSWORD/" .env.local
    else
        sed -i "s/your_64_character_jwt_secret_here_minimum_64_chars/$JWT_SECRET/" .env.local
        sed -i "s/your_64_character_refresh_secret_here_minimum_64_chars/$JWT_REFRESH_SECRET/" .env.local
        sed -i "s/your_livekit_api_secret_min_32_chars/$LIVEKIT_SECRET/" .env.local
        sed -i "s/minioadmin123/$MINIO_PASSWORD/" .env.local
        sed -i "s/admin123/$GRAFANA_PASSWORD/" .env.local
    fi
    echo -e "${GREEN}✓${NC} Secure secrets generated"
fi

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${NC}"
pnpm install

# Generate Prisma client
echo -e "\n${BLUE}Generating Prisma client...${NC}"
pnpm db:generate

# Start infrastructure
echo -e "\n${BLUE}Starting infrastructure services...${NC}"
pnpm docker:dev

# Wait for services to be healthy
echo -e "\n${BLUE}Waiting for services to be ready...${NC}"
sleep 10

# Run migrations
echo -e "\n${BLUE}Running database migrations...${NC}"
pnpm db:migrate:dev

# Seed database
echo -e "\n${BLUE}Seeding database...${NC}"
pnpm db:seed || echo -e "${YELLOW}⚠️  Seed script not yet implemented${NC}"

# Build applications
echo -e "\n${BLUE}Building applications...${NC}"
pnpm build

echo -e "\n${GREEN}✅ Development environment setup complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Edit ${YELLOW}.env.local${NC} with your API keys (NVIDIA, Razorpay, GSP, etc.)"
echo -e "  2. Start development servers: ${YELLOW}pnpm dev${NC}"
echo -e "  3. Access the app at ${YELLOW}https://localhost:3000${NC}"
echo -e "  4. API at ${YELLOW}https://localhost:4000${NC}"
echo -e "  5. Prisma Studio: ${YELLOW}pnpm db:studio${NC}"
echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  ${YELLOW}pnpm docker:dev:down${NC} - Stop infrastructure"
echo -e "  ${YELLOW}pnpm test${NC} - Run all tests"
echo -e "  ${YELLOW}pnpm lint${NC} - Lint code"
echo -e "  ${YELLOW}pnpm typecheck${NC} - Type check"