package com.prism.functions;

import com.prism.config.AppConfig;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.runtime.streamrecord.StreamRecord;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 18: New profile creation with correct defaults
// Validates: Requirements 15.3
class EventEnrichNewProfilePropertyTest {

    private static final long REASONABLE_WINDOW_MS = 5000; // 5 seconds

    @Property(tries = 100)
    void newProfileCreatedWithCorrectDefaults(
            @ForAll("profileIds") String profileId,
            @ForAll("projectIds") String projectId) throws Exception {

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

            long beforeProcessing = System.currentTimeMillis();

            PrismEvent event = new PrismEvent(
                    "evt_" + System.nanoTime(),
                    projectId,
                    "test_event",
                    System.currentTimeMillis(),
                    System.currentTimeMillis(),
                    profileId,
                    new HashMap<>(),
                    new HashMap<>()
            );

            harness.processElement(new StreamRecord<>(event));

            long afterProcessing = System.currentTimeMillis();

            List<EnrichedEvent> output = extractOutput(harness);
            assertEquals(1, output.size(), "Should emit exactly one enriched event");

            EnrichedEvent enriched = output.get(0);
            ProfileState profile = enriched.getProfile();
            assertNotNull(profile, "Profile should not be null");

            // Property: profile_id matches the event's profile_id
            assertEquals(profileId, profile.getProfileId(),
                    "Profile profile_id should match the event's profile_id");

            // Property: project_id matches the event's project_id
            assertEquals(projectId, profile.getProjectId(),
                    "Profile project_id should match the event's project_id");

            // Property: created_at is within a reasonable window of processing time
            assertTrue(profile.getCreatedAt() >= beforeProcessing - REASONABLE_WINDOW_MS,
                    String.format("created_at (%d) should be >= beforeProcessing - window (%d)",
                            profile.getCreatedAt(), beforeProcessing - REASONABLE_WINDOW_MS));
            assertTrue(profile.getCreatedAt() <= afterProcessing + REASONABLE_WINDOW_MS,
                    String.format("created_at (%d) should be <= afterProcessing + window (%d)",
                            profile.getCreatedAt(), afterProcessing + REASONABLE_WINDOW_MS));

            // Property: props is an empty map
            assertNotNull(profile.getProps(), "Profile props should not be null");
            assertTrue(profile.getProps().isEmpty(),
                    "Profile props should be an empty map for a new profile");

        } finally {
            harness.close();
        }
    }

    @Provide
    Arbitrary<String> profileIds() {
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars('_', '-')
                .ofMinLength(1)
                .ofMaxLength(50)
                .map(s -> "profile_" + s);
    }

    @Provide
    Arbitrary<String> projectIds() {
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars('_', '-')
                .ofMinLength(1)
                .ofMaxLength(30)
                .map(s -> "proj_" + s);
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
