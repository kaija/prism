use rdkafka::config::ClientConfig;
use rdkafka::error::KafkaError;
use rdkafka::producer::{FutureProducer, FutureRecord};
use std::time::Duration;
use tracing;

use crate::config::app_config::KafkaConfig;
use crate::models::event::{EnrichedEvent, ProfileUpdatePayload};

/// Kafka producer service that publishes enriched events and profile updates
/// to the configured Kafka topic.
pub struct KafkaProducerService {
    producer: FutureProducer,
    topic_raw: String,
}

impl KafkaProducerService {
    /// Create a no-op `KafkaProducerService` for use in tests.
    ///
    /// Connects to a dummy broker address. Publish calls will fail, but this
    /// is acceptable for handler tests that never exercise Kafka.
    #[cfg(test)]
    pub fn new_noop() -> Self {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", "localhost:19092")
            .set("message.timeout.ms", "1000")
            .create()
            .expect("noop producer creation should not fail");
        Self {
            producer,
            topic_raw: "test.noop".to_string(),
        }
    }

    /// Create a new `KafkaProducerService` from the application's `KafkaConfig`.
    pub fn new(config: &KafkaConfig) -> Result<Self, KafkaError> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &config.bootstrap_servers)
            .set("message.timeout.ms", "5000")
            .create()?;

        Ok(Self {
            producer,
            topic_raw: config.topic_raw.clone(),
        })
    }

    /// Publish a track event to the `event.raw` topic.
    /// Uses `project_id` as the Kafka message key for partitioning.
    pub async fn publish_event(&self, event: &EnrichedEvent) -> Result<(), KafkaError> {
        let payload = serde_json::to_string(event).map_err(|e| {
            tracing::error!(error = %e, "Failed to serialize EnrichedEvent");
            KafkaError::MessageProduction(rdkafka::types::RDKafkaErrorCode::InvalidMessage)
        })?;

        let record = FutureRecord::to(&self.topic_raw)
            .key(&event.project_id)
            .payload(&payload);

        self.producer
            .send(record, Duration::from_secs(5))
            .await
            .map_err(|(err, _)| {
                tracing::error!(error = %err, topic = %self.topic_raw, "Failed to publish event to Kafka");
                err
            })?;

        Ok(())
    }

    /// Publish a profile update to the `event.raw` topic.
    /// Uses `project_id` as the Kafka message key for partitioning.
    pub async fn publish_profile(&self, profile: &ProfileUpdatePayload) -> Result<(), KafkaError> {
        let payload = serde_json::to_string(profile).map_err(|e| {
            tracing::error!(error = %e, "Failed to serialize ProfileUpdatePayload");
            KafkaError::MessageProduction(rdkafka::types::RDKafkaErrorCode::InvalidMessage)
        })?;

        let record = FutureRecord::to(&self.topic_raw)
            .key(&profile.project_id)
            .payload(&payload);

        self.producer
            .send(record, Duration::from_secs(5))
            .await
            .map_err(|(err, _)| {
                tracing::error!(error = %err, topic = %self.topic_raw, "Failed to publish profile to Kafka");
                err
            })?;

        Ok(())
    }
}
