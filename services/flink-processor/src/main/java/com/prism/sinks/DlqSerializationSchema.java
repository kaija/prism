package com.prism.sinks;

import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.nio.charset.StandardCharsets;

/**
 * Serializes DLQ messages (JSON strings) for the Kafka DLQ sink (event.dlq topic).
 */
public class DlqSerializationSchema implements KafkaRecordSerializationSchema<String> {

    private static final long serialVersionUID = 1L;

    private final String topic;

    public DlqSerializationSchema(String topic) {
        this.topic = topic;
    }

    @Override
    public ProducerRecord<byte[], byte[]> serialize(
            String element, KafkaSinkContext context, Long timestamp) {
        byte[] valueBytes = element.getBytes(StandardCharsets.UTF_8);
        return new ProducerRecord<>(topic, null, valueBytes);
    }
}
