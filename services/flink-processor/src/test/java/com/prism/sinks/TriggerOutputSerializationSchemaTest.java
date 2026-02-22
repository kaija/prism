package com.prism.sinks;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.TriggerOutput;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

class TriggerOutputSerializationSchemaTest {

    private TriggerOutputSerializationSchema schema;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        schema = new TriggerOutputSerializationSchema("event.triggered");
        objectMapper = new ObjectMapper();
    }

    @Test
    void serialize_producesRecordWithCorrectTopic() throws Exception {
        TriggerOutput output = makeTriggerOutput("proj_1", "user_1");

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        assertEquals("event.triggered", record.topic());
    }

    @Test
    void serialize_keyIsCompositeProjectIdProfileId() throws Exception {
        TriggerOutput output = makeTriggerOutput("proj_abc", "user_42");

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        String key = new String(record.key(), StandardCharsets.UTF_8);
        assertEquals("proj_abc:user_42", key);
    }

    @Test
    void serialize_valueIsValidJsonMatchingInput() throws Exception {
        TriggerOutput output = new TriggerOutput(
                "rule_1", "evt_1", "user_1", "proj_1",
                "webhook", "{\"msg\":\"hello\"}", 1700000000000L);

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        TriggerOutput deserialized = objectMapper.readValue(record.value(), TriggerOutput.class);
        assertEquals(output, deserialized);
    }

    @Test
    void serialize_differentOutputsProduceDifferentKeys() throws Exception {
        TriggerOutput a = makeTriggerOutput("proj_1", "user_a");
        TriggerOutput b = makeTriggerOutput("proj_2", "user_b");

        ProducerRecord<byte[], byte[]> recA = schema.serialize(a, null, null);
        ProducerRecord<byte[], byte[]> recB = schema.serialize(b, null, null);

        String keyA = new String(recA.key(), StandardCharsets.UTF_8);
        String keyB = new String(recB.key(), StandardCharsets.UTF_8);
        assertNotEquals(keyA, keyB);
    }

    @Test
    void serialize_nullFieldsInOutputStillSerializes() throws Exception {
        TriggerOutput output = new TriggerOutput(
                null, null, "user_1", "proj_1", null, null, 0L);

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        assertNotNull(record.key());
        assertNotNull(record.value());
        String key = new String(record.key(), StandardCharsets.UTF_8);
        assertEquals("proj_1:user_1", key);
    }

    @Test
    void serialize_emptyStringsInKeyFields() throws Exception {
        TriggerOutput output = makeTriggerOutput("", "");

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        String key = new String(record.key(), StandardCharsets.UTF_8);
        assertEquals(":", key);
    }

    @Test
    void serialize_preservesAllFieldsInJson() throws Exception {
        TriggerOutput output = new TriggerOutput(
                "rule_99", "evt_55", "user_7", "proj_3",
                "kafka_publish", "{\"data\":42}", 1700000099000L);

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        TriggerOutput deserialized = objectMapper.readValue(record.value(), TriggerOutput.class);
        assertEquals("rule_99", deserialized.getRuleId());
        assertEquals("evt_55", deserialized.getEventId());
        assertEquals("user_7", deserialized.getProfileId());
        assertEquals("proj_3", deserialized.getProjectId());
        assertEquals("kafka_publish", deserialized.getActionType());
        assertEquals("{\"data\":42}", deserialized.getRenderedPayload());
        assertEquals(1700000099000L, deserialized.getTriggeredAt());
    }

    private TriggerOutput makeTriggerOutput(String projectId, String profileId) {
        return new TriggerOutput(
                "rule_1", "evt_1", profileId, projectId,
                "webhook", "{}", System.currentTimeMillis());
    }
}
