# Multistage build for Spring Boot backend (production)
# Build: docker build -f Dockerfile -t frms-ops-api:latest .
# Run: docker run -e SPRING_PROFILES_ACTIVE=prod -p 4000:4000 frms-ops-api:latest

FROM maven:3.9-eclipse-temurin-17-alpine AS builder
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar frms-ops-api.jar

# Runtime configuration
ENV SPRING_PROFILES_ACTIVE=prod
ENV FRMS_JDBC_URL=jdbc:sqlserver://localhost:1433;databaseName=frms_ops;encrypt=false;trustServerCertificate=true
ENV FRMS_DB_USER=sa
ENV FRMS_DB_PASSWORD=YourStrong!Passw0rd

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

EXPOSE 4000
ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "frms-ops-api.jar"]
