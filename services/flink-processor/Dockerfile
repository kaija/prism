# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests -B
# Remove the original (non-shaded) JAR so only the fat JAR remains
RUN rm -f /app/target/original-*.jar

# Stage 2: Runtime
FROM flink:2.2-java17
COPY --from=builder /app/target/flink-processor-*.jar /opt/flink/usrlib/flink-processor.jar
RUN mkdir -p /opt/flink/checkpoints && chmod 777 /opt/flink/checkpoints
