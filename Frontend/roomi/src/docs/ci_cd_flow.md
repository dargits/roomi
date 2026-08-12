# 🚀 Roomi CI/CD Pipeline — Toàn Bộ Quy Trình

> Tài liệu này mô tả toàn bộ quy trình CI (Continuous Integration) và CD (Continuous Deployment) của dự án **Roomi** bao gồm cả Frontend (React + Vite) và Backend (Spring Boot).

---

## 📁 Cấu Trúc Liên Quan

| File | Vai Trò |
|------|---------|
| [ci.yml](file:///d:/fn-roomi/roomi/.github/workflows/ci.yml) | CI Pipeline — kiểm tra chất lượng code |
| [cd.yml](file:///d:/fn-roomi/roomi/.github/workflows/cd.yml) | CD Pipeline — build Docker & deploy lên VPS |
| [Backend/roomi/Dockerfile](file:///d:/fn-roomi/roomi/Backend/roomi/Dockerfile) | Multi-stage Docker build cho Spring Boot |
| [Frontend/roomi/Dockerfile](file:///d:/fn-roomi/roomi/Frontend/roomi/Dockerfile) | Multi-stage Docker build cho React + Nginx |
| [docker-compose.yml](file:///d:/fn-roomi/roomi/docker-compose.yml) | Base compose (dev/local) |
| [docker-compose.prod.yml](file:///d:/fn-roomi/roomi/docker-compose.prod.yml) | Production override — dùng ảnh từ GHCR |
| [Frontend/roomi/nginx.conf](file:///d:/fn-roomi/roomi/Frontend/roomi/nginx.conf) | Nginx proxy API → Backend |

---

## 🔷 Sơ Đồ Toàn Bộ CI/CD Pipeline

```mermaid
flowchart TD
    DEV["👨‍💻 Developer\nPush Code / Open PR"]

    subgraph TRIGGER["🔔 Triggers"]
        T1["push: main, develop, feature/*"]
        T2["pull_request: main, develop"]
        T3["workflow_dispatch (manual)"]
    end

    DEV --> T1
    DEV --> T2
    DEV --> T3

    subgraph CI["📋 CI Pipeline — ci.yml\n(Chạy song song 2 jobs)"]

        subgraph BE_CI["🟨 Job: backend-ci\n(ubuntu-latest | ./Backend/roomi)"]
            BE1["📥 Checkout Code\nactions/checkout@v4"]
            BE2["☕ Setup JDK 17\nTemurin + Maven Cache"]
            BE3["🔓 chmod +x mvnw"]
            BE4["🧪 Run Unit Tests + Coverage\n./mvnw clean test\n(JaCoCo report)"]
            BE5["📦 Build Package\n./mvnw package -DskipTests"]
            BE_SVC[("🗄️ MySQL 8.0 Service\nDB: laybo | Port: 3306\nHealthCheck: mysqladmin ping")]
            BE1 --> BE2 --> BE3 --> BE4 --> BE5
            BE_SVC -.->|"cung cấp DB\ncho test"| BE4
        end

        subgraph FE_CI["🟦 Job: frontend-ci\n(ubuntu-latest | ./Frontend/roomi)"]
            FE1["📥 Checkout Code\nactions/checkout@v4"]
            FE2["🟢 Setup Node.js 20\n+ npm cache"]
            FE3["📦 npm ci\n(install dependencies)"]
            FE4["🔍 Run Oxlint\nnpm run lint"]
            FE5["🏗️ Build Production\nnpm run build\nVITE_API_BASE_URL=/api/v1"]
            FE1 --> FE2 --> FE3 --> FE4 --> FE5
        end

    end

    T1 --> BE_CI
    T1 --> FE_CI
    T2 --> BE_CI
    T2 --> FE_CI
    T3 --> BE_CI
    T3 --> FE_CI

    CI_RESULT{{"✅ CI Pass?\n(cả BE + FE)"}}
    BE5 --> CI_RESULT
    FE5 --> CI_RESULT
```

---

## 🔶 Sơ Đồ CD Pipeline (Chỉ Khi Push → main hoặc Tag v*.*.*)

```mermaid
flowchart TD

    TRIGGER_CD["🔔 CD Trigger\npush: main branch\nOR tag: v*.*.*\nOR workflow_dispatch"]

    subgraph CD["📋 CD Pipeline — cd.yml"]

        subgraph GATE["🛡️ Job 1: ci-gate\nWait for CI Pipeline"]
            CG["uses: ./.github/workflows/ci.yml\n(gọi lại toàn bộ CI)"]
        end

        subgraph DOCKER["🐳 Job 2: build-and-push-docker\n(needs: ci-gate)"]

            D1["📥 Checkout Code"]
            D2["🔧 Setup Docker Buildx"]
            D3["🔐 Login GHCR\ngithub.actor + GITHUB_TOKEN"]

            subgraph META_BE["📌 Backend Metadata"]
                MB["docker/metadata-action@v5\nghcr.io/REPO/backend\nTags: latest, semver, sha-xxx"]
            end

            subgraph BUILD_BE["🔨 Build Backend Docker Image"]
                BB1["Context: ./Backend/roomi\nDockerfile: 2-stage build"]
                BB2["Stage 1 (builder):\nmaven:3.9-eclipse-temurin-17\nmvn clean package -DskipTests"]
                BB3["Stage 2 (runtime):\neclipse-temurin:17-jre-alpine\nCopy *.jar → app.jar\nEXPOSE 8080"]
                BB1 --> BB2 --> BB3
            end

            subgraph META_FE["📌 Frontend Metadata"]
                MF["docker/metadata-action@v5\nghcr.io/REPO/frontend\nTags: latest, semver, sha-xxx"]
            end

            subgraph BUILD_FE["🔨 Build Frontend Docker Image"]
                BF1["Context: ./Frontend/roomi\nDockerfile: 2-stage build"]
                BF2["Stage 1 (builder):\nnode:20-alpine\nnpm ci + npm run build\nARG VITE_API_BASE_URL (injected)"]
                BF3["Stage 2 (serve):\nnginx:alpine\nCopy dist/ → /usr/share/nginx/html\nCopy nginx.conf\nEXPOSE 80"]
                BF1 --> BF2 --> BF3
            end

            PUSH["🚀 Push to GHCR\nghcr.io/REPO/backend:latest\nghcr.io/REPO/frontend:latest"]
            SUMMARY["📝 Write Job Summary\nMarkdown table với image tags"]

            D1 --> D2 --> D3 --> META_BE --> BUILD_BE --> META_FE --> BUILD_FE --> PUSH --> SUMMARY
        end

        subgraph DEPLOY["🚀 Job 3: deploy\n(needs: build-and-push-docker)\n(only: github.ref == main)"]
            SSH["appleboy/ssh-action@v1.0.3\nHOST: secrets.SERVER_HOST\nUSER: secrets.SERVER_USER\nKEY: secrets.SSH_PRIVATE_KEY\nPort: 22 | Timeout: 120s"]

            subgraph VPS_SCRIPT["📜 Script chạy trên VPS (~/roomi)"]
                V1["🔐 docker login ghcr.io\n(dùng GITHUB_TOKEN)"]
                V2["📥 docker compose pull\n(-f compose.yml -f compose.prod.yml)"]
                V3["♻️ docker compose up -d\n--remove-orphans\n(zero-downtime recreate)"]
                V4["🧹 docker image prune -f\n(dọn image cũ)"]
                V1 --> V2 --> V3 --> V4
            end

            RESULT{{"Deploy kết quả?"}}
            OK["✅ Deployment Success Summary\nURL: https://roomi.website\nServer, Commit, Triggered-by"]
            FAIL["❌ Deployment Failed\nHướng dẫn check logs SSH"]

            SSH --> VPS_SCRIPT --> RESULT
            RESULT -->|success| OK
            RESULT -->|failure| FAIL
        end

    end

    TRIGGER_CD --> GATE --> DOCKER --> DEPLOY
```

---

## 🏗️ Chi Tiết Dockerfile — Backend (Spring Boot)

```mermaid
flowchart LR
    subgraph BE_DF["Backend Dockerfile — Multi-stage Build"]
        BDS1["Stage 1: builder\nFROM maven:3.9-eclipse-temurin-17\nCOPY pom.xml\nmvn dependency:go-offline\nCOPY src/\nmvn clean package -DskipTests"]
        BDS2["Stage 2: runtime\nFROM eclipse-temurin:17-jre-alpine\nCOPY --from=builder *.jar → app.jar\nEXPOSE 8080\nENTRYPOINT java JAVA_OPTS -jar app.jar\n(default: -Xms128m -Xmx256m)"]
        BDS1 -->|"copy artifact"| BDS2
    end
```

> **Stack BE:** Spring Boot 4.1.0 · JPA · WebMVC · MySQL · PostgreSQL · Lombok · Validation · JaCoCo · Apache POI

---

## 🏗️ Chi Tiết Dockerfile — Frontend (React + Vite → Nginx)

```mermaid
flowchart LR
    subgraph FE_DF["Frontend Dockerfile — Multi-stage Build"]
        FDS1["Stage 1: builder\nFROM node:20-alpine\nCOPY package*.json\nnpm ci\nARG VITE_API_BASE_URL\nnpm run build (vite build)\n→ /app/dist/"]
        FDS2["Stage 2: serve\nFROM nginx:alpine\nCOPY dist/ → /usr/share/nginx/html\nCOPY nginx.conf → /etc/nginx/conf.d/default.conf\nEXPOSE 80\nCMD nginx -g 'daemon off;'"]
        FDS1 -->|"copy dist/"| FDS2
    end
```

> **Stack FE:** React 19 · Vite 8 · React Router 7 · Axios · Lucide-React · Oxlint

---

## 🌐 Kiến Trúc Runtime Trên VPS

```mermaid
flowchart TD
    USER["🌍 User Browser\nhttps://roomi.website"]
    NGINX_HOST["🖥️ Nginx (Host)\nnginx-vps.conf\nSSL Termination"]
    
    subgraph DOCKER_NET["🐳 Docker Network: roomi-network"]
        FE_CONT["📦 roomi-frontend\nnginx:alpine (port 80)\nServe React SPA\n→ Port 3000 exposed"]
        BE_CONT["📦 roomi-backend\nSpring Boot JAR (port 8080)\nJVM: -Xms256m -Xmx512m"]
        DB_CONT["🗄️ roomi-db\nMySQL 8.0 (port 3306)\nVolume: mysql_data\n⚠️ Không expose ra ngoài"]
    end

    USER --> NGINX_HOST
    NGINX_HOST -->|"port 3000"| FE_CONT
    FE_CONT -->|"proxy /api/ → backend:8080/api/"| BE_CONT
    BE_CONT -->|"JDBC mysql://db:3306/laybo"| DB_CONT
```

---

## 📊 Tóm Tắt Luồng Theo Branch

| Branch / Event | CI chạy? | CD chạy? | Deploy? |
|---|---|---|---|
| `push feature/*` | ✅ BE + FE | ❌ | ❌ |
| `push develop` | ✅ BE + FE | ❌ | ❌ |
| `PR → main` | ✅ BE + FE | ❌ | ❌ |
| `PR → develop` | ✅ BE + FE | ❌ | ❌ |
| `push main` | ✅ (qua ci-gate) | ✅ Build & Push | ✅ Deploy VPS |
| `push tag v*.*.*` | ✅ (qua ci-gate) | ✅ Build & Push | ❌ (chỉ main) |
| `workflow_dispatch` | ✅ | ✅ (CD) | ✅ (nếu main) |

---

## 🔐 GitHub Secrets Cần Thiết

| Secret | Dùng Ở | Mô Tả |
|--------|--------|-------|
| `GITHUB_TOKEN` | CD (tự động) | Đăng nhập GHCR, push images |
| `SERVER_HOST` | Deploy job | IP hoặc domain VPS |
| `SERVER_USER` | Deploy job | SSH user (thường: `ubuntu`) |
| `SSH_PRIVATE_KEY` | Deploy job | Nội dung file `.pem` của EC2 |
| `VITE_API_BASE_URL_PROD` | Docker build FE | URL API production (fallback: `/api/v1`) |
| `DB_PASSWORD` | `.env` trên VPS | Mật khẩu MySQL production |
| `DB_USERNAME` | `.env` trên VPS | Username MySQL production |
