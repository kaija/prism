package com.prism.config;

import java.io.Serializable;
import java.time.Duration;
import java.util.Objects;

/**
 * Application configuration for the Flink Event Processor.
 * Loaded from command-line arguments or environment variables at startup.
 */
public class AppConfig implements Serializable {

    private static final long serialVersionUID = 1L;

    private static final String DEFAULT_INPUT_TOPIC = "event.raw";
    private static final String DEFAULT_ENRICHED_TOPIC = "event.enriched";
    private static final String DEFAULT_TRIGGERED_TOPIC = "event.triggered";
    private static final String DEFAULT_DLQ_TOPIC = "event.dlq";
    private static final int DEFAULT_MAX_EVENT_HISTORY_COUNT = 1000;
    private static final long DEFAULT_MAX_EVENT_HISTORY_BYTES = 10L * 1024 * 1024; // 10 MB
    private static final Duration DEFAULT_SCHEMA_CACHE_TTL = Duration.ofMinutes(5);
    private static final Duration DEFAULT_RULE_CACHE_TTL = Duration.ofMinutes(1);

    private String kafkaBootstrapServers;
    private String backendApiUrl;
    private String inputTopic = DEFAULT_INPUT_TOPIC;
    private String enrichedTopic = DEFAULT_ENRICHED_TOPIC;
    private String triggeredTopic = DEFAULT_TRIGGERED_TOPIC;
    private String dlqTopic = DEFAULT_DLQ_TOPIC;
    private int maxEventHistoryCount = DEFAULT_MAX_EVENT_HISTORY_COUNT;
    private long maxEventHistoryBytes = DEFAULT_MAX_EVENT_HISTORY_BYTES;
    private Duration schemaCacheTtl = DEFAULT_SCHEMA_CACHE_TTL;
    private Duration ruleCacheTtl = DEFAULT_RULE_CACHE_TTL;
    private String checkpointDir;
    private String dslEngineType = "aviator";

    public AppConfig() {}

