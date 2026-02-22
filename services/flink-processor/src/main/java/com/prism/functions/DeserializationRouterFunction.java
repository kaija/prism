package com.prism.functions;

import com.prism.models.PrismEvent;
import com.prism.sinks.EventDeserializationSchema;
import com.prism.sinks.EventDeserializationSchema.DeserializationResult;
import org.apache.flink.api.common.functions.OpenContext;
import org.apache.flink.streaming.api.functions.ProcessFunction;
import org.apache.flink.util.Collector;
import org.apache.flink.util.OutputTag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;

/**
 * Routes raw byte messages through deserialization: valid PrismEvents go to the
 * main output, and invalid messages are routed to a DLQ side output as JSON strings
 * containing the original message and error description.
 */
public class DeserializationRouterFunction extends ProcessFunction<byte[], PrismEvent> {

    private static final long serialVersionUID = 1L;
    private static final Logger LOG = LoggerFactory.getLogger(DeserializationRouterFunction.class);

    /** Side output tag for messages that fail deserialization (routed to event.dlq). */
    public static final OutputTag<String> DLQ_OUTPUT = new OutputTag<>("dlq-output") {};

    private transient EventDeserializationSchema deserializer;

    @Override
    public void open(OpenContext ctx) throws Exception {
        deserializer = new EventDeserializationSchema();
        deserializer.open(null);
    }

    @Override
    public void processElement(byte[] value, Context ctx, Collector<PrismEvent> out)
            throws Exception {
        DeserializationResult result = deserializer.tryDeserialize(value);
        if (result.success()) {
            LOG.info("[DESER] Deserialized event: event_id={}, event_name={}, project_id={}, profile_id={}",
                    result.event().getEventId(), result.event().getEventName(),
                    result.event().getProjectId(), result.event().getProfileId());
            out.collect(result.event());
        } else {
            String originalMessage = value != null
                    ? new String(value, 0, Math.min(value.length, 10000), StandardCharsets.UTF_8)
                    : "";
            String dlqJson = "{\"original_message\":\""
                    + escapeJson(originalMessage)
                    + "\",\"error\":\""
                    + escapeJson(result.errorMessage())
                    + "\",\"timestamp\":" + System.currentTimeMillis() + "}";
            ctx.output(DLQ_OUTPUT, dlqJson);
            LOG.warn("Routing invalid message to DLQ: {}", result.errorMessage());
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
