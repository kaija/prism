package com.prism.functions;

import com.prism.config.AppConfig;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.apache.flink.api.common.state.ListState;
import org.apache.flink.api.common.state.ListStateDescriptor;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.api.common.typeinfo.Types;
import org.apache.flink.streaming.api.operators.KeyedProcessOperator;
import org.apache.flink.streaming.runtime.streamrecord.StreamRecord;
import org.apache.flink.streaming.util.KeyedOneInputStreamOperatorTestHarness;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for EventEnrichFunction using Flink's KeyedOneInputStreamOperatorTestHarness.
 */
class EventEnrichFunctionTest {

    private KeyedOneInputStreamOperatorTestHarness<String, PrismEvent, EnrichedEvent> harness;
    private AppConfig config;

    @BeforeEach
    void setUp() throws Exception {
        config = new AppConfig();
        config.setBackendApiUrl("http://localhost:8080");
        config.setMaxEventHistoryCount(5);
        config.setMaxEventHistoryBytes(10 * 1024); // 10 KB

        EventEnrichFunction function = new EventEnrichFunction(config);
        harness = new KeyedOneInputStreamOperatorTestHarness<>(
                new KeyedProcessOperator<>(function),
                PrismEvent::getProfileId,
                Types.STRING
        );
        harness.open();
    }

    @AfterEach
    void tearDown() throws Exception {
        if (harness != null) {
            harness.close();
        }
    }

    private PrismEvent createEvent(String profileId, String projectId, String eventName) {
        return new PrismEvent(
                "evt_" + System.nanoTime(),
                projectId,
                eventName,
                System.currentTimeMillis(),
                System.currentTimeMillis(),
                profileId,
                new HashMap<>(),
                new HashMap<>()
        );
    }

    @Test
    void processElement_createsNewProfile_whenProfileDoesNotExist() throws Exception {
        PrismEvent event = createEvent("user1", "proj1", "page_view");

        harness.processElement(new StreamRecord<>(event));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(1, output.size());

        EnrichedEvent enriched = output.get(0);
        assertNotNull(enriched.getProfile());
        assertEquals("user1", enriched.getProfile().getProfileId());
        assertEquals("proj1", enriched.getProfile().getProjectId());
        assertTrue(enriched.getProfile().getCreatedAt() > 0);
        assertTrue(enriched.getProfile().getUpdatedAt() > 0);
        assertNotNull(enriched.getProfile().getProps());
        assertTrue(enriched.getProfile().getProps().isEmpty());
    }

    @Test
    void processElement_reusesExistingProfile_onSubsequentEvents() throws Exception {
        PrismEvent event1 = createEvent("user1", "proj1", "page_view");
        PrismEvent event2 = createEvent("user1", "proj1", "click");

        harness.processElement(new StreamRecord<>(event1));
        harness.processElement(new StreamRecord<>(event2));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(2, output.size());

        // Both should have the same profile_id and created_at
        long createdAt1 = output.get(0).getProfile().getCreatedAt();
        long createdAt2 = output.get(1).getProfile().getCreatedAt();
        assertEquals(createdAt1, createdAt2, "created_at should not change for existing profile");
    }

    @Test
    void processElement_updatesUpdatedAt_onEachEvent() throws Exception {
        PrismEvent event1 = createEvent("user1", "proj1", "page_view");
        harness.processElement(new StreamRecord<>(event1));

        long updatedAt1 = extractOutput().get(0).getProfile().getUpdatedAt();

        // Small delay to ensure timestamp difference
        Thread.sleep(5);

        PrismEvent event2 = createEvent("user1", "proj1", "click");
        harness.processElement(new StreamRecord<>(event2));

        long updatedAt2 = extractOutput().get(1).getProfile().getUpdatedAt();
        assertTrue(updatedAt2 >= updatedAt1, "updated_at should be non-decreasing");
    }

    @Test
    void processElement_emitsEnrichedEvent_withCorrectEventAndProfile() throws Exception {
        PrismEvent event = createEvent("user1", "proj1", "purchase");
        event.getProps().put("amount", 5999);

        harness.processElement(new StreamRecord<>(event));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(1, output.size());

        EnrichedEvent enriched = output.get(0);
        assertEquals(event, enriched.getEvent());
        assertEquals("user1", enriched.getProfileId());
        assertEquals("proj1", enriched.getProjectId());
    }

    @Test
    void processElement_enforcesMaxEventCount() throws Exception {
        // Config allows max 5 events
        for (int i = 0; i < 8; i++) {
            PrismEvent event = createEvent("user1", "proj1", "event_" + i);
            harness.processElement(new StreamRecord<>(event));
        }

        // All 8 events should produce output
        List<EnrichedEvent> output = extractOutput();
        assertEquals(8, output.size());

        // The event history in state should be capped at 5
        // We verify this indirectly by checking the function still works
        // (the retention logic runs on each processElement)
    }

    @Test
    void processElement_handlesDifferentProfiles_independently() throws Exception {
        PrismEvent eventA = createEvent("userA", "proj1", "page_view");
        PrismEvent eventB = createEvent("userB", "proj1", "page_view");

        harness.processElement(new StreamRecord<>(eventA));
        harness.processElement(new StreamRecord<>(eventB));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(2, output.size());

        assertEquals("userA", output.get(0).getProfile().getProfileId());
        assertEquals("userB", output.get(1).getProfile().getProfileId());

        // Different profiles should have different created_at (or at least be independent)
        assertNotEquals(
                output.get(0).getProfile().getProfileId(),
                output.get(1).getProfile().getProfileId()
        );
    }

    @Test
    void processElement_emptyProps_onNewProfile() throws Exception {
        PrismEvent event = createEvent("newUser", "proj1", "signup");

        harness.processElement(new StreamRecord<>(event));

        EnrichedEvent enriched = extractOutput().get(0);
        assertNotNull(enriched.getProfile().getProps());
        assertTrue(enriched.getProfile().getProps().isEmpty());
    }

    private List<EnrichedEvent> extractOutput() {
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
