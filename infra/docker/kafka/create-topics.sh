#!/bin/bash
set -e

KAFKA_BOOTSTRAP=${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}
KAFKA_BIN=${KAFKA_BIN:-/opt/kafka/bin}

echo "Creating Kafka topics..."

"$KAFKA_BIN/kafka-topics.sh" --bootstrap-server "$KAFKA_BOOTSTRAP" --create --if-not-exists \
  --topic event.raw --partitions 4 --replication-factor 1

"$KAFKA_BIN/kafka-topics.sh" --bootstrap-server "$KAFKA_BOOTSTRAP" --create --if-not-exists \
  --topic event.enriched --partitions 4 --replication-factor 1

"$KAFKA_BIN/kafka-topics.sh" --bootstrap-server "$KAFKA_BOOTSTRAP" --create --if-not-exists \
  --topic event.triggered --partitions 4 --replication-factor 1

"$KAFKA_BIN/kafka-topics.sh" --bootstrap-server "$KAFKA_BOOTSTRAP" --create --if-not-exists \
  --topic event.dlq --partitions 2 --replication-factor 1

echo "Kafka topics created successfully."
"$KAFKA_BIN/kafka-topics.sh" --bootstrap-server "$KAFKA_BOOTSTRAP" --list
