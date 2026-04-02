#!/bin/bash
set -e

echo "======================================"
echo "  FRMS Admin Dashboard - Deploy"
echo "======================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/5] Pulling latest code...${NC}"
git fetch origin
git reset --hard origin/main

echo -e "${BLUE}[2/5] Stopping containers...${NC}"
docker compose -f docker-compose.prod.yml down

echo -e "${BLUE}[3/5] Rebuilding frontend (no cache)...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache frontend

echo -e "${BLUE}[4/5] Rebuilding backend (no cache)...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache backend

echo -e "${BLUE}[5/5] Starting all services...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}✓ Deploy completed!${NC}"
echo ""
echo "Checking service status..."
docker compose -f docker-compose.prod.yml ps

echo ""
echo "Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=30 frontend

echo ""
echo -e "${GREEN}Deploy finished. Frontend available at http://$(hostname -I | awk '{print $1}')${NC}"
