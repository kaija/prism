package com.prism.dsl.functions;

import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.AviatorEvaluatorInstance;
import com.googlecode.aviator.runtime.type.AviatorNil;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for custom AviatorScript DSL functions.
 * Tests are executed by registering functions with an AviatorScript evaluator
 * and evaluating expressions against a prepared environment.
 */
class DslFunctionsTest {

    private static AviatorEvaluatorInstance aviator;

    @BeforeAll
    static void setup() {
        aviator = AviatorEvaluator.newInstance();
        // Register all custom functions
        aviator.addFunction(new DivideFunction());
        aviator.addFunction(new CountFunction());
        aviator.addFunction(new SumFunction());
        aviator.addFunction(new AvgFunction());
        aviator.addFunction(new MinFunction());
        aviator.addFunction(new MaxFunction());
        aviator.addFunction(new UniqueFunction());
        aviator.addFunction(new TopFunction());
        aviator.addFunction(new ContainsFunction());
        aviator.addFunction(new StartsWithFunction());
        aviator.addFunction(new EndsWithFunction());
        aviator.addFunction(new UpperFunction());
        aviator.addFunction(new LowerFunction());
        aviator.addFunction(new TrimFunction());
        aviator.addFunction(new LengthFunction());
        aviator.addFunction(new SubstringFunction());
        aviator.addFunction(new ReplaceFunction());
        aviator.addFunction(new ConcatFunction());
        aviator.addFunction(new SplitFunction());
        aviator.addFunction(new RegexMatchFunction());
        aviator.addFunction(new ToNumberFunction());
        aviator.addFunction(new ToStringFunction());
        aviator.addFunction(new ToBooleanFunction());
        aviator.addFunction(new BucketFunction());
        aviator.addFunction(new ActionTimeFunction());
        aviator.addFunction(new NowFunction());
        aviator.addFunction(new DateDiffFunction());
        aviator.addFunction(new WeekdayFunction());
        aviator.addFunction(new DateFormatFunction());
        aviator.addFunction(new InRecentDaysFunction());
        aviator.addFunction(new IsRecurringFunction());
        aviator.addFunction(new ConvertUnitFunction());
        aviator.addFunction(new WhereFunction());
        aviator.addFunction(new ByFunction());
    }

    private Object eval(String expr, Map<String, Object> env) {
        return aviator.execute(expr, env);
    }

    private Object eval(String expr) {
        return eval(expr, new HashMap<>());
    }

    // --- Helper to build event history ---
    private static List<Map<String, Object>> eventHistory(Object... fieldValues) {
        List<Map<String, Object>> history = new ArrayList<>();
        for (Object val : fieldValues) {
            Map<String, Object> event = new HashMap<>();
            event.put("props", Map.of("amount", val));
            history.add(event);
        }
        return history;
    }

    private static List<Map<String, Object>> eventHistoryWithField(String field, Object... values) {
        List<Map<String, Object>> history = new ArrayList<>();
        for (Object val : values) {
            Map<String, Object> event = new HashMap<>();
            event.put("props", Map.of(field, val));
            history.add(event);
        }
        return history;
    }

    // ========== DivideFunction ==========
    @Nested
    @DisplayName("DivideFunction")
    class DivideFunctionTests {

        @Test
        @DisplayName("divides two numbers correctly")
        void dividesCorrectly() {
            Object result = eval("dsl_divide(10, 4)");
            assertEquals(2.5, ((Number) result).doubleValue(), 0.001);
        }

        @Test
        @DisplayName("returns null on zero divisor")
        void returnsNullOnZeroDivisor() {
            Object result = eval("dsl_divide(10, 0)");
            assertNull(result);
        }

        @Test
        @DisplayName("returns null on zero double divisor")
        void returnsNullOnZeroDoubleDivisor() {
            Object result = eval("dsl_divide(10, 0.0)");
            assertNull(result);
        }

        @Test
        @DisplayName("handles negative numbers")
        void handlesNegativeNumbers() {
            Object result = eval("dsl_divide(-10, 2)");
            assertEquals(-5.0, ((Number) result).doubleValue(), 0.001);
        }
    }

    // ========== CountFunction ==========
    @Nested
    @DisplayName("CountFunction")
    class CountFunctionTests {

        @Test
        @DisplayName("counts non-null values in event history")
        void countsNonNullValues() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", eventHistory(10, 20, 30));
            Object result = eval("dsl_count('amount')", env);
            assertEquals(3L, ((Number) result).longValue());
        }

