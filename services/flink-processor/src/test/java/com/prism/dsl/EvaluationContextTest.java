package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link EvaluationContext}.
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */
class EvaluationContextTest {

    // ---- resolveFieldRef: EVENT ----

    @Test
    void resolveFieldRef_event_returnsValueFromEventProps() {
        EvaluationContext ctx = EvaluationContext.builder()
                .eventProps(Map.of("color", "blue", "count", 42))
                .build();

        assertEquals("blue", ctx.resolveFieldRef("EVENT", "color"));
        assertEquals(42, ctx.resolveFieldRef("EVENT", "count"));
    }

    @Test
    void resolveFieldRef_event_returnsNullForMissingField() {
        EvaluationContext ctx = EvaluationContext.builder()
                .eventProps(Map.of("color", "blue"))
                .build();

        assertNull(ctx.resolveFieldRef("EVENT", "nonexistent"));
    }

    // ---- resolveFieldRef: PROFILE ----

    @Test
    void resolveFieldRef_profile_returnsValueFromProfileProps() {
        EvaluationContext ctx = EvaluationContext.builder()
                .profileProps(Map.of("name", "Alice", "age", 30))
                .build();

        assertEquals("Alice", ctx.resolveFieldRef("PROFILE", "name"));
        assertEquals(30, ctx.resolveFieldRef("PROFILE", "age"));
    }

    @Test
    void resolveFieldRef_profile_returnsNullForMissingField() {
        EvaluationContext ctx = EvaluationContext.builder()
                .profileProps(Map.of("name", "Alice"))
                .build();

        assertNull(ctx.resolveFieldRef("PROFILE", "nonexistent"));
    }

    // ---- resolveFieldRef: PARAM ----

    @Test
    void resolveFieldRef_param_returnsValueFromParams() {
        EvaluationContext ctx = EvaluationContext.builder()
                .params(Map.of("threshold", 100, "label", "high"))
                .build();

        assertEquals(100, ctx.resolveFieldRef("PARAM", "threshold"));
        assertEquals("high", ctx.resolveFieldRef("PARAM", "label"));
    }

    @Test
    void resolveFieldRef_param_returnsNullForMissingField() {
        EvaluationContext ctx = EvaluationContext.builder()
                .params(Map.of("threshold", 100))
                .build();

        assertNull(ctx.resolveFieldRef("PARAM", "nonexistent"));
    }

    // ---- resolveFieldRef: unknown source ----

    @Test
    void resolveFieldRef_unknownSource_returnsNull() {
        EvaluationContext ctx = EvaluationContext.builder()
                .eventProps(Map.of("x", 1))
                .build();

        assertNull(ctx.resolveFieldRef("UNKNOWN", "x"));
    }

    // ---- resolveFieldRef: empty maps ----

    @Test
    void resolveFieldRef_emptyContext_returnsNull() {
        EvaluationContext ctx = EvaluationContext.builder().build();

        assertNull(ctx.resolveFieldRef("EVENT", "anything"));
        assertNull(ctx.resolveFieldRef("PROFILE", "anything"));
        assertNull(ctx.resolveFieldRef("PARAM", "anything"));
    }

    // ---- builder defaults ----

    @Test
    void builder_defaults_producesEmptyMapsAndZeroTimestamps() {
        EvaluationContext ctx = EvaluationContext.builder().build();

        assertTrue(ctx.getEventProps().isEmpty());
        assertTrue(ctx.getProfileProps().isEmpty());
        assertTrue(ctx.getParams().isEmpty());
        assertTrue(ctx.getEventHistory().isEmpty());
        assertEquals(0L, ctx.getEventTimestamp());
        assertEquals(0L, ctx.getProcessingTime());
    }

    // ---- forEvent factory ----

    @Test
    void forEvent_buildsContextFromPrismEvent() {
        PrismEvent event = new PrismEvent(
                "e1", "p1", "click", 1700000000L, null, "u1",
                Map.of("page", "/home", "duration", 5), null);

        EvaluationContext ctx = EvaluationContext.forEvent(event);

        assertEquals("/home", ctx.resolveFieldRef("EVENT", "page"));
        assertEquals(5, ctx.resolveFieldRef("EVENT", "duration"));
        assertEquals(1700000000L, ctx.getEventTimestamp());
        assertTrue(ctx.getProfileProps().isEmpty());
        assertTrue(ctx.getEventHistory().isEmpty());
    }

