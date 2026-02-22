package com.prism.actions;

import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;
import net.jqwik.api.Tuple;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 13: Payload template rendering resolves all placeholders
// Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
class PayloadTemplateRendererPropertyTest {

    private static final Pattern UNRESOLVED_PLACEHOLDER = Pattern.compile("\\{\\{\\s*[\\w.]+\\s*\\}\\}");

    /**
     * Property 13: Payload template rendering resolves all placeholders
     *
     * For any payload template string containing {{key}} placeholders and any
     * EnrichedEvent context, the PayloadTemplateRenderer SHALL replace every
     * placeholder with the corresponding attribute value from the context
     * (or empty string if missing), and the output SHALL contain no unresolved
     * {{...}} placeholders.
     *
     * **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**
     */
    @Property(tries = 100)
    void allPlaceholdersResolvedAfterRendering(
            @ForAll("templatesWithContext") TemplateWithContext input) {

        String rendered = PayloadTemplateRenderer.render(input.template(), input.enriched());

        // 1. No unresolved {{...}} placeholders remain
        Matcher matcher = UNRESOLVED_PLACEHOLDER.matcher(rendered);
        assertFalse(matcher.find(),
                String.format("Unresolved placeholder found in output: '%s' from template: '%s'",
                        rendered, input.template()));

        // 2. When a key exists in the context, its value appears in the output
        Map<String, Object> context = PayloadTemplateRenderer.buildContext(input.enriched());
        for (String key : input.usedKeys()) {
            Object value = context.get(key);
            if (value != null) {
                String escaped = PayloadTemplateRenderer.escapeJson(value.toString());
                assertTrue(rendered.contains(escaped),
                        String.format("Expected rendered output to contain '%s' for key '%s', but got: '%s'",
                                escaped, key, rendered));
            }
        }
    }

    // --- Data holder ---

    record TemplateWithContext(
            String template,
            EnrichedEvent enriched,
            Set<String> usedKeys
    ) {}

    // --- Arbitrary providers ---

    @Provide
    Arbitrary<TemplateWithContext> templatesWithContext() {
        return enrichedEvents().flatMap(enriched -> {
            Map<String, Object> context = PayloadTemplateRenderer.buildContext(enriched);
            List<String> availableKeys = new ArrayList<>(context.keySet());

            // Generate a template mixing known keys, unknown keys, and literal text
            return Arbitraries.integers().between(1, 6).flatMap(placeholderCount -> {
                List<Arbitrary<Tuple.Tuple2<String, String>>> segmentArbs = new ArrayList<>();

                for (int i = 0; i < placeholderCount; i++) {
                    segmentArbs.add(generateSegment(availableKeys));
                }

                return combineArbitraries(segmentArbs).map(segments -> {
                    StringBuilder template = new StringBuilder();
                    Set<String> usedKeys = new HashSet<>();

                    for (Tuple.Tuple2<String, String> seg : segments) {
                        template.append("text_").append(template.length()).append(" ");
                        template.append("{{").append(seg.get1()).append("}}");
                        usedKeys.add(seg.get1());
                    }
                    template.append(" end");

                    return new TemplateWithContext(template.toString(), enriched, usedKeys);
                });
            });
        });
    }

    /**
     * Generates a segment: a tuple of (key, category) where key is either
     * a known context key or a random unknown key.
     */
    private Arbitrary<Tuple.Tuple2<String, String>> generateSegment(List<String> availableKeys) {
        if (availableKeys.isEmpty()) {
            return unknownKey().map(k -> Tuple.of(k, "unknown"));
        }
        return Arbitraries.frequencyOf(
                Tuple.of(3, Arbitraries.of(availableKeys).map(k -> Tuple.of(k, "known"))),
                Tuple.of(1, unknownKey().map(k -> Tuple.of(k, "unknown")))
        );
    }

    private Arbitrary<String> unknownKey() {
        return Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(8)
                .map(s -> "missing." + s.toLowerCase());
    }

    /**
     * Generates random EnrichedEvent objects with varied props and ctx maps.
     */
    private Arbitrary<EnrichedEvent> enrichedEvents() {
        return Combinators.combine(
                prismEvents(),
                profileStates()
        ).as(EnrichedEvent::new);
    }

    private Arbitrary<PrismEvent> prismEvents() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(10);
        Arbitrary<Long> timestamps = Arbitraries.longs().between(1_000_000_000_000L, 2_000_000_000_000L);
        Arbitrary<Map<String, Object>> propMaps = stringObjectMaps();
        Arbitrary<Map<String, Object>> ctxMaps = stringObjectMaps();

        return Combinators.combine(ids, ids, ids, timestamps, timestamps, ids, propMaps, ctxMaps)
                .as((eventId, projectId, eventName, cts, sts, profileId, props, ctx) ->
                        new PrismEvent(eventId, projectId, eventName, cts, sts, profileId, props, ctx));
    }

    private Arbitrary<ProfileState> profileStates() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(10);
        Arbitrary<Long> timestamps = Arbitraries.longs().between(1_000_000_000_000L, 2_000_000_000_000L);
        Arbitrary<Map<String, Object>> propMaps = stringObjectMaps();

        return Combinators.combine(ids, ids, timestamps, timestamps, propMaps)
                .as(ProfileState::new);
    }

    /**
     * Generates small maps with alphanumeric keys and simple values (strings, numbers).
     * Values avoid containing {{ to prevent false positives in placeholder detection.
     */
    private Arbitrary<Map<String, Object>> stringObjectMaps() {
        Arbitrary<String> keys = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(8)
                .map(String::toLowerCase);
        Arbitrary<Object> values = Arbitraries.oneOf(
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(15).map(s -> (Object) s),
                Arbitraries.integers().between(0, 100_000).map(i -> (Object) i),
                Arbitraries.of(true, false).map(b -> (Object) b)
        );

        return Arbitraries.maps(keys, values).ofMinSize(0).ofMaxSize(4);
    }

    private <T> Arbitrary<List<T>> combineArbitraries(List<Arbitrary<T>> arbs) {
        Arbitrary<List<T>> result = Arbitraries.just(new ArrayList<>());
        for (Arbitrary<T> arb : arbs) {
            result = result.flatMap(list ->
                    arb.map(item -> {
                        List<T> newList = new ArrayList<>(list);
                        newList.add(item);
                        return newList;
                    })
            );
        }
        return result;
    }
}
