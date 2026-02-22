package com.prism.sinks;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.PrismEvent;
import com.prism.sinks.EventDeserializationSchema.DeserializationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class EventDeserializationSchemaTest {

    private EventDeserializationSchema schema;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        schema = new EventDeserializationSchema();
        // open() initializes the internal ObjectMapper
        schema.open(null);
        objectMapper = new ObjectMapper();
    }

    // --- deserialize() tests ---

    @Test
    void deserialize_validJson_returnsPrismEvent() throws Exception {
        PrismEvent original = new PrismEvent(
                "evt_1", "proj_1", "purchase",
                1700000000000L, 1700000001000L, "user_42",
                Map.of("amount", 5999), Map.of("ip", "10.0.0.1"));

        byte[] json = objectMapper.writeValueAsBytes(original);
        PrismEvent result = schema.deserialize(json);

        assertEquals(original, result);
    }

    @Test
    void deserialize_minimalJson_returnsPrismEventWithDefaults() throws Exception {
        byte[] json = "{}".getBytes(StandardCharsets.UTF_8);
        PrismEvent result = schema.deserialize(json);

        assertNotNull(result);
        assertNull(result.getEventId());
        assertNull(result.getProjectId());
        assertNotNull(result.getProps());
        assertNotNull(result.getCtx());
    }

    @Test
    void deserialize_invalidJson_throwsIOException() {
        byte[] garbage = "not-json!!!".getBytes(StandardCharsets.UTF_8);
        assertThrows(IOException.class, () -> schema.deserialize(garbage));
    }

    @Test
    void deserialize_nullMessage_throwsIOException() {
        assertThrows(IOException.class, () -> schema.deserialize(null));
    }

    @Test
    void deserialize_emptyMessage_throwsIOException() {
        assertThrows(IOException.class, () -> schema.deserialize(new byte[0]));
    }

    // --- tryDeserialize() tests ---

    @Test
    void tryDeserialize_validJson_returnsSuccess() throws Exception {
        PrismEvent original = new PrismEvent(
                "evt_2", "proj_2", "login",
                1700000000000L, 1700000001000L, "user_99",
                Map.of("browser", "chrome"), Map.of());

        byte[] json = objectMapper.writeValueAsBytes(original);
        DeserializationResult result = schema.tryDeserialize(json);

        assertTrue(result.success());
        assertEquals(original, result.event());
        assertNull(result.rawMessage());
        assertNull(result.errorMessage());
    }

    @Test
    void tryDeserialize_invalidJson_returnsErrorWithRawBytes() {
        byte[] garbage = "{{broken".getBytes(StandardCharsets.UTF_8);
        DeserializationResult result = schema.tryDeserialize(garbage);

        assertFalse(result.success());
        assertNull(result.event());
        assertArrayEquals(garbage, result.rawMessage());
        assertNotNull(result.errorMessage());
        assertTrue(result.errorMessage().contains("Failed to deserialize"));
    }

    @Test
    void tryDeserialize_nullMessage_returnsError() {
        DeserializationResult result = schema.tryDeserialize(null);

        assertFalse(result.success());
        assertNull(result.event());
        assertNotNull(result.errorMessage());
    }

    @Test
    void tryDeserialize_emptyMessage_returnsError() {
        DeserializationResult result = schema.tryDeserialize(new byte[0]);

        assertFalse(result.success());
        assertNull(result.event());
        assertNotNull(result.errorMessage());
    }

    // --- Schema contract tests ---

    @Test
    void isEndOfStream_returnsFalse() {
        assertFalse(schema.isEndOfStream(new PrismEvent()));
    }

    @Test
    void getProducedType_returnsPrismEventTypeInfo() {
        assertNotNull(schema.getProducedType());
        assertEquals(PrismEvent.class, schema.getProducedType().getTypeClass());
    }

    @Test
    void deserialize_jsonWithExtraFields_throwsIOException() {
        String json = """
                {
                  "event_id": "evt_3",
                  "project_id": "proj_3",
                  "event_name": "click",
                  "unknown_field": "should cause failure"
                }
                """;
        assertThrows(IOException.class,
                () -> schema.deserialize(json.getBytes(StandardCharsets.UTF_8)));
    }
}
