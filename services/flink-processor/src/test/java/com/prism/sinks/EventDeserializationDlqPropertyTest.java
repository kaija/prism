package com.prism.sinks;

import com.prism.sinks.EventDeserializationSchema.DeserializationResult;
import net.jqwik.api.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 2: Invalid JSON routes to DLQ
// **Validates: Requirements 1.4**
class EventDeserializationDlqPropertyTest {

    private EventDeserializationSchema schema;

    @Property(tries = 100)
    void invalidInputRoutesThroughTryDeserializeWithDlqInfo(
            @ForAll("invalidMessages") byte[] message) {
        schema = new EventDeserializationSchema();
        schema.open(null);

        DeserializationResult result = schema.tryDeserialize(message);

        assertFalse(result.success(), "Invalid input must not succeed");
        assertNotNull(result.rawMessage(), "DLQ result must contain raw message");
        assertArrayEquals(message, result.rawMessage(), "DLQ raw message must match original bytes");
        assertNotNull(result.errorMessage(), "DLQ result must contain an error description");
        assertFalse(result.errorMessage().isBlank(), "Error description must not be blank");
    }

    @Property(tries = 100)
    void invalidInputCausesDeserializeToThrowIOException(
            @ForAll("invalidMessages") byte[] message) {
        schema = new EventDeserializationSchema();
        schema.open(null);

        assertThrows(IOException.class, () -> schema.deserialize(message),
                "deserialize() must throw IOException for invalid input");
    }

    @Provide
    Arbitrary<byte[]> invalidMessages() {
        return Arbitraries.oneOf(
                randomBytes(),
                jsonArrayBytes(),
                jsonPrimitiveBytes(),
                jsonObjectWithUnknownFields(),
                emptyBytes()
        );
    }

    /** Random byte sequences — almost certainly not valid JSON. */
    private Arbitrary<byte[]> randomBytes() {
        return Arbitraries.bytes().array(byte[].class).ofMinSize(1).ofMaxSize(256)
                .filter(b -> !isJsonNull(b));
    }

    /** Valid JSON arrays — not a JSON object, so cannot map to PrismEvent. */
    private Arbitrary<byte[]> jsonArrayBytes() {
        return Arbitraries.of(
                "[]", "[1,2,3]", "[\"a\",\"b\"]", "[null]", "[[]]"
        ).map(s -> s.getBytes(StandardCharsets.UTF_8));
    }

    /** Valid JSON primitives — strings, numbers, booleans (not objects). */
    private Arbitrary<byte[]> jsonPrimitiveBytes() {
        return Arbitraries.of(
                "\"hello\"", "42", "true", "false", "3.14", "-1"
        ).map(s -> s.getBytes(StandardCharsets.UTF_8));
    }

    /** Valid JSON objects with unknown fields — Jackson FAIL_ON_UNKNOWN_PROPERTIES rejects these. */
    private Arbitrary<byte[]> jsonObjectWithUnknownFields() {
        Arbitrary<String> fieldNames = Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(15)
                .filter(s -> !s.matches("(?i)(event_id|project_id|event_name|cts|sts|profile_id|props|ctx)"));
        return fieldNames.map(f ->
                ("{\"" + f + "\": \"value\"}").getBytes(StandardCharsets.UTF_8));
    }

    /** Empty byte array — should be treated as invalid. */
    private Arbitrary<byte[]> emptyBytes() {
        return Arbitraries.just(new byte[0]);
    }

    /** Jackson deserializes JSON literal "null" to a null object — exclude this edge case. */
    private static boolean isJsonNull(byte[] bytes) {
        return bytes.length == 4
                && bytes[0] == 'n' && bytes[1] == 'u' && bytes[2] == 'l' && bytes[3] == 'l';
    }
}
