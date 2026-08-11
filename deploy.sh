#!/bin/bash
# =============================================================================
# deploy.sh — Script Deploy Thủ Công cho Roomi VPS
# =============================================================================
# Dùng khi cần deploy không qua GitHub Actions (fallback).
#
# Cách chạy:
#   chmod +x deploy.sh
#   ./deploy.sh
# =============================================================================

set -e  # Dừng script nếu có lỗi

# ── Màu sắc terminal ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  🚀 Roomi — Deploy Script             ${NC}"
echo -e "${BLUE}========================================${NC}"

# ── 1. Kiểm tra thư mục ──────────────────────────────────────────────────────
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Lỗi: Không tìm thấy docker-compose.yml${NC}"
    echo -e "${YELLOW}   Hãy chạy script này từ thư mục gốc của dự án roomi/${NC}"
    exit 1
fi

# ── 2. Kéo code mới nhất từ Git ──────────────────────────────────────────────
echo -e "\n${YELLOW}📥 Bước 1: Kéo code mới từ GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code đã được cập nhật!${NC}"

# ── 3. Build và restart containers ───────────────────────────────────────────
echo -e "\n${YELLOW}🔨 Bước 2: Build Docker images và khởi động services...${NC}"
docker compose up -d --build --remove-orphans
echo -e "${GREEN}✅ Services đã được khởi động!${NC}"

# ── 4. Kiểm tra trạng thái containers ────────────────────────────────────────
echo -e "\n${YELLOW}📊 Bước 3: Kiểm tra trạng thái containers...${NC}"
sleep 5
docker compose ps

# ── 5. Kiểm tra logs nếu có lỗi ──────────────────────────────────────────────
BACKEND_STATUS=$(docker compose ps --status running --services | grep backend || true)
if [ -z "$BACKEND_STATUS" ]; then
    echo -e "\n${RED}⚠️  Backend có thể chưa khởi động! Xem logs:${NC}"
    docker compose logs --tail=30 backend
fi

# ── 6. Dọn dẹp images cũ ─────────────────────────────────────────────────────
echo -e "\n${YELLOW}🧹 Bước 4: Dọn dẹp Docker images cũ...${NC}"
docker image prune -f
echo -e "${GREEN}✅ Hoàn tất dọn dẹp!${NC}"

# ── 7. Thông báo hoàn thành ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✅ Deploy hoàn tất!                  ${NC}"
echo -e "${GREEN}  🌐 https://roomi.website              ${NC}"
echo -e "${GREEN}========================================${NC}"
