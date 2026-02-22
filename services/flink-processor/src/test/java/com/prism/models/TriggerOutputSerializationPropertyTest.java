package com.prism.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.jqwik.api.*;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Feature: flink-processor, Property 14: Trigger result serialization round-trip
// Validates: Requirements 13.1
class TriggerOutputSerializationPropertyTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Property(tries = 100)
    void serializationRoundTripPreservesAllFields(
            @ForAll("triggerOutputs") TriggerOutput original) throws Exception {
        String json = mapper.writeValueAsString(original);
        TriggerOutput deserialized = mapper.readValue(json, TriggerOutput.class);
        assertEquals(original, deserialized);
    }

    @Provide
    Arbitrary<TriggerOutput> triggerOutputs() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().numeric().ofMinLength(1).ofMaxLength(30);
        Arbitrary<String> actionTypes = Arbitraries.of(
                "webhook", "kafka_publish", "notification", "tag_profile", "update_attribute");
        Arbitrary<String> payloads = Arbitraries.strings().ascii().ofMinLength(0).ofMaxLength(200);
        Arbitrary<Long> timestamps = Arbitraries.longs().between(0L, System.currentTimeMillis() + 86400000L);

        return Combinators.combine(ids, ids, ids, ids, actionTypes, payloads, timestamps)
                .as(TriggerOutput::new);
    }
}
