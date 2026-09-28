# ==========================================
# GIAI ĐOẠN 1: BUILD JAR BẰNG MAVEN
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy tệp pom.xml và tải trước các dependency để tận dụng Docker cache
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy mã nguồn và đóng gói JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# GIAI ĐOẠN 2: RUNTIME NHẸ VỚI JRE 17 ALPINE
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Tạo user không đặc quyền và cấp quyền cho thư mục ứng dụng / thư mục sao lưu
RUN addgroup -S spring && adduser -S spring -G spring \
    && mkdir -p /app/backups /tmp/stayaway_backups \
    && chmod -R 777 /app/backups /tmp/stayaway_backups \
    && chown -R spring:spring /app

# Copy file jar từ giai đoạn build với quyền sở hữu spring:spring
COPY --from=builder --chown=spring:spring /app/target/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