    @Test
    void forEvent_handlesNullCts() {
        PrismEvent event = new PrismEvent();
        event.setEventName("test");

        EvaluationContext ctx = EvaluationContext.forEvent(event);

        assertEquals(0L, ctx.getEventTimestamp());
    }

    // ---- forFull factory ----

    @Test
    void forFull_buildsContextWithAllData() {
        PrismEvent event = new PrismEvent(
                "e1", "p1", "purchase", 1700000000L, null, "u1",
                Map.of("amount", 99.99), null);
        ProfileState profile = new ProfileState(
                "u1", "p1", 1600000000L, 1700000000L,
                Map.of("tier", "gold", "total_spent", 500.0));
        PrismEvent historyEvent = new PrismEvent(
                "e0", "p1", "view", 1699999000L, null, "u1",
                Map.of("page", "/product"), null);

        EvaluationContext ctx = EvaluationContext.forFull(event, profile, List.of(historyEvent));

        assertEquals(99.99, ctx.resolveFieldRef("EVENT", "amount"));
        assertEquals("gold", ctx.resolveFieldRef("PROFILE", "tier"));
        assertEquals(1700000000L, ctx.getEventTimestamp());
        assertEquals(1, ctx.getEventHistory().size());
        assertTrue(ctx.getProcessingTime() > 0);
    }

    @Test
    void forFull_handlesNullProfile() {
        PrismEvent event = new PrismEvent();
        event.setEventName("test");

        EvaluationContext ctx = EvaluationContext.forFull(event, null, List.of());

        assertTrue(ctx.getProfileProps().isEmpty());
    }

    // ---- toEnvironmentMap ----

    @Test
    void toEnvironmentMap_containsAllExpectedKeys() {
        PrismEvent historyEvent = new PrismEvent(
                "e0", "p1", "view", 5000L, null, "u1",
                Map.of("page", "/about"), null);

        EvaluationContext ctx = EvaluationContext.builder()
                .eventProps(Map.of("color", "red"))
                .profileProps(Map.of("name", "Bob"))
                .params(Map.of("limit", 10))
                .eventHistory(List.of(historyEvent))
                .eventTimestamp(1000L)
                .processingTime(2000L)
                .build();

        Map<String, Object> env = ctx.toEnvironmentMap();

        assertEquals(Map.of("color", "red"), env.get("event_props"));
        assertEquals(Map.of("name", "Bob"), env.get("profile_props"));
        assertEquals(Map.of("limit", 10), env.get("params"));
        assertEquals(1000L, env.get("event_timestamp"));
        assertEquals(2000L, env.get("processing_time"));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> history = (List<Map<String, Object>>) env.get("event_history");
        assertEquals(1, history.size());
        assertEquals("/about", ((Map<?, ?>) history.get(0).get("props")).get("page"));
        assertEquals(5000L, history.get(0).get("cts"));
        assertEquals("view", history.get(0).get("event_name"));
    }

    @Test
    void toEnvironmentMap_emptyContext_producesEmptyCollections() {
        EvaluationContext ctx = EvaluationContext.builder().build();
        Map<String, Object> env = ctx.toEnvironmentMap();

        assertEquals(Map.of(), env.get("event_props"));
        assertEquals(Map.of(), env.get("profile_props"));
        assertEquals(Map.of(), env.get("params"));
        assertEquals(0L, env.get("event_timestamp"));
        assertEquals(0L, env.get("processing_time"));
        assertEquals(List.of(), env.get("event_history"));
    }

    // ---- immutability ----

    @Test
    void contextMaps_areImmutable() {
        EvaluationContext ctx = EvaluationContext.builder()
                .eventProps(Map.of("a", 1))
                .profileProps(Map.of("b", 2))
                .params(Map.of("c", 3))
                .eventHistory(List.of())
                .build();

        assertThrows(UnsupportedOperationException.class,
                () -> ctx.getEventProps().put("x", 0));
        assertThrows(UnsupportedOperationException.class,
                () -> ctx.getProfileProps().put("x", 0));
        assertThrows(UnsupportedOperationException.class,
                () -> ctx.getParams().put("x", 0));
        assertThrows(UnsupportedOperationException.class,
                () -> ctx.getEventHistory().add(new PrismEvent()));
    }
}
