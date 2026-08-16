# ==========================================
# GIAI ĐOẠN 1: BUILD JAR BẰNG MAVEN
# ==========================================
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy pom.xml và tải dependencies trước để tận dụng Docker cache
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy mã nguồn và đóng gói JAR
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# GIAI ĐOẠN 2: RUNTIME NHẸ VỚI JRE 17 ALPINE
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Tạo user không đặc quyền để tăng bảo mật
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy file jar từ giai đoạn build
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
