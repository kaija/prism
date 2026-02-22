package com.prism.functions;

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

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 3: Event history count retention
// Validates: Requirements 2.3
class EventEnrichCountRetentionPropertyTest {

    @Property(tries = 100)
    void eventHistoryRetainsExactlyNMostRecentEvents(
            @ForAll("maxCounts") int maxCount,
            @ForAll("extraEventCounts") int extraEvents) throws Exception {

        int totalEvents = maxCount + extraEvents; // M > N guaranteed

        AppConfig config = new AppConfig();
        config.setBackendApiUrl("http://localhost:8080");
        config.setMaxEventHistoryCount(maxCount);
        // Set size limit high enough to not interfere with count retention
        config.setMaxEventHistoryBytes(100L * 1024 * 1024);

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

            for (int i = 0; i < totalEvents; i++) {
                PrismEvent event = new PrismEvent(
                        "evt_" + i,
                        projectId,
                        "event_" + i,
                        System.currentTimeMillis(),
                        System.currentTimeMillis(),
                        profileId,
                        new HashMap<>(),
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

            // Property: event history contains exactly N events
            assertEquals(maxCount, retainedEvents.size(),
                    String.format("After processing %d events with max count %d, " +
                            "history should contain exactly %d events",
                            totalEvents, maxCount, maxCount));

            // Property: retained events are the N most recent by insertion order
            List<PrismEvent> expectedRecent = allEvents.subList(
                    allEvents.size() - maxCount, allEvents.size());

            for (int i = 0; i < maxCount; i++) {
                assertEquals(expectedRecent.get(i).getEventId(),
                        retainedEvents.get(i).getEventId(),
                        String.format("Event at position %d should match the %d-th most recent",
                                i, i));
            }
        } finally {
            harness.close();
        }
    }

    @Provide
    Arbitrary<Integer> maxCounts() {
        return Arbitraries.integers().between(1, 20);
    }

    @Provide
    Arbitrary<Integer> extraEventCounts() {
        return Arbitraries.integers().between(1, 50);
    }
}
