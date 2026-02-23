package com.prism.dsl;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.googlecode.aviator.AviatorEvaluator;
import com.googlecode.aviator.AviatorEvaluatorInstance;
import com.googlecode.aviator.Expression;
import com.prism.dsl.ast.DslNode;
import com.prism.dsl.functions.*;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Production DSL engine backed by AviatorScript.
 *
 * <p>Parses DSL expressions into ASTs, generates AviatorScript code,
 * compiles and caches the resulting expressions, then evaluates them
 * against an environment built from event, profile, and history data.</p>
 */
public class AviatorDslEngine implements DslEngine {

    private static final long serialVersionUID = 1L;

    private transient AviatorEvaluatorInstance aviator;
    private transient Cache<String, Expression> expressionCache;

    public AviatorDslEngine() {}

    /**
     * Initialise the AviatorScript evaluator, register all custom DSL
     * functions, and create the compiled-expression cache.
     * Must be called before any evaluate method.
     */
    public void init() {
        this.aviator = AviatorEvaluator.newInstance();
        registerCustomFunctions(aviator);
        this.expressionCache = Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofMinutes(30))
                .build();
    }

    @Override
    public DslResult evaluateEventComputed(String formula, PrismEvent event) {
        try {
            ensureInitialised();
            Map<String, Object> env = buildEventContext(event);
            Object result = getOrCompile(formula).execute(env);
            return DslResult.ok(result);
        } catch (Exception e) {
            return DslResult.error("Event computed eval failed: " + e.getMessage());
        }
    }

    @Override
    public DslResult evaluateProfileComputed(String formula, PrismEvent event,
                                              ProfileState profileState,
                                              List<PrismEvent> eventHistory) {
        try {
            ensureInitialised();
            Map<String, Object> env = buildFullContext(event, profileState, eventHistory);
            Object result = getOrCompile(formula).execute(env);
            return DslResult.ok(result);
        } catch (Exception e) {
            return DslResult.error("Profile computed eval failed: " + e.getMessage());
        }
    }

    @Override
    public DslResult evaluateTriggerRule(String dslExpression, PrismEvent event,
                                          ProfileState profileState,
                                          List<PrismEvent> eventHistory) {
        try {
            ensureInitialised();
            Map<String, Object> env = buildFullContext(event, profileState, eventHistory);
            Object result = getOrCompile(dslExpression).execute(env);
            return DslResult.ok(result);
        } catch (Exception e) {
            return DslResult.error("Trigger eval failed: " + e.getMessage());
        }
    }

    // ---- internal helpers ----

    /**
     * Lazily initialise after deserialisation (transient fields are null).
     */
    private void ensureInitialised() {
        if (aviator == null || expressionCache == null) {
            init();
        }
    }

    /**
     * Compile (or retrieve from cache) the AviatorScript expression
     * corresponding to the given DSL formula.
     */
    Expression getOrCompile(String expression) {
        return expressionCache.get(expression,
                expr -> aviator.compile(translateToAviator(expr), true));
    }

    /**
     * Translate a DSL expression string to AviatorScript via AST.
     */
    String translateToAviator(String dslExpression) {
        DslNode ast = DslParser.parse(dslExpression);
        return AviatorCodeGenerator.generate(ast);
    }

    /**
     * Build an evaluation environment containing only event data.
     */
    Map<String, Object> buildEventContext(PrismEvent event) {
        Map<String, Object> env = new HashMap<>();
        env.put("event_props", event.getProps() != null ? event.getProps() : Map.of());
        env.put("event_timestamp", event.getCts() != null ? event.getCts() : 0L);
        return env;
    }

    /**
     * Build a full evaluation environment with event, profile, history,
     * and processing-time data.
     */
    Map<String, Object> buildFullContext(PrismEvent event,
                                         ProfileState profileState,
                                         List<PrismEvent> eventHistory) {
        Map<String, Object> env = buildEventContext(event);
        env.put("profile_props",
                profileState != null && profileState.getProps() != null
                        ? profileState.getProps() : Map.of());
        env.put("event_history", toHistoryMaps(eventHistory));
        env.put("processing_time", System.currentTimeMillis());
        return env;
    }

    /**
     * Convert a list of PrismEvents into the list-of-maps format
     * expected by aggregation functions.
     */
    private List<Map<String, Object>> toHistoryMaps(List<PrismEvent> events) {
        if (events == null) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>(events.size());
        for (PrismEvent e : events) {
            Map<String, Object> m = new HashMap<>();
            m.put("props", e.getProps() != null ? e.getProps() : Map.of());
            m.put("cts", e.getCts() != null ? e.getCts() : 0L);
            m.put("event_name", e.getEventName());
            result.add(m);
        }
        return result;
    }

    /**
     * Register every custom DSL function with the AviatorScript evaluator.
     */
    private void registerCustomFunctions(AviatorEvaluatorInstance instance) {
        // Arithmetic
        instance.addFunction(new DivideFunction());
        // Math
        instance.addFunction(new ExpFunction());
        // Aggregation
        instance.addFunction(new CountFunction());
        instance.addFunction(new SumFunction());
        instance.addFunction(new AvgFunction());
        instance.addFunction(new MinFunction());
        instance.addFunction(new MaxFunction());
        instance.addFunction(new UniqueFunction());
        instance.addFunction(new TopFunction());
        // String
        instance.addFunction(new ContainsFunction());
        instance.addFunction(new StartsWithFunction());
        instance.addFunction(new EndsWithFunction());
        instance.addFunction(new RegexMatchFunction());
        instance.addFunction(new SubstringFunction());
        instance.addFunction(new ReplaceFunction());
        instance.addFunction(new ConcatFunction());
        instance.addFunction(new SplitFunction());
        instance.addFunction(new UpperFunction());
        instance.addFunction(new LowerFunction());
        instance.addFunction(new TrimFunction());
        instance.addFunction(new LengthFunction());
        // Conversion
        instance.addFunction(new ToNumberFunction());
        instance.addFunction(new ToStringFunction());
        instance.addFunction(new ToBooleanFunction());
        instance.addFunction(new ConvertUnitFunction());
        // Segmentation
        instance.addFunction(new BucketFunction());
        // Date/Time
        instance.addFunction(new ActionTimeFunction());
        instance.addFunction(new NowFunction());
        instance.addFunction(new DateDiffFunction());
        instance.addFunction(new WeekdayFunction());
        instance.addFunction(new DateFormatFunction());
        instance.addFunction(new InRecentDaysFunction());
        instance.addFunction(new IsRecurringFunction());
        // Filtering
        instance.addFunction(new WhereFunction());
        instance.addFunction(new ByFunction());
    }
}
