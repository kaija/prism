package com.prism.functions;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.config.AppConfig;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import org.apache.flink.api.common.state.ListState;
import org.apache.flink.api.common.state.ListStateDescriptor;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.runtime.state.KeyedStateBackend;
import org.apache.flink.runtime.state.VoidNamespace;
import org.apache.flink.runtime.state.VoidNamespaceSerializer;
import org.apache.flink.streaming.api.operators.AbstractStreamOperator;
import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.runtime.streamrecord.StreamRecord;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 4: Event history size retention
// Validates: Requirements 2.4
class EventEnrichSizeRetentionPropertyTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Property(tries = 100)
    void eventHistorySizeNeverExceedsConfiguredLimit(
            @ForAll("maxSizes") long maxSizeBytes,
            @ForAll("eventSequences") List<Map<String, String>> propsSequence) throws Exception {

        AppConfig config = new AppConfig();
        config.setBackendApiUrl("http://localhost:8080");
        config.setMaxEventHistoryCount(10000); // very high so only size limit applies
        config.setMaxEventHistoryBytes(maxSizeBytes);

        EventEnrichFunction function = new EventEnrichFunction(config);
        KeyedOneInputStreamOperatorTestHarness<String, PrismEvent, EnrichedEvent> harness =
                new KeyedOneInputStreamOperatorTestHarness<>(
                        new KeyedProcessOperator<>(function),
                        PrismEvent::getProfileId,
                        Types.STRING
                );

        try {
            harness.open();

            String profileId = "profile1";
            String projectId = "proj1";
            List<PrismEvent> allEvents = new ArrayList<>();

            for (int i = 0; i < propsSequence.size(); i++) {
                Map<String, Object> props = new HashMap<>(propsSequence.get(i));
                PrismEvent event = new PrismEvent(
                        "evt_" + i,
                        projectId,
                        "test_event",
                        System.currentTimeMillis(),
                        System.currentTimeMillis(),
                        profileId,
                        props,
                        new HashMap<>()
                );
                allEvents.add(event);
                harness.processElement(new StreamRecord<>(event));
            }

            // Access the keyed state backend to read the event history
            AbstractStreamOperator<EnrichedEvent> operator = harness.getOperator();
            KeyedStateBackend<String> keyedBackend = operator.getKeyedStateBackend();
            keyedBackend.setCurrentKey(profileId);

            ListState<PrismEvent> eventHistoryState = operator.getPartitionedState(
                    VoidNamespace.INSTANCE,
                    VoidNamespaceSerializer.INSTANCE,
                    new ListStateDescriptor<>("eventHistory", PrismEvent.class)
            );

            List<PrismEvent> retainedEvents = new ArrayList<>();
            for (PrismEvent e : eventHistoryState.get()) {
                retainedEvents.add(e);
            }

            // Property 1: serialized size of retained events does not exceed S
            long serializedSize = estimateSerializedSize(retainedEvents);
            assertTrue(serializedSize <= maxSizeBytes,
                    String.format("Serialized size %d exceeds configured max %d bytes",
                            serializedSize, maxSizeBytes));

            // Property 2: retained events are the most recent ones (tail of allEvents)
            if (!retainedEvents.isEmpty()) {
                int retainedCount = retainedEvents.size();
                List<PrismEvent> expectedRecent = allEvents.subList(
                        allEvents.size() - retainedCount, allEvents.size());

                for (int i = 0; i < retainedCount; i++) {
                    assertEquals(expectedRecent.get(i).getEventId(),
                            retainedEvents.get(i).getEventId(),
                            String.format("Retained event at position %d should be the %d-th most recent event",
                                    i, i));
                }
            }
        } finally {
            harness.close();
        }
    }

    private long estimateSerializedSize(List<PrismEvent> events) {
        if (events.isEmpty()) {
            return 0;
        }
        try {
            return OBJECT_MAPPER.writeValueAsBytes(events).length;
        } catch (Exception e) {
            fail("Failed to estimate serialized size: " + e.getMessage());
            return 0;
        }
    }

    @Provide
    Arbitrary<Long> maxSizes() {
        return Arbitraries.longs().between(500, 5000);
    }

    @Provide
    Arbitrary<List<Map<String, String>>> eventSequences() {
        // Generate 5 to 30 events, each with random props to vary serialized size
        Arbitrary<Map<String, String>> propsArbitrary = Arbitraries.maps(
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(10),
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(100)
        ).ofMinSize(0).ofMaxSize(5);

        return propsArbitrary.list().ofMinSize(5).ofMaxSize(30);
    }
}