    /**
     * Load configuration from command-line arguments and environment variables.
     * Arguments take precedence over environment variables.
     * Format: --key=value (e.g. --kafka.bootstrap.servers=localhost:9092)
     */
    public static AppConfig load(String[] args) {
        AppConfig config = new AppConfig();

        config.kafkaBootstrapServers = resolveArg(args, "kafka.bootstrap.servers",
                "KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
        config.backendApiUrl = resolveArg(args, "backend.api.url",
                "BACKEND_API_URL", "http://localhost:8080");
        config.inputTopic = resolveArg(args, "input.topic",
                "INPUT_TOPIC", DEFAULT_INPUT_TOPIC);
        config.enrichedTopic = resolveArg(args, "enriched.topic",
                "ENRICHED_TOPIC", DEFAULT_ENRICHED_TOPIC);
        config.triggeredTopic = resolveArg(args, "triggered.topic",
                "TRIGGERED_TOPIC", DEFAULT_TRIGGERED_TOPIC);
        config.dlqTopic = resolveArg(args, "dlq.topic",
                "DLQ_TOPIC", DEFAULT_DLQ_TOPIC);
        config.maxEventHistoryCount = Integer.parseInt(resolveArg(args,
                "max.event.history.count", "MAX_EVENT_HISTORY_COUNT",
                String.valueOf(DEFAULT_MAX_EVENT_HISTORY_COUNT)));
        config.maxEventHistoryBytes = Long.parseLong(resolveArg(args,
                "max.event.history.bytes", "MAX_EVENT_HISTORY_BYTES",
                String.valueOf(DEFAULT_MAX_EVENT_HISTORY_BYTES)));
        config.schemaCacheTtl = Duration.ofSeconds(Long.parseLong(resolveArg(args,
                "schema.cache.ttl.seconds", "SCHEMA_CACHE_TTL_SECONDS",
                String.valueOf(DEFAULT_SCHEMA_CACHE_TTL.toSeconds()))));
        config.ruleCacheTtl = Duration.ofSeconds(Long.parseLong(resolveArg(args,
                "rule.cache.ttl.seconds", "RULE_CACHE_TTL_SECONDS",
                String.valueOf(DEFAULT_RULE_CACHE_TTL.toSeconds()))));
        config.checkpointDir = resolveArg(args, "checkpoint.dir",
                "CHECKPOINT_DIR", "file:///tmp/flink-checkpoints");
        config.dslEngineType = resolveArg(args, "dsl.engine.type",
                "DSL_ENGINE_TYPE", "aviator");

        return config;
    }

    private static String resolveArg(String[] args, String argKey, String envKey, String defaultValue) {
        // Check command-line args first (--key=value format)
        String prefix = "--" + argKey + "=";
        if (args != null) {
            for (String arg : args) {
                if (arg.startsWith(prefix)) {
                    return arg.substring(prefix.length());
                }
            }
        }
        // Fall back to environment variable
        String envValue = System.getenv(envKey);
        if (envValue != null && !envValue.isEmpty()) {
            return envValue;
        }
        return defaultValue;
    }

    // Getters and setters

    public String getKafkaBootstrapServers() { return kafkaBootstrapServers; }
    public void setKafkaBootstrapServers(String kafkaBootstrapServers) { this.kafkaBootstrapServers = kafkaBootstrapServers; }

    public String getBackendApiUrl() { return backendApiUrl; }
    public void setBackendApiUrl(String backendApiUrl) { this.backendApiUrl = backendApiUrl; }

    public String getInputTopic() { return inputTopic; }
    public void setInputTopic(String inputTopic) { this.inputTopic = inputTopic; }

    public String getEnrichedTopic() { return enrichedTopic; }
    public void setEnrichedTopic(String enrichedTopic) { this.enrichedTopic = enrichedTopic; }

    public String getTriggeredTopic() { return triggeredTopic; }
    public void setTriggeredTopic(String triggeredTopic) { this.triggeredTopic = triggeredTopic; }

    public String getDlqTopic() { return dlqTopic; }
    public void setDlqTopic(String dlqTopic) { this.dlqTopic = dlqTopic; }

    public int getMaxEventHistoryCount() { return maxEventHistoryCount; }
    public void setMaxEventHistoryCount(int maxEventHistoryCount) { this.maxEventHistoryCount = maxEventHistoryCount; }

    public long getMaxEventHistoryBytes() { return maxEventHistoryBytes; }
    public void setMaxEventHistoryBytes(long maxEventHistoryBytes) { this.maxEventHistoryBytes = maxEventHistoryBytes; }

    public Duration getSchemaCacheTtl() { return schemaCacheTtl; }
    public void setSchemaCacheTtl(Duration schemaCacheTtl) { this.schemaCacheTtl = schemaCacheTtl; }

    public Duration getRuleCacheTtl() { return ruleCacheTtl; }
    public void setRuleCacheTtl(Duration ruleCacheTtl) { this.ruleCacheTtl = ruleCacheTtl; }

    public String getCheckpointDir() { return checkpointDir; }
    public void setCheckpointDir(String checkpointDir) { this.checkpointDir = checkpointDir; }

    public String getDslEngineType() { return dslEngineType; }
    public void setDslEngineType(String dslEngineType) { this.dslEngineType = dslEngineType; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AppConfig that = (AppConfig) o;
        return maxEventHistoryCount == that.maxEventHistoryCount
                && maxEventHistoryBytes == that.maxEventHistoryBytes
                && Objects.equals(kafkaBootstrapServers, that.kafkaBootstrapServers)
                && Objects.equals(backendApiUrl, that.backendApiUrl)
                && Objects.equals(inputTopic, that.inputTopic)
                && Objects.equals(checkpointDir, that.checkpointDir)
                && Objects.equals(dslEngineType, that.dslEngineType);
    }

    @Override
    public int hashCode() {
        return Objects.hash(kafkaBootstrapServers, backendApiUrl, inputTopic, checkpointDir, dslEngineType);
    }
}
