# ==========================================
# GIAI ĐOẠN 1: BUILD FRONTEND DIST
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Truyền biến môi trường API URL khi build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ==========================================
# GIAI ĐOẠN 2: PHỤC VỤ BẰNG NGINX ALPINE SIÊU NHẸ
# ==========================================
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Xóa các file mặc định của nginx
RUN rm -rf ./*

# Copy bản build từ stage 1
COPY --from=builder /app/dist .

# Copy file cấu hình Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
