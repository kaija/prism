package com.prism.filters;

import com.prism.models.Condition;
import com.prism.models.ConstraintGroup;
import com.prism.models.ConstraintNode;
import com.prism.models.Logic;
import net.jqwik.api.*;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 11: Constraint tree evaluation correctness
// Validates: Requirements 10.1, 10.2, 10.3, 10.4
class ConstraintEvaluatorPropertyTest {

    /**
     * Pairs a constraint tree node with its independently computed expected boolean result.
     */
    private record TreeWithExpected(
            ConstraintGroup root,
            boolean expectedResult,
            Map<String, Object> context
    ) {}

    /**
     * Property 11: Constraint tree evaluation correctness
     *
     * For any tree of ConstraintGroups (AND/OR) with leaf Conditions, the
     * ConstraintEvaluator SHALL return true if and only if the boolean algebra
     * of the tree evaluates to true (AND = all children true, OR = at least one
     * child true), applied recursively for nested groups.
     *
     * Validates: Requirements 10.1, 10.2, 10.3, 10.4
     */
    @Property(tries = 100)
    void constraintTreeEvaluationMatchesBooleanAlgebra(
            @ForAll("constraintTrees") TreeWithExpected tree) {

        boolean actual = ConstraintEvaluator.evaluate(tree.root(), tree.context());

        assertEquals(tree.expectedResult(), actual,
                String.format("Tree root logic=%s, children=%d: expected %s but got %s",
                        tree.root().logic(), tree.root().nodes().size(),
                        tree.expectedResult(), actual));
    }

    // --- Arbitrary provider ---

    @Provide
    Arbitrary<TreeWithExpected> constraintTrees() {
        return Arbitraries.of(Logic.AND, Logic.OR).flatMap(rootLogic ->
                Arbitraries.integers().between(1, 5).flatMap(childCount ->
                        Arbitraries.integers().between(0, 2).flatMap(maxNestingDepth ->
                                generateTree(rootLogic, childCount, maxNestingDepth)
                        )
                )
        );
    }

    /**
     * Generates a complete constraint tree with a known expected result and
     * a context map that makes each leaf evaluate to its predetermined value.
     */
    private Arbitrary<TreeWithExpected> generateTree(Logic rootLogic, int childCount, int maxDepth) {
        // Generate a list of booleans representing each leaf's desired outcome,
        // plus structure decisions for nesting
        return generateNodeList(childCount, maxDepth, 0).map(nodes -> {
            AtomicInteger leafId = new AtomicInteger(0);
            Map<String, Object> context = new HashMap<>();

            List<ConstraintNode> constraintNodes = new ArrayList<>();
            List<Boolean> expectedValues = new ArrayList<>();

            for (NodeSpec spec : nodes) {
                ConstraintNode node = buildNode(spec, leafId, context);
                constraintNodes.add(node);
                expectedValues.add(spec.expectedResult());
            }

            boolean expected;
            if (rootLogic == Logic.AND) {
                expected = expectedValues.stream().allMatch(b -> b);
            } else {
                expected = expectedValues.stream().anyMatch(b -> b);
            }

            ConstraintGroup root = new ConstraintGroup(rootLogic, constraintNodes);
            return new TreeWithExpected(root, expected, context);
        });
    }

    /**
     * Specification for a node in the tree, before it's turned into actual model objects.
     */
    private sealed interface NodeSpec {
        boolean expectedResult();
    }

    private record LeafSpec(boolean expectedResult) implements NodeSpec {}

    private record GroupSpec(Logic logic, List<NodeSpec> children) implements NodeSpec {
        public boolean expectedResult() {
            if (logic == Logic.AND) {
                return children.stream().allMatch(NodeSpec::expectedResult);
            } else {
                return children.stream().anyMatch(NodeSpec::expectedResult);
            }
        }
    }

    /**
     * Generates a list of NodeSpec (leaf or nested group) for a given level.
     */
    private Arbitrary<List<NodeSpec>> generateNodeList(int count, int maxDepth, int currentDepth) {
        List<Arbitrary<NodeSpec>> nodeArbs = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            if (currentDepth < maxDepth) {
                // Mix leaves and nested groups
                nodeArbs.add(
                        Arbitraries.frequencyOf(
                                Tuple.of(3, generateLeafSpec()),
                                Tuple.of(2, generateGroupSpec(maxDepth, currentDepth + 1))
                        )
                );
            } else {
                nodeArbs.add(generateLeafSpec());
            }
        }
        return combineArbitraries(nodeArbs);
    }

    private Arbitrary<NodeSpec> generateLeafSpec() {
        return Arbitraries.of(true, false).map(b -> (NodeSpec) new LeafSpec(b));
    }

    private Arbitrary<NodeSpec> generateGroupSpec(int maxDepth, int currentDepth) {
        return Arbitraries.of(Logic.AND, Logic.OR).flatMap(logic ->
                Arbitraries.integers().between(1, 3).flatMap(childCount ->
                        generateNodeList(childCount, maxDepth, currentDepth)
                                .map(children -> (NodeSpec) new GroupSpec(logic, children))
                )
        );
    }

    /**
     * Builds a ConstraintNode from a NodeSpec, assigning unique leaf attribute
     * names and populating the context map.
     */
    private ConstraintNode buildNode(NodeSpec spec, AtomicInteger leafId, Map<String, Object> context) {
        if (spec instanceof LeafSpec leaf) {
            int id = leafId.getAndIncrement();
            String attrKey = "leaf_" + id;
            // All leaves use operator "is" with value "match".
            // True leaves: context[attrKey] = "match" -> "is" returns true
            // False leaves: context[attrKey] = "no_match" -> "is" returns false
            context.put(attrKey, leaf.expectedResult() ? "match" : "no_match");
            return new Condition(attrKey, "is", "match");
        } else if (spec instanceof GroupSpec group) {
            List<ConstraintNode> children = new ArrayList<>();
            for (NodeSpec child : group.children()) {
                children.add(buildNode(child, leafId, context));
            }
            return new ConstraintGroup(group.logic(), children);
        }
        throw new IllegalStateException("Unknown NodeSpec type");
    }

    /**
     * Combines a list of Arbitrary values into an Arbitrary of a list.
     */
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
