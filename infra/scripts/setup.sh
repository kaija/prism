#!/bin/bash
set -e

echo "=== Prism Development Environment Setup ==="

# Wait for Kafka to be ready
echo "Waiting for Kafka..."
until docker compose -f docker-compose.infra.yml exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list 2>/dev/null; do
  sleep 2
done

# Create Kafka topics
echo "Creating Kafka topics..."
docker compose -f docker-compose.infra.yml exec kafka bash /opt/bitnami/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic event.raw --partitions 4 --replication-factor 1

docker compose -f docker-compose.infra.yml exec kafka bash /opt/bitnami/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic event.enriched --partitions 4 --replication-factor 1

docker compose -f docker-compose.infra.yml exec kafka bash /opt/bitnami/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic event.triggered --partitions 4 --replication-factor 1

docker compose -f docker-compose.infra.yml exec kafka bash /opt/bitnami/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic event.dlq --partitions 2 --replication-factor 1

echo "=== Setup Complete ==="
echo "Kafka topics:"
docker compose -f docker-compose.infra.yml exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
