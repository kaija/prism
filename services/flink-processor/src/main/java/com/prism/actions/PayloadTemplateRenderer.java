package com.prism.actions;

import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.ProfileState;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Renders payload templates by replacing {@code {{key}}} placeholders with values
 * from the enriched event and profile context.
 */
public class PayloadTemplateRenderer {

    private static final Logger log = LoggerFactory.getLogger(PayloadTemplateRenderer.class);
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([\\w.]+)\\s*\\}\\}");

    private PayloadTemplateRenderer() {
        // utility class
    }

    /**
     * Render a payload template by replacing {{placeholder}} with values
     * from event and profile context.
     *
     * @param template the template string with {{key}} placeholders
     * @param enriched the enriched event containing event and profile data
     * @return the rendered string with placeholders replaced; returns "{}" for null/empty templates
     */
    public static String render(String template, EnrichedEvent enriched) {
        if (template == null || template.isEmpty()) return "{}";

        Map<String, Object> context = buildContext(enriched);
        Matcher matcher = PLACEHOLDER.matcher(template);
        StringBuilder result = new StringBuilder();

        while (matcher.find()) {
            String key = matcher.group(1);
            Object value = resolveNestedKey(key, context);
            String replacement = value != null ? escapeJson(value.toString()) : "";
            if (value == null) {
                log.warn("Placeholder {{{}}} not found in context", key);
            }
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    /**
     * Build a flat context map from the enriched event with dotted-key prefixes.
     * <p>
     * Keys produced:
     * <ul>
     *   <li>{@code event.event_id}, {@code event.project_id}, {@code event.event_name},
     *       {@code event.cts}, {@code event.sts}, {@code event.profile_id}</li>
     *   <li>{@code event.props.X} for each key X in event props</li>
     *   <li>{@code event.ctx.X} for each key X in event ctx</li>
     *   <li>{@code profile.profile_id}, {@code profile.project_id},
     *       {@code profile.created_at}, {@code profile.updated_at}</li>
     *   <li>{@code profile.props.X} for each key X in profile props</li>
     * </ul>
     */
    static Map<String, Object> buildContext(EnrichedEvent enriched) {
        Map<String, Object> context = new HashMap<>();
        if (enriched == null) return context;

        PrismEvent event = enriched.getEvent();
        if (event != null) {
            putIfNotNull(context, "event.event_id", event.getEventId());
            putIfNotNull(context, "event.project_id", event.getProjectId());
            putIfNotNull(context, "event.event_name", event.getEventName());
            putIfNotNull(context, "event.cts", event.getCts());
            putIfNotNull(context, "event.sts", event.getSts());
            putIfNotNull(context, "event.profile_id", event.getProfileId());

            if (event.getProps() != null) {
                for (Map.Entry<String, Object> entry : event.getProps().entrySet()) {
                    putIfNotNull(context, "event.props." + entry.getKey(), entry.getValue());
                }
            }
            if (event.getCtx() != null) {
                for (Map.Entry<String, Object> entry : event.getCtx().entrySet()) {
                    putIfNotNull(context, "event.ctx." + entry.getKey(), entry.getValue());
                }
            }
        }

        ProfileState profile = enriched.getProfile();
        if (profile != null) {
            putIfNotNull(context, "profile.profile_id", profile.getProfileId());
            putIfNotNull(context, "profile.project_id", profile.getProjectId());
            context.put("profile.created_at", profile.getCreatedAt());
            context.put("profile.updated_at", profile.getUpdatedAt());

            if (profile.getProps() != null) {
                for (Map.Entry<String, Object> entry : profile.getProps().entrySet()) {
                    putIfNotNull(context, "profile.props." + entry.getKey(), entry.getValue());
                }
            }
        }

        return context;
    }

    /**
     * Resolve a dotted key from the flat context map.
     * Since the context is already flat with dotted keys, this is a direct lookup.
     *
     * @param key     the dotted key (e.g. "event.props.amount")
     * @param context the flat context map
     * @return the value, or null if not found
     */
    static Object resolveNestedKey(String key, Map<String, Object> context) {
        if (key == null || context == null) return null;
        return context.get(key);
    }

    /**
     * Escape JSON special characters in a string value.
     */
    static String escapeJson(String value) {
        if (value == null) return "";
        StringBuilder sb = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    private static void putIfNotNull(Map<String, Object> map, String key, Object value) {
        if (value != null) {
            map.put(key, value);
        }
    }
}
