package com.prism.sinks;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.TriggerOutput;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;

/**
 * Serializes {@link TriggerOutput} records for the Kafka sink.
 *
 * <p>Each record is serialized to JSON bytes as the value, with a composite
 * key of {@code projectId:profileId} encoded as UTF-8 bytes.</p>
 */
public class TriggerOutputSerializationSchema
        implements KafkaRecordSerializationSchema<TriggerOutput> {

    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(TriggerOutputSerializationSchema.class);

    private final String topic;
    private transient ObjectMapper objectMapper;

    public TriggerOutputSerializationSchema(String topic) {
        this.topic = topic;
    }

    @Override
    public ProducerRecord<byte[], byte[]> serialize(
            TriggerOutput element, KafkaSinkContext context, Long timestamp) {

        ensureObjectMapper();

        String compositeKey = element.getProjectId() + ":" + element.getProfileId();
        byte[] keyBytes = compositeKey.getBytes(StandardCharsets.UTF_8);

        try {
            byte[] valueBytes = objectMapper.writeValueAsBytes(element);
            return new ProducerRecord<>(topic, keyBytes, valueBytes);
        } catch (JsonProcessingException e) {
            LOG.error("Failed to serialize TriggerOutput for rule={} event={}: {}",
                    element.getRuleId(), element.getEventId(), e.getMessage(), e);
            throw new RuntimeException("Failed to serialize TriggerOutput", e);
        }
    }

    private void ensureObjectMapper() {
        if (objectMapper == null) {
            objectMapper = new ObjectMapper();
        }
    }
}
