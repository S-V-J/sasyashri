#!/bin/bash
# Sasyashri Production Deployment Script
# Run on the VPS after CI/CD pushes images

set -e

echo "🚀 Deploying Sasyashri to Production..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Running as root. Consider using a dedicated deploy user.${NC}"
fi

# Load environment
if [ ! -f .env.prod ]; then
    echo -e "${RED}❌ .env.prod not found!${NC}"
    exit 1
fi

export $(cat .env.prod | grep -v '^#' | xargs)

# Pull latest images
echo -e "\n${BLUE}Pulling latest Docker images...${NC}"
docker compose -f infra/docker/docker-compose.prod.yml pull

# Stop old containers gracefully
echo -e "\n${BLUE}Stopping old containers...${NC}"
docker compose -f infra/docker/docker-compose.prod.yml down --remove-orphans

# Start new containers
echo -e "\n${BLUE}Starting new containers...${NC}"
docker compose -f infra/docker/docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "\n${BLUE}Waiting for services to be healthy...${NC}"
sleep 30

# Run database migrations
echo -e "\n${BLUE}Running database migrations...${NC}"
docker compose -f infra/docker/docker-compose.prod.yml exec -T api pnpm db:migrate:deploy

# Health checks
echo -e "\n${BLUE}Running health checks...${NC}"
HEALTH_URL="https://${WEB_AUTHN_RP_ID}/health"
API_HEALTH_URL="https://${WEB_AUTHN_RP_ID}/api/health"

for i in {1..10}; do
    if curl -sf "$HEALTH_URL" > /dev/null && curl -sf "$API_HEALTH_URL" > /dev/null; then
        echo -e "${GREEN}✅ Health checks passed!${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Health checks failed after 10 attempts${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⏳ Waiting for services... (attempt $i/10)${NC}"
    sleep 5
done

# Clean up old images
echo -e "\n${BLUE}Cleaning up old Docker images...${NC}"
docker image prune -f

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "🌐 Application: https://${WEB_AUTHN_RP_ID}"
echo -e "📊 Grafana: https://${WEB_AUTHN_RP_ID}/grafana"
echo -e "📈 Prometheus: https://${WEB_AUTHN_RP_ID}/prometheus"