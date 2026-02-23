package com.prism;

import com.prism.config.AppConfig;
import com.prism.dsl.AviatorDslEngine;
import com.prism.dsl.DslEngine;
import com.prism.dsl.MockDslEngine;
import com.prism.functions.ComputedAttributeFunction;
import com.prism.functions.DeserializationRouterFunction;
import com.prism.functions.EventEnrichFunction;
import com.prism.functions.TriggerEvalFunction;
import com.prism.models.EnrichedEvent;
import com.prism.models.PrismEvent;
import com.prism.models.TriggerOutput;
import com.prism.sinks.DlqSerializationSchema;
import com.prism.sinks.EnrichedEventSerializationSchema;
import com.prism.sinks.RawBytesDeserializationSchema;
import com.prism.sinks.TriggerOutputSerializationSchema;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.configuration.StateBackendOptions;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.datastream.SingleOutputStreamOperator;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Entry point for the Prism Flink Event Processor.
 * Sets up the StreamExecutionEnvironment with RocksDB state backend
 * and wires the event processing pipeline.
 */
public class FlinkApplication {

    private static final Logger LOG = LoggerFactory.getLogger(FlinkApplication.class);

    public static void main(String[] args) throws Exception {
        LOG.info("Starting Prism Flink Event Processor");

        // Load configuration
        AppConfig appConfig = AppConfig.load(args);

        // Configure RocksDB state backend with checkpoint directory
        Configuration flinkConfig = new Configuration();
        flinkConfig.set(StateBackendOptions.STATE_BACKEND, "rocksdb");
        if (appConfig.getCheckpointDir() != null) {
            flinkConfig.setString("state.checkpoints.dir", appConfig.getCheckpointDir());
        }

        StreamExecutionEnvironment env =
                StreamExecutionEnvironment.getExecutionEnvironment(flinkConfig);

        // Create DslEngine based on config flag
        DslEngine dslEngine = createDslEngine(appConfig);

        // Build the pipeline
        buildPipeline(env, appConfig, dslEngine);

        env.execute("PrismEventProcessor");
    }

    /**
     * Create the DslEngine implementation based on config.
     * Defaults to AviatorDslEngine; set dsl.engine.type=mock for MockDslEngine.
     */
    static DslEngine createDslEngine(AppConfig config) {
        if ("mock".equalsIgnoreCase(config.getDslEngineType())) {
            LOG.info("Using MockDslEngine (development/test mode)");
            return new MockDslEngine();
        }
        LOG.info("Using AviatorDslEngine (production mode)");
        AviatorDslEngine engine = new AviatorDslEngine();
        engine.init();
        return engine;
    }

    /**
     * Build the complete event processing pipeline.
     */
    static void buildPipeline(StreamExecutionEnvironment env, AppConfig config,
                               DslEngine dslEngine) {

        // 1. Kafka Source — consume raw bytes from event.raw
        KafkaSource<byte[]> kafkaSource = KafkaSource.<byte[]>builder()
                .setBootstrapServers(config.getKafkaBootstrapServers())
                .setTopics(config.getInputTopic())
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new RawBytesDeserializationSchema())
                .build();

        DataStream<byte[]> rawStream = env.fromSource(
                kafkaSource, WatermarkStrategy.noWatermarks(), "kafka-source-event-raw");

        // 2. Deserialization router — valid events to main, invalid to DLQ side output
        SingleOutputStreamOperator<PrismEvent> validEvents = rawStream
                .process(new DeserializationRouterFunction())
                .name("deserialization-router");

        // 3. DLQ sink — route deserialization failures to event.dlq
        DataStream<String> dlqStream = validEvents
                .getSideOutput(DeserializationRouterFunction.DLQ_OUTPUT);

        KafkaSink<String> dlqSink = KafkaSink.<String>builder()
                .setBootstrapServers(config.getKafkaBootstrapServers())
                .setRecordSerializer(new DlqSerializationSchema(config.getDlqTopic()))
                .build();

        dlqStream.sinkTo(dlqSink).name("kafka-sink-event-dlq");

        // 4. KeyBy composite project_id:profile_id and chain operators
        // 5. Chain: EventEnrichFunction → ComputedAttributeFunction → TriggerEvalFunction
        SingleOutputStreamOperator<EnrichedEvent> enrichedStream = validEvents
                .keyBy(event -> event.getProjectId() + ":" + event.getProfileId())
                .process(new EventEnrichFunction(config))
                .name("event-enrich");

        SingleOutputStreamOperator<EnrichedEvent> computedStream = enrichedStream
                .keyBy(event -> event.getProjectId() + ":" + event.getProfileId())
                .process(new ComputedAttributeFunction(dslEngine, config))
                .name("computed-attributes");

        SingleOutputStreamOperator<TriggerOutput> triggerStream = computedStream
                .keyBy(event -> event.getProjectId() + ":" + event.getProfileId())
                .process(new TriggerEvalFunction(dslEngine, config))
                .name("trigger-eval");

        // 6. Kafka Sink — event.triggered (main output from TriggerEvalFunction)
        KafkaSink<TriggerOutput> triggeredSink = KafkaSink.<TriggerOutput>builder()
                .setBootstrapServers(config.getKafkaBootstrapServers())
                .setRecordSerializer(
                        new TriggerOutputSerializationSchema(config.getTriggeredTopic()))
                .build();

        triggerStream.sinkTo(triggeredSink).name("kafka-sink-event-triggered");

        // 7. Kafka Sink — event.enriched (side output from TriggerEvalFunction)
        DataStream<EnrichedEvent> enrichedOutput = triggerStream
                .getSideOutput(TriggerEvalFunction.ENRICHED_OUTPUT);

        KafkaSink<EnrichedEvent> enrichedSink = KafkaSink.<EnrichedEvent>builder()
                .setBootstrapServers(config.getKafkaBootstrapServers())
                .setRecordSerializer(
                        new EnrichedEventSerializationSchema(config.getEnrichedTopic()))
                .build();

        enrichedOutput.sinkTo(enrichedSink).name("kafka-sink-event-enriched");

        LOG.info("Pipeline wired: {} → deserialization-router → keyBy → enrich → compute → trigger → sinks",
                config.getInputTopic());
    }
}
