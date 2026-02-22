package com.prism.dsl;

import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import net.jqwik.api.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 6: MockDslEngine returns configured results
// Validates: Requirements 6.2
class MockDslEnginePropertyTest {

    /**
     * For any formula/value pair configured via setResult(), all three evaluate
     * methods return DslResult.ok(value).
     */
    @Property(tries = 100)
    void configuredFormulaReturnsConfiguredValue(
            @ForAll("formulas") String formula,
            @ForAll("resultValues") Object value) {

        MockDslEngine engine = new MockDslEngine();
        engine.setResult(formula, value);

        PrismEvent event = simpleEvent();
        ProfileState profile = simpleProfile();
        List<PrismEvent> history = Collections.emptyList();

        DslResult eventResult = engine.evaluateEventComputed(formula, event);
        DslResult profileResult = engine.evaluateProfileComputed(formula, event, profile, history);
        DslResult triggerResult = engine.evaluateTriggerRule(formula, event, profile, history);

        for (DslResult result : List.of(eventResult, profileResult, triggerResult)) {
            assertTrue(result.success(), "Result should be successful");
            assertEquals(value, result.value(), "Result value should match configured value");
            assertNull(result.errorMessage(), "Error message should be null on success");
        }
    }

    /**
     * For any unconfigured formula, all three evaluate methods return DslResult.ok(true).
     */
    @Property(tries = 100)
    void unconfiguredFormulaReturnsDefaultTrue(
            @ForAll("formulas") String formula) {

        MockDslEngine engine = new MockDslEngine();
        // Do NOT configure any result for this formula

        PrismEvent event = simpleEvent();
        ProfileState profile = simpleProfile();
        List<PrismEvent> history = Collections.emptyList();

        DslResult eventResult = engine.evaluateEventComputed(formula, event);
        DslResult profileResult = engine.evaluateProfileComputed(formula, event, profile, history);
        DslResult triggerResult = engine.evaluateTriggerRule(formula, event, profile, history);

        for (DslResult result : List.of(eventResult, profileResult, triggerResult)) {
            assertTrue(result.success(), "Default result should be successful");
            assertEquals(true, result.value(), "Default result value should be true");
            assertNull(result.errorMessage(), "Error message should be null on success");
        }
    }

    @Provide
    Arbitrary<String> formulas() {
        return Arbitraries.strings().alpha().numeric()
                .withChars('_', '.', '(', ')', '+', '-', '*', '/')
                .ofMinLength(1).ofMaxLength(50);
    }

    @Provide
    Arbitrary<Object> resultValues() {
        return Arbitraries.oneOf(
                Arbitraries.strings().alpha().ofMaxLength(20).map(s -> (Object) s),
                Arbitraries.integers().between(-10000, 10000).map(i -> (Object) i),
                Arbitraries.doubles().between(-1000.0, 1000.0).map(d -> (Object) d),
                Arbitraries.of(true, false).map(b -> (Object) b)
        );
    }

    private static PrismEvent simpleEvent() {
        return new PrismEvent("evt1", "proj1", "test_event",
                System.currentTimeMillis(), System.currentTimeMillis(),
                "profile1", new HashMap<>(), new HashMap<>());
    }

    private static ProfileState simpleProfile() {
        return new ProfileState("profile1", "proj1",
                System.currentTimeMillis(), System.currentTimeMillis(),
                new HashMap<>());
    }
}