        @Test
        @DisplayName("returns 0 for empty history")
        void returnsZeroForEmptyHistory() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", List.of());
            Object result = eval("dsl_count('amount')", env);
            assertEquals(0L, ((Number) result).longValue());
        }

        @Test
        @DisplayName("counts list size when given a list")
        void countsListSize() {
            Map<String, Object> env = new HashMap<>();
            env.put("myList", List.of("a", "b", "c"));
            Object result = eval("dsl_count(myList)", env);
            assertEquals(3L, ((Number) result).longValue());
        }
    }

    // ========== SumFunction ==========
    @Nested
    @DisplayName("SumFunction")
    class SumFunctionTests {

        @Test
        @DisplayName("sums numeric values in event history")
        void sumsValues() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", eventHistory(10, 20, 30));
            Object result = eval("dsl_sum('amount')", env);
            assertEquals(60.0, ((Number) result).doubleValue(), 0.001);
        }

        @Test
        @DisplayName("returns 0 for empty history")
        void returnsZeroForEmptyHistory() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", List.of());
            Object result = eval("dsl_sum('amount')", env);
            assertEquals(0.0, ((Number) result).doubleValue(), 0.001);
        }
    }

    // ========== AvgFunction ==========
    @Nested
    @DisplayName("AvgFunction")
    class AvgFunctionTests {

        @Test
        @DisplayName("computes average of numeric values")
        void computesAverage() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", eventHistory(10, 20, 30));
            Object result = eval("dsl_avg('amount')", env);
            assertEquals(20.0, ((Number) result).doubleValue(), 0.001);
        }

        @Test
        @DisplayName("returns null for empty history")
        void returnsNullForEmptyHistory() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", List.of());
            Object result = eval("dsl_avg('amount')", env);
            assertNull(result);
        }
    }

    // ========== ContainsFunction ==========
    @Nested
    @DisplayName("ContainsFunction")
    class ContainsFunctionTests {

        @Test
        @DisplayName("returns true when string contains substring")
        void containsSubstring() {
            Object result = eval("dsl_contains('hello world', 'world')");
            assertEquals(true, result);
        }

        @Test
        @DisplayName("returns false when string does not contain substring")
        void doesNotContainSubstring() {
            Object result = eval("dsl_contains('hello world', 'xyz')");
            assertEquals(false, result);
        }
    }

    // ========== UpperFunction ==========
    @Nested
    @DisplayName("UpperFunction")
    class UpperFunctionTests {

        @Test
        @DisplayName("converts string to uppercase")
        void convertsToUppercase() {
            Object result = eval("dsl_upper('hello')");
            assertEquals("HELLO", result);
        }
    }

    // ========== LowerFunction ==========
    @Nested
    @DisplayName("LowerFunction")
    class LowerFunctionTests {

        @Test
        @DisplayName("converts string to lowercase")
        void convertsToLowercase() {
            Object result = eval("dsl_lower('HELLO')");
            assertEquals("hello", result);
        }
    }

    // ========== ToNumberFunction ==========
    @Nested
    @DisplayName("ToNumberFunction")
    class ToNumberFunctionTests {

        @Test
        @DisplayName("converts string to number")
        void convertsStringToNumber() {
            Object result = eval("dsl_to_number('42.5')");
            assertEquals(42.5, ((Number) result).doubleValue(), 0.001);
        }

        @Test
        @DisplayName("returns null for non-numeric string")
        void returnsNullForNonNumeric() {
            Object result = eval("dsl_to_number('abc')");
            assertNull(result);
        }

        @Test
        @DisplayName("passes through numbers")
        void passesThroughNumbers() {
            Object result = eval("dsl_to_number(42)");
            assertEquals(42.0, ((Number) result).doubleValue(), 0.001);
        }
    }

    // ========== ToStringFunction ==========
    @Nested
    @DisplayName("ToStringFunction")
    class ToStringFunctionTests {

        @Test
        @DisplayName("converts number to string")
        void convertsNumberToString() {
            Object result = eval("dsl_to_string(42)");
            assertEquals("42", result);
        }

        @Test
        @DisplayName("converts boolean to string")
        void convertsBooleanToString() {
            Object result = eval("dsl_to_string(true)");
            assertEquals("true", result);
        }
    }

    // ========== BucketFunction ==========
    @Nested
    @DisplayName("BucketFunction")
    class BucketFunctionTests {

        @Test
        @DisplayName("assigns value to first bucket (below lowest boundary)")
        void firstBucket() {
            Map<String, Object> env = new HashMap<>();
            env.put("boundaries", List.of(10, 20, 30));
            Object result = eval("dsl_bucket(5, boundaries)", env);
            assertEquals("< 10", result);
        }

        @Test
        @DisplayName("assigns value to intermediate bucket")
        void intermediateBucket() {
            Map<String, Object> env = new HashMap<>();
            env.put("boundaries", List.of(10, 20, 30));
            Object result = eval("dsl_bucket(15, boundaries)", env);
            assertEquals("[10, 20)", result);
        }

        @Test
        @DisplayName("assigns value to last bucket (at or above highest boundary)")
        void lastBucket() {
            Map<String, Object> env = new HashMap<>();
            env.put("boundaries", List.of(10, 20, 30));
            Object result = eval("dsl_bucket(35, boundaries)", env);
            assertEquals(">= 30", result);
        }

        @Test
        @DisplayName("assigns value exactly on boundary to correct bucket")
        void exactlyOnBoundary() {
            Map<String, Object> env = new HashMap<>();
            env.put("boundaries", List.of(10, 20, 30));
            Object result = eval("dsl_bucket(20, boundaries)", env);
            assertEquals("[20, 30)", result);
        }
    }

    // ========== MinFunction / MaxFunction ==========
    @Nested
    @DisplayName("MinFunction and MaxFunction")
    class MinMaxFunctionTests {

        @Test
        @DisplayName("min returns minimum value")
        void minReturnsMinimum() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", eventHistory(30, 10, 20));
            Object result = eval("dsl_min('amount')", env);
            assertEquals(10.0, ((Number) result).doubleValue(), 0.001);
        }

        @Test
        @DisplayName("max returns maximum value")
        void maxReturnsMaximum() {
            Map<String, Object> env = new HashMap<>();
            env.put("event_history", eventHistory(30, 10, 20));
            Object result = eval("dsl_max('amount')", env);
            assertEquals(30.0, ((Number) result).doubleValue(), 0.001);
        }
    }

    // ========== String functions ==========
    @Nested
    @DisplayName("Additional String Functions")
    class AdditionalStringFunctionTests {

        @Test
        @DisplayName("starts_with returns true for matching prefix")
        void startsWithTrue() {
            assertEquals(true, eval("dsl_starts_with('hello world', 'hello')"));
        }

        @Test
        @DisplayName("ends_with returns true for matching suffix")
        void endsWithTrue() {
            assertEquals(true, eval("dsl_ends_with('hello world', 'world')"));
        }

        @Test
        @DisplayName("trim removes whitespace")
        void trimRemovesWhitespace() {
            assertEquals("hello", eval("dsl_trim('  hello  ')"));
        }

        @Test
        @DisplayName("length returns string length")
        void lengthReturnsLength() {
            assertEquals(5L, ((Number) eval("dsl_length('hello')")).longValue());
        }

        @Test
        @DisplayName("substring extracts portion of string")
        void substringExtractsPortion() {
            assertEquals("ell", eval("dsl_substring('hello', 1, 3)"));
        }

        @Test
        @DisplayName("replace replaces occurrences")
        void replaceOccurrences() {
            assertEquals("hxllo", eval("dsl_replace('hello', 'e', 'x')"));
        }

        @Test
        @DisplayName("concat joins strings")
        void concatJoinsStrings() {
            assertEquals("helloworld", eval("dsl_concat('hello', 'world')"));
        }

        @Test
        @DisplayName("split splits string by delimiter")
        void splitSplitsString() {
            Object result = eval("dsl_split('a,b,c', ',')");
            assertEquals(List.of("a", "b", "c"), result);
        }

        @Test
        @DisplayName("regex_match matches pattern")
        void regexMatchMatches() {
            assertEquals(true, eval("dsl_regex_match('hello123', '.*\\\\d+')"));
        }
    }

    // ========== ToBooleanFunction ==========
    @Nested
    @DisplayName("ToBooleanFunction")
    class ToBooleanFunctionTests {

        @Test
        @DisplayName("converts 'true' string to true")
        void convertsTrueString() {
            assertEquals(true, eval("dsl_to_boolean('true')"));
        }

        @Test
        @DisplayName("converts non-zero number to true")
        void convertsNonZeroToTrue() {
            assertEquals(true, eval("dsl_to_boolean(1)"));
        }

        @Test
        @DisplayName("converts zero to false")
        void convertsZeroToFalse() {
            assertEquals(false, eval("dsl_to_boolean(0)"));
        }
    }
}
