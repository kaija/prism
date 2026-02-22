package com.prism.sinks;

import com.prism.models.TriggerOutput;
import net.jqwik.api.*;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 15: Kafka message key equals composite key
// **Validates: Requirements 13.3**
class TriggerOutputKeyPropertyTest {

    private final TriggerOutputSerializationSchema schema =
            new TriggerOutputSerializationSchema("event.triggered");

    @Property(tries = 100)
    void kafkaMessageKeyEqualsCompositeProjectIdProfileId(
            @ForAll("triggerOutputs") TriggerOutput output) {

        ProducerRecord<byte[], byte[]> record = schema.serialize(output, null, null);

        String actualKey = new String(record.key(), StandardCharsets.UTF_8);
        String expectedKey = output.getProjectId() + ":" + output.getProfileId();

        assertEquals(expectedKey, actualKey,
                "Kafka message key must equal projectId:profileId");
    }

    @Provide
    Arbitrary<TriggerOutput> triggerOutputs() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().numeric()
                .withChars('_', '-').ofMinLength(1).ofMaxLength(40);
        Arbitrary<String> actionTypes = Arbitraries.of("webhook", "kafka_publish", "email", "sms");
        Arbitrary<String> payloads = Arbitraries.strings().ofMinLength(0).ofMaxLength(200);
        Arbitrary<Long> timestamps = Arbitraries.longs().between(0L, 2_000_000_000_000L);

        return Combinators.combine(ids, ids, ids, ids, actionTypes, payloads, timestamps)
                .as((ruleId, eventId, profileId, projectId, actionType, payload, ts) ->
                        new TriggerOutput(ruleId, eventId, profileId, projectId, actionType, payload, ts));
    }
}
