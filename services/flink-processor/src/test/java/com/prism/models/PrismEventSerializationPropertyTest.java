package com.prism.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Feature: flink-processor, Property 1: Event deserialization round-trip
// Validates: Requirements 1.2
class PrismEventSerializationPropertyTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Property(tries = 100)
    void serializationRoundTripPreservesAllFields(
            @ForAll("prismEvents") PrismEvent original) throws Exception {
        String json = mapper.writeValueAsString(original);
        PrismEvent deserialized = mapper.readValue(json, PrismEvent.class);
        assertEquals(original, deserialized);
    }

    @Provide
    Arbitrary<PrismEvent> prismEvents() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().numeric().ofMinLength(1).ofMaxLength(30);
        Arbitrary<String> eventNames = Arbitraries.of("purchase", "click", "signup", "page_view", "logout", "login");
        Arbitrary<Long> timestamps = Arbitraries.longs().between(0L, System.currentTimeMillis() + 86400000L);
        Arbitrary<Map<String, Object>> props = propsMap();
        Arbitrary<Map<String, Object>> ctx = propsMap();

        return Combinators.combine(ids, ids, eventNames, timestamps, timestamps, ids, props, ctx)
                .as(PrismEvent::new);
    }

    @Provide
    Arbitrary<Map<String, Object>> propsMap() {
        Arbitrary<String> keys = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(15);
        Arbitrary<Object> values = Arbitraries.oneOf(
                Arbitraries.strings().alpha().ofMaxLength(20).map(s -> (Object) s),
                Arbitraries.integers().between(-10000, 10000).map(i -> (Object) i),
                Arbitraries.of(true, false).map(b -> (Object) b)
        );
        return Arbitraries.maps(keys, values).ofMinSize(0).ofMaxSize(5);
    }
}
