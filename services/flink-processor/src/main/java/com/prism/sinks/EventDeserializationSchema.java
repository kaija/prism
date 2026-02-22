package com.prism.sinks;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.PrismEvent;
import org.apache.flink.api.common.serialization.DeserializationSchema;
import org.apache.flink.api.common.typeinfo.TypeInformation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Flink DeserializationSchema that deserializes JSON bytes into PrismEvent objects.
 *
 * <p>For valid JSON conforming to the PrismEvent schema, {@link #deserialize(byte[])} returns
 * the deserialized PrismEvent. For invalid JSON or non-conforming data, it throws an
 * {@link IOException} so the caller (pipeline) can route the raw message to the DLQ.</p>
 *
 * <p>A companion {@link #tryDeserialize(byte[])} method is provided that returns a
 * {@link DeserializationResult} instead of throwing, for use in process functions
 * that need to route failures to a side output.</p>
 */
public class EventDeserializationSchema implements DeserializationSchema<PrismEvent> {

    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(EventDeserializationSchema.class);

    private transient ObjectMapper objectMapper;

    @Override
    public void open(InitializationContext context) {
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public PrismEvent deserialize(byte[] message) throws IOException {
        ensureObjectMapper();
        if (message == null || message.length == 0) {
            throw new IOException("Cannot deserialize null or empty message");
        }
        try {
            return objectMapper.readValue(message, PrismEvent.class);
        } catch (Exception e) {
            String preview = new String(message, 0, Math.min(message.length, 200), StandardCharsets.UTF_8);
            throw new IOException(
                    "Failed to deserialize PrismEvent: " + e.getMessage() + " | raw (truncated): " + preview, e);
        }
    }

    @Override
    public boolean isEndOfStream(PrismEvent nextElement) {
        return false;
    }

    @Override
    public TypeInformation<PrismEvent> getProducedType() {
        return TypeInformation.of(PrismEvent.class);
    }

    /**
     * Attempts to deserialize the given bytes into a PrismEvent, returning a
     * {@link DeserializationResult} that is either a success or an error.
     * This method never throws and is intended for use in process functions
     * that route failures to a DLQ side output.
     */
    public DeserializationResult tryDeserialize(byte[] message) {
        ensureObjectMapper();
        if (message == null || message.length == 0) {
            return DeserializationResult.error(
                    message != null ? message : new byte[0],
                    "Cannot deserialize null or empty message");
        }
        try {
            PrismEvent event = objectMapper.readValue(message, PrismEvent.class);
            return DeserializationResult.success(event);
        } catch (Exception e) {
            return DeserializationResult.error(message,
                    "Failed to deserialize PrismEvent: " + e.getMessage());
        }
    }

    private void ensureObjectMapper() {
        if (objectMapper == null) {
            objectMapper = new ObjectMapper();
        }
    }

    /**
     * Result of a deserialization attempt — either a successfully parsed PrismEvent
     * or the original raw bytes with an error description (for DLQ routing).
     */
    public record DeserializationResult(
            boolean success,
            PrismEvent event,
            byte[] rawMessage,
            String errorMessage
    ) {
        public static DeserializationResult success(PrismEvent event) {
            return new DeserializationResult(true, event, null, null);
        }

        public static DeserializationResult error(byte[] rawMessage, String errorMessage) {
            return new DeserializationResult(false, null, rawMessage, errorMessage);
        }
    }
}
