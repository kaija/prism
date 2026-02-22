package com.prism.functions;

import com.prism.config.AppConfig;
import com.prism.dsl.DslEngine;
import com.prism.dsl.DslResult;
import com.prism.dsl.MockDslEngine;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
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
 * Unit tests for ComputedAttributeFunction using Flink's KeyedOneInputStreamOperatorTestHarness
 * and MockDslEngine.
 */
class ComputedAttributeFunctionTest {

    private KeyedOneInputStreamOperatorTestHarness<String, EnrichedEvent, EnrichedEvent> harness;
    private MockDslEngine mockDslEngine;
    private AppConfig config;

    @BeforeEach
    void setUp() throws Exception {
        config = new AppConfig();
        config.setBackendApiUrl("http://localhost:8080");

        mockDslEngine = new MockDslEngine();

        ComputedAttributeFunction function = new ComputedAttributeFunction(mockDslEngine, config);
        harness = new KeyedOneInputStreamOperatorTestHarness<>(
                new KeyedProcessOperator<>(function),
                EnrichedEvent::getProfileId,
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

    private EnrichedEvent createEnrichedEvent(String profileId, String projectId, String eventName) {
        PrismEvent event = createEvent(profileId, projectId, eventName);
        ProfileState profile = new ProfileState(profileId, projectId,
                System.currentTimeMillis(), System.currentTimeMillis(), new HashMap<>());
        return new EnrichedEvent(event, profile);
    }

    @Test
    void processElement_passesThrough_whenNoComputedAttributes() throws Exception {
        // No attribute definitions loaded (BackendApiClient returns empty list by default)
        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "page_view");
        enriched.getEvent().getProps().put("existing_key", "existing_value");

        harness.processElement(new StreamRecord<>(enriched));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(1, output.size());
        assertEquals("existing_value", output.get(0).getEvent().getProps().get("existing_key"));
    }

    @Test
    void processElement_emitsEnrichedEvent_withCorrectEventAndProfile() throws Exception {
        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "purchase");
        enriched.getEvent().getProps().put("amount", 5999);

        harness.processElement(new StreamRecord<>(enriched));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(1, output.size());

        EnrichedEvent result = output.get(0);
        assertNotNull(result.getEvent());
        assertNotNull(result.getProfile());
        assertEquals("user1", result.getProfileId());
        assertEquals("proj1", result.getProjectId());
        assertEquals(5999, result.getEvent().getProps().get("amount"));
    }

    @Test
    void processElement_preservesExistingEventProps() throws Exception {
        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "click");
        enriched.getEvent().getProps().put("button", "submit");
        enriched.getEvent().getProps().put("page", "/checkout");

        harness.processElement(new StreamRecord<>(enriched));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(1, output.size());
        assertEquals("submit", output.get(0).getEvent().getProps().get("button"));
        assertEquals("/checkout", output.get(0).getEvent().getProps().get("page"));
    }

    @Test
    void processElement_preservesExistingProfileProps() throws Exception {
        EnrichedEvent enriched = createEnrichedEvent("user1", "proj1", "login");
        enriched.getProfile().getProps().put("login_count", 42);

        harness.processElement(new StreamRecord<>(enriched));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(1, output.size());
        assertEquals(42, output.get(0).getProfile().getProps().get("login_count"));
    }

    @Test
    void processElement_handlesDifferentProfiles_independently() throws Exception {
        EnrichedEvent enrichedA = createEnrichedEvent("userA", "proj1", "page_view");
        EnrichedEvent enrichedB = createEnrichedEvent("userB", "proj1", "page_view");

        harness.processElement(new StreamRecord<>(enrichedA));
        harness.processElement(new StreamRecord<>(enrichedB));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(2, output.size());
        assertEquals("userA", output.get(0).getProfileId());
        assertEquals("userB", output.get(1).getProfileId());
    }

    @Test
    void processElement_handlesMultipleEventsForSameProfile() throws Exception {
        EnrichedEvent enriched1 = createEnrichedEvent("user1", "proj1", "page_view");
        EnrichedEvent enriched2 = createEnrichedEvent("user1", "proj1", "click");

        harness.processElement(new StreamRecord<>(enriched1));
        harness.processElement(new StreamRecord<>(enriched2));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(2, output.size());
        assertEquals("page_view", output.get(0).getEvent().getEventName());
        assertEquals("click", output.get(1).getEvent().getEventName());
    }

    @Test
    void processElement_updatesProfileState_acrossEvents() throws Exception {
        // First event sets up profile
        EnrichedEvent enriched1 = createEnrichedEvent("user1", "proj1", "signup");
        enriched1.getProfile().getProps().put("plan", "free");

        harness.processElement(new StreamRecord<>(enriched1));

        // Second event for same profile
        EnrichedEvent enriched2 = createEnrichedEvent("user1", "proj1", "upgrade");
        enriched2.getProfile().getProps().put("plan", "premium");

        harness.processElement(new StreamRecord<>(enriched2));

        List<EnrichedEvent> output = extractOutput();
        assertEquals(2, output.size());
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
