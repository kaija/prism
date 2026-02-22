package com.prism.clients;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.prism.models.AttributeDefinition;
import com.prism.models.TriggerRule;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.Serializable;
import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * HTTP client for the Backend API with Caffeine-based in-memory caching.
 *
 * <p>This client is {@link Serializable} so it can be passed into Flink operators.
 * The OkHttpClient and Caffeine caches are transient and must be re-initialized
 * via {@link #init(Duration, Duration)} in the operator's {@code open()} method
 * after deserialization.</p>
 */
public class BackendApiClient implements Serializable {

    private static final long serialVersionUID = 1L;
    private static final Logger log = LoggerFactory.getLogger(BackendApiClient.class);

    private final String baseUrl;

    private transient OkHttpClient httpClient;
    private transient ObjectMapper objectMapper;
    private transient Cache<String, List<AttributeDefinition>> schemaCache;
    private transient Cache<String, List<TriggerRule>> ruleCache;

    public BackendApiClient(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    /**
     * Initialize transient HTTP client and caches. Must be called in operator open().
     */
    public void init(Duration schemaTtl, Duration ruleTtl) {
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(Duration.ofSeconds(5))
                .readTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        this.schemaCache = Caffeine.newBuilder()
                .expireAfterWrite(schemaTtl)
                .build();
        this.ruleCache = Caffeine.newBuilder()
                .expireAfterWrite(ruleTtl)
                .build();
    }

    /**
     * Fetch attribute definitions for a project from the Backend API.
     * Results are cached with TTL-based expiry. On HTTP error or timeout,
     * returns the last cached value if available, otherwise returns an empty list.
     *
     * @param projectId the project identifier
     * @return list of attribute definitions, never null
     */
    public List<AttributeDefinition> getAttributeDefinitions(String projectId) {
        List<AttributeDefinition> cached = schemaCache.getIfPresent(projectId);
        try {
            String url = baseUrl + "/api/v1/config/projects/" + projectId + "/attributes";
            List<AttributeDefinition> result = executeGet(url,
                    new TypeReference<List<AttributeDefinition>>() {});
            schemaCache.put(projectId, result);
            return result;
        } catch (Exception e) {
            log.warn("Failed to fetch attribute definitions for project {}: {}. " +
                    "Using cached value.", projectId, e.getMessage());
            return cached != null ? cached : Collections.emptyList();
        }
    }

    /**
     * Fetch trigger rules for a project from the Backend API.
     * Results are cached with TTL-based expiry. On HTTP error or timeout,
     * returns the last cached value if available, otherwise returns an empty list.
     *
     * @param projectId the project identifier
     * @return list of trigger rules, never null
     */
    public List<TriggerRule> getTriggerRules(String projectId) {
        List<TriggerRule> cached = ruleCache.getIfPresent(projectId);
        try {
            String url = baseUrl + "/api/v1/config/projects/" + projectId + "/trigger-rules";
            List<TriggerRule> result = executeGet(url,
                    new TypeReference<List<TriggerRule>>() {});
            ruleCache.put(projectId, result);
            return result;
        } catch (Exception e) {
            log.warn("Failed to fetch trigger rules for project {}: {}. " +
                    "Using cached value.", projectId, e.getMessage());
            return cached != null ? cached : Collections.emptyList();
        }
    }

    private <T> T executeGet(String url, TypeReference<T> typeRef) throws IOException {
        Request request = new Request.Builder()
                .url(url)
                .get()
                .build();
        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("HTTP " + response.code() + " from " + url);
            }
            ResponseBody body = response.body();
            if (body == null) {
                throw new IOException("Empty response body from " + url);
            }
            return objectMapper.readValue(body.string(), typeRef);
        }
    }

    /** Returns the base URL this client is configured with. */
    public String getBaseUrl() {
        return baseUrl;
    }

    /** Returns true if the client has been initialized (transient fields are set). */
    public boolean isInitialized() {
        return httpClient != null && schemaCache != null && ruleCache != null;
    }
}
