package com.prism.functions;

import com.prism.config.AppConfig;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import net.jqwik.api.*;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.runtime.streamrecord.StreamRecord;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 19: Profile updated_at is refreshed on event processing
// Validates: Requirements 15.4
class EventEnrichUpdatedAtPropertyTest {

    @Property(tries = 100)
    void profileUpdatedAtIsMonotonicallyNonDecreasing(
            @ForAll("eventCounts") int eventCount) throws Exception {

        AppConfig config = new AppConfig();
        config.setBackendApiUrl("http://localhost:8080");
        config.setMaxEventHistoryCount(1000);
        config.setMaxEventHistoryBytes(10L * 1024 * 1024);

        EventEnrichFunction function = new EventEnrichFunction(config);
        KeyedOneInputStreamOperatorTestHarness<String, PrismEvent, EnrichedEvent> harness =
                new KeyedOneInputStreamOperatorTestHarness<>(
                        new KeyedProcessOperator<>(function),
                        PrismEvent::getProfileId,
                        Types.STRING
                );

        try {
            harness.open();

            String profileId = "profile_test";
            String projectId = "proj_test";

            for (int i = 0; i < eventCount; i++) {
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
                harness.processElement(new StreamRecord<>(event));
            }

            List<EnrichedEvent> output = extractOutput(harness);
            assertEquals(eventCount, output.size(),
                    "Should emit exactly one enriched event per input event");

            // Verify updated_at is monotonically non-decreasing across all outputs
            long previousUpdatedAt = -1;
            for (int i = 0; i < output.size(); i++) {
                long currentUpdatedAt = output.get(i).getProfile().getUpdatedAt();

                assertTrue(currentUpdatedAt > 0,
                        String.format("updated_at at index %d should be positive, got %d",
                                i, currentUpdatedAt));

                assertTrue(currentUpdatedAt >= previousUpdatedAt,
                        String.format("updated_at at index %d (%d) should be >= previous (%d)",
                                i, currentUpdatedAt, previousUpdatedAt));

                previousUpdatedAt = currentUpdatedAt;
            }
        } finally {
            harness.close();
        }
    }

    @Provide
    Arbitrary<Integer> eventCounts() {
        return Arbitraries.integers().between(2, 10);
    }

    private List<EnrichedEvent> extractOutput(
            KeyedOneInputStreamOperatorTestHarness<String, PrismEvent, EnrichedEvent> harness) {
        List<EnrichedEvent> result = new ArrayList<>();
        for (Object record : harness.getOutput()) {
            if (record instanceof StreamRecord) {
                @SuppressWarnings("unchecked")
                StreamRecord<EnrichedEvent> sr = (StreamRecord<EnrichedEvent>) record;
                result.add(sr.getValue());
            }
        }
        return result;
    }
}
