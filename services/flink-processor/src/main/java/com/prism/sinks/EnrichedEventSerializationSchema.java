package com.prism.sinks;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.EnrichedEvent;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;

/**
 * Serializes {@link EnrichedEvent} records for the Kafka sink (event.enriched topic).
 *
 * <p>Each record is serialized to JSON bytes as the value, with a composite
 * key of {@code projectId:profileId} encoded as UTF-8 bytes.</p>
 */
public class EnrichedEventSerializationSchema
        implements KafkaRecordSerializationSchema<EnrichedEvent> {

    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(EnrichedEventSerializationSchema.class);

    private final String topic;
    private transient ObjectMapper objectMapper;

    public EnrichedEventSerializationSchema(String topic) {
        this.topic = topic;
    }

    @Override
    public ProducerRecord<byte[], byte[]> serialize(
            EnrichedEvent element, KafkaSinkContext context, Long timestamp) {

        ensureObjectMapper();

        String compositeKey = element.getProjectId() + ":" + element.getProfileId();
        byte[] keyBytes = compositeKey.getBytes(StandardCharsets.UTF_8);

        try {
            byte[] valueBytes = objectMapper.writeValueAsBytes(element);
            return new ProducerRecord<>(topic, keyBytes, valueBytes);
        } catch (JsonProcessingException e) {
            LOG.error("Failed to serialize EnrichedEvent for profile={}: {}",
                    element.getProfileId(), e.getMessage(), e);
            throw new RuntimeException("Failed to serialize EnrichedEvent", e);
        }
    }

    private void ensureObjectMapper() {
        if (objectMapper == null) {
            objectMapper = new ObjectMapper();
        }
    }
}
