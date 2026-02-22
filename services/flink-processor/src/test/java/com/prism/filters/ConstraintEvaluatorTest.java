package com.prism.filters;

import com.prism.models.Condition;
import com.prism.models.ConstraintGroup;
import com.prism.models.ConstraintNode;
import com.prism.models.Logic;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ConstraintEvaluatorTest {

    // --- Helpers ---

    private Map<String, Object> contextWith(String key, Object value) {
        String[] segments = key.split("\\.");
        Map<String, Object> root = new HashMap<>();
        Map<String, Object> current = root;
        for (int i = 0; i < segments.length - 1; i++) {
            Map<String, Object> next = new HashMap<>();
            current.put(segments[i], next);
            current = next;
        }
        current.put(segments[segments.length - 1], value);
        return root;
    }

    private Map<String, Object> mergeContexts(Map<String, Object>... maps) {
        Map<String, Object> result = new HashMap<>();
        for (Map<String, Object> m : maps) {
            deepMerge(result, m);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private void deepMerge(Map<String, Object> target, Map<String, Object> source) {
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            if (entry.getValue() instanceof Map && target.get(entry.getKey()) instanceof Map) {
                deepMerge((Map<String, Object>) target.get(entry.getKey()),
                          (Map<String, Object>) entry.getValue());
            } else {
                target.put(entry.getKey(), entry.getValue());
            }
        }
    }

    // --- AND with all true ---

    @Test
    void and_allConditionsTrue_returnsTrue() {
        Condition c1 = new Condition("status", "is", "active");
        Condition c2 = new Condition("level", "is", "gold");
        ConstraintGroup group = new ConstraintGroup(Logic.AND, List.of(c1, c2));

        Map<String, Object> ctx = Map.of("status", "active", "level", "gold");
        assertTrue(ConstraintEvaluator.evaluate(group, ctx));
    }

    // --- AND with one false ---

    @Test
    void and_oneConditionFalse_returnsFalse() {
        Condition c1 = new Condition("status", "is", "active");
        Condition c2 = new Condition("level", "is", "gold");
        ConstraintGroup group = new ConstraintGroup(Logic.AND, List.of(c1, c2));

        Map<String, Object> ctx = Map.of("status", "active", "level", "silver");
        assertFalse(ConstraintEvaluator.evaluate(group, ctx));
    }

    // --- OR with one true ---

    @Test
    void or_oneConditionTrue_returnsTrue() {
        Condition c1 = new Condition("status", "is", "active");
        Condition c2 = new Condition("status", "is", "pending");
        ConstraintGroup group = new ConstraintGroup(Logic.OR, List.of(c1, c2));

        Map<String, Object> ctx = Map.of("status", "pending");
        assertTrue(ConstraintEvaluator.evaluate(group, ctx));
    }

    // --- OR with all false ---

    @Test
    void or_allConditionsFalse_returnsFalse() {
        Condition c1 = new Condition("status", "is", "active");
        Condition c2 = new Condition("status", "is", "pending");
        ConstraintGroup group = new ConstraintGroup(Logic.OR, List.of(c1, c2));

        Map<String, Object> ctx = Map.of("status", "inactive");
        assertFalse(ConstraintEvaluator.evaluate(group, ctx));
    }

    // --- Nested groups ---

    @Test
    void nestedGroups_andContainingOr_evaluatesCorrectly() {
        // AND( OR(status=active, status=pending), level=gold )
        Condition c1 = new Condition("status", "is", "active");
        Condition c2 = new Condition("status", "is", "pending");
        ConstraintGroup orGroup = new ConstraintGroup(Logic.OR, List.of(c1, c2));

        Condition c3 = new Condition("level", "is", "gold");
        ConstraintGroup andGroup = new ConstraintGroup(Logic.AND, List.of(orGroup, c3));

        Map<String, Object> ctx = Map.of("status", "pending", "level", "gold");
        assertTrue(ConstraintEvaluator.evaluate(andGroup, ctx));
    }

    @Test
    void nestedGroups_andContainingOr_failsWhenOuterFails() {
        // AND( OR(status=active, status=pending), level=gold )
        Condition c1 = new Condition("status", "is", "active");
        Condition c2 = new Condition("status", "is", "pending");
        ConstraintGroup orGroup = new ConstraintGroup(Logic.OR, List.of(c1, c2));

        Condition c3 = new Condition("level", "is", "gold");
        ConstraintGroup andGroup = new ConstraintGroup(Logic.AND, List.of(orGroup, c3));

        Map<String, Object> ctx = Map.of("status", "pending", "level", "silver");
        assertFalse(ConstraintEvaluator.evaluate(andGroup, ctx));
    }

    @Test
    void nestedGroups_orContainingAnd_evaluatesCorrectly() {
        // OR( AND(a=1, b=2), AND(c=3, d=4) )
        Condition c1 = new Condition("a", "is", "1");
        Condition c2 = new Condition("b", "is", "2");
        ConstraintGroup and1 = new ConstraintGroup(Logic.AND, List.of(c1, c2));

        Condition c3 = new Condition("c", "is", "3");
        Condition c4 = new Condition("d", "is", "4");
        ConstraintGroup and2 = new ConstraintGroup(Logic.AND, List.of(c3, c4));

        ConstraintGroup orGroup = new ConstraintGroup(Logic.OR, List.of(and1, and2));

        // First AND fails (b != 2), second AND succeeds
        Map<String, Object> ctx = Map.of("a", "1", "b", "X", "c", "3", "d", "4");
        assertTrue(ConstraintEvaluator.evaluate(orGroup, ctx));
    }

    // --- Empty groups ---

    @Test
    void emptyAndGroup_returnsTrue() {
        ConstraintGroup group = new ConstraintGroup(Logic.AND, List.of());
        assertTrue(ConstraintEvaluator.evaluate(group, Map.of()));
    }

    @Test
    void emptyOrGroup_returnsFalse() {
        ConstraintGroup group = new ConstraintGroup(Logic.OR, List.of());
        assertFalse(ConstraintEvaluator.evaluate(group, Map.of()));
    }

    // --- Dotted path attributes ---

    @Test
    void dottedPath_resolvesNestedAttribute() {
        Condition c = new Condition("event.props.amount", "larger", "100");
        ConstraintGroup group = new ConstraintGroup(Logic.AND, List.of(c));

        Map<String, Object> ctx = contextWith("event.props.amount", 200);
        assertTrue(ConstraintEvaluator.evaluate(group, ctx));
    }

    // --- Missing attribute ---

    @Test
    void missingAttribute_conditionReturnsFalse() {
        Condition c = new Condition("missing.attr", "is", "value");
        ConstraintGroup group = new ConstraintGroup(Logic.AND, List.of(c));

        assertFalse(ConstraintEvaluator.evaluate(group, Map.of()));
    }
}
