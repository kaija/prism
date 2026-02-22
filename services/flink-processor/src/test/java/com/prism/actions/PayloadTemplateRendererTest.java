package com.prism.actions;

import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link PayloadTemplateRenderer}.
 */
class PayloadTemplateRendererTest {

    private EnrichedEvent createEnrichedEvent() {
        Map<String, Object> eventProps = new HashMap<>();
        eventProps.put("amount", 5999);
        eventProps.put("item", "widget");

        Map<String, Object> eventCtx = new HashMap<>();
        eventCtx.put("ip", "203.0.113.42");

        PrismEvent event = new PrismEvent(
                "evt_001", "proj_abc", "purchase",
                1700000000000L, 1700000001000L, "user_123",
                eventProps, eventCtx
        );

        Map<String, Object> profileProps = new HashMap<>();
        profileProps.put("login_count", 42);
        profileProps.put("name", "Alice");

        ProfileState profile = new ProfileState(
                "user_123", "proj_abc",
                1690000000000L, 1700000001000L,
                profileProps
        );

        return new EnrichedEvent(event, profile);
    }

    @Test
    void renderReplacesEventPlaceholders() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "User: {{event.profile_id}}, Event: {{event.event_name}}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("User: user_123, Event: purchase", result);
    }

    @Test
    void renderReplacesEventPropsPlaceholders() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "{\"amount\": \"{{event.props.amount}}\"}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("{\"amount\": \"5999\"}", result);
    }

    @Test
    void renderReplacesEventCtxPlaceholders() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "IP: {{event.ctx.ip}}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("IP: 203.0.113.42", result);
    }

    @Test
    void renderReplacesProfilePlaceholders() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "Profile: {{profile.profile_id}}, Logins: {{profile.props.login_count}}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("Profile: user_123, Logins: 42", result);
    }

    @Test
    void renderReplacesProfileTopLevelFields() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "Created: {{profile.created_at}}, Updated: {{profile.updated_at}}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("Created: 1690000000000, Updated: 1700000001000", result);
    }

    @Test
    void renderMissingPlaceholderReplacedWithEmptyString() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "Value: {{event.props.nonexistent}}!";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("Value: !", result);
    }

    @Test
    void renderNullTemplateReturnsEmptyJson() {
        EnrichedEvent enriched = createEnrichedEvent();
        assertEquals("{}", PayloadTemplateRenderer.render(null, enriched));
    }

    @Test
    void renderEmptyTemplateReturnsEmptyJson() {
        EnrichedEvent enriched = createEnrichedEvent();
        assertEquals("{}", PayloadTemplateRenderer.render("", enriched));
    }

    @Test
    void renderTemplateWithNoPlaceholdersReturnsUnchanged() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "Hello, world!";
        assertEquals("Hello, world!", PayloadTemplateRenderer.render(template, enriched));
    }

    @Test
    void renderEscapesJsonSpecialCharacters() {
        Map<String, Object> eventProps = new HashMap<>();
        eventProps.put("desc", "line1\nline2\ttab \"quoted\" back\\slash");

        PrismEvent event = new PrismEvent(
                "evt_002", "proj_abc", "test",
                1700000000000L, 1700000001000L, "user_456",
                eventProps, new HashMap<>()
        );
        ProfileState profile = new ProfileState("user_456", "proj_abc", 0L, 0L, new HashMap<>());
        EnrichedEvent enriched = new EnrichedEvent(event, profile);

        String template = "{\"desc\": \"{{event.props.desc}}\"}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("{\"desc\": \"line1\\nline2\\ttab \\\"quoted\\\" back\\\\slash\"}", result);
    }

    @Test
    void renderPlaceholderWithSpaces() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "User: {{ event.profile_id }}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("User: user_123", result);
    }

    @Test
    void renderMultiplePlaceholders() {
        EnrichedEvent enriched = createEnrichedEvent();
        String template = "{\"user\": \"{{event.profile_id}}\", \"event\": \"{{event.event_name}}\", \"amount\": {{event.props.amount}}}";
        String result = PayloadTemplateRenderer.render(template, enriched);
        assertEquals("{\"user\": \"user_123\", \"event\": \"purchase\", \"amount\": 5999}", result);
    }

    @Test
    void buildContextContainsAllEventTopLevelFields() {
        EnrichedEvent enriched = createEnrichedEvent();
        Map<String, Object> ctx = PayloadTemplateRenderer.buildContext(enriched);

        assertEquals("evt_001", ctx.get("event.event_id"));
        assertEquals("proj_abc", ctx.get("event.project_id"));
        assertEquals("purchase", ctx.get("event.event_name"));
        assertEquals(1700000000000L, ctx.get("event.cts"));
        assertEquals(1700000001000L, ctx.get("event.sts"));
        assertEquals("user_123", ctx.get("event.profile_id"));
    }

    @Test
    void buildContextContainsAllProfileTopLevelFields() {
        EnrichedEvent enriched = createEnrichedEvent();
        Map<String, Object> ctx = PayloadTemplateRenderer.buildContext(enriched);

        assertEquals("user_123", ctx.get("profile.profile_id"));
        assertEquals("proj_abc", ctx.get("profile.project_id"));
        assertEquals(1690000000000L, ctx.get("profile.created_at"));
        assertEquals(1700000001000L, ctx.get("profile.updated_at"));
    }

    @Test
    void buildContextWithNullEnrichedEventReturnsEmptyMap() {
        Map<String, Object> ctx = PayloadTemplateRenderer.buildContext(null);
        assertTrue(ctx.isEmpty());
    }

    @Test
    void resolveNestedKeyReturnsNullForMissingKey() {
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("event.event_id", "evt_001");
        assertNull(PayloadTemplateRenderer.resolveNestedKey("missing.key", ctx));
    }

    @Test
    void resolveNestedKeyReturnsNullForNullInputs() {
        assertNull(PayloadTemplateRenderer.resolveNestedKey(null, new HashMap<>()));
        assertNull(PayloadTemplateRenderer.resolveNestedKey("key", null));
    }

    @Test
    void escapeJsonHandlesAllSpecialCharacters() {
        assertEquals("\\\"", PayloadTemplateRenderer.escapeJson("\""));
        assertEquals("\\\\", PayloadTemplateRenderer.escapeJson("\\"));
        assertEquals("\\n", PayloadTemplateRenderer.escapeJson("\n"));
        assertEquals("\\r", PayloadTemplateRenderer.escapeJson("\r"));
        assertEquals("\\t", PayloadTemplateRenderer.escapeJson("\t"));
        assertEquals("\\b", PayloadTemplateRenderer.escapeJson("\b"));
        assertEquals("\\f", PayloadTemplateRenderer.escapeJson("\f"));
    }

    @Test
    void escapeJsonHandlesControlCharacters() {
        // Control character below 0x20 that isn't one of the named escapes
        String input = String.valueOf((char) 0x01);
        assertEquals("\\u0001", PayloadTemplateRenderer.escapeJson(input));
    }

    @Test
    void escapeJsonReturnsEmptyStringForNull() {
        assertEquals("", PayloadTemplateRenderer.escapeJson(null));
    }
}
