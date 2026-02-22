package com.prism.clients;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.AttributeDefinition;
import com.prism.models.TriggerRule;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BackendApiClientTest {

    private MockWebServer server;
    private BackendApiClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();
        client = new BackendApiClient(server.url("/").toString().replaceAll("/$", ""));
        client.init(Duration.ofMinutes(5), Duration.ofMinutes(1));
    }

    @AfterEach
    void tearDown() throws Exception {
        server.shutdown();
    }

    @Test
    void initSetsUpTransientFields() {
        BackendApiClient fresh = new BackendApiClient("http://localhost");
        assertFalse(fresh.isInitialized());
        fresh.init(Duration.ofMinutes(5), Duration.ofMinutes(1));
        assertTrue(fresh.isInitialized());
    }

    @Test
    void getAttributeDefinitionsReturnsDeserializedList() throws Exception {
        List<AttributeDefinition> attrs = List.of(
                new AttributeDefinition("email", "string", "profile", true, false, null),
                new AttributeDefinition("total", "number", "event", false, true, "sum(amount)")
        );
        server.enqueue(new MockResponse()
                .setBody(mapper.writeValueAsString(attrs))
                .addHeader("Content-Type", "application/json"));

        List<AttributeDefinition> result = client.getAttributeDefinitions("proj1");

        assertEquals(2, result.size());
        assertEquals("email", result.get(0).getName());
        assertEquals("total", result.get(1).getName());
        assertTrue(result.get(1).isEventComputed());

        RecordedRequest req = server.takeRequest();
        assertEquals("/api/v1/config/projects/proj1/attributes", req.getPath());
    }

    @Test
    void getTriggerRulesReturnsDeserializedList() throws Exception {
        TriggerRule rule = new TriggerRule();
        rule.setRuleId("r1");
        rule.setProjectId("proj1");
        rule.setName("Test Rule");
        rule.setStatus("active");

        server.enqueue(new MockResponse()
                .setBody(mapper.writeValueAsString(List.of(rule)))
                .addHeader("Content-Type", "application/json"));

        List<TriggerRule> result = client.getTriggerRules("proj1");

        assertEquals(1, result.size());
        assertEquals("r1", result.get(0).getRuleId());
        assertTrue(result.get(0).isActive());

        RecordedRequest req = server.takeRequest();
        assertEquals("/api/v1/config/projects/proj1/trigger-rules", req.getPath());
    }

    @Test
    void getAttributeDefinitionsFallsBackToCacheOnError() throws Exception {
        // First call succeeds and populates cache
        List<AttributeDefinition> attrs = List.of(
                new AttributeDefinition("name", "string", "profile", false, false, null)
        );
        server.enqueue(new MockResponse()
                .setBody(mapper.writeValueAsString(attrs))
                .addHeader("Content-Type", "application/json"));
        client.getAttributeDefinitions("proj1");

        // Second call fails — should return cached value
        server.enqueue(new MockResponse().setResponseCode(500));
        List<AttributeDefinition> result = client.getAttributeDefinitions("proj1");

        assertEquals(1, result.size());
        assertEquals("name", result.get(0).getName());
    }

    @Test
    void getTriggerRulesFallsBackToCacheOnError() throws Exception {
        TriggerRule rule = new TriggerRule();
        rule.setRuleId("r1");
        rule.setProjectId("proj1");
        rule.setStatus("active");

        server.enqueue(new MockResponse()
                .setBody(mapper.writeValueAsString(List.of(rule)))
                .addHeader("Content-Type", "application/json"));
        client.getTriggerRules("proj1");

        server.enqueue(new MockResponse().setResponseCode(503));
        List<TriggerRule> result = client.getTriggerRules("proj1");

        assertEquals(1, result.size());
        assertEquals("r1", result.get(0).getRuleId());
    }

    @Test
    void getAttributeDefinitionsReturnsEmptyListWhenNoCacheAndError() {
        server.enqueue(new MockResponse().setResponseCode(500));
        List<AttributeDefinition> result = client.getAttributeDefinitions("proj_new");
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void getTriggerRulesReturnsEmptyListWhenNoCacheAndError() {
        server.enqueue(new MockResponse().setResponseCode(500));
        List<TriggerRule> result = client.getTriggerRules("proj_new");
        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    void serializationPreservesBaseUrl() throws Exception {
        BackendApiClient original = new BackendApiClient("http://example.com:8080");

        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (ObjectOutputStream oos = new ObjectOutputStream(bos)) {
            oos.writeObject(original);
        }

        ByteArrayInputStream bis = new ByteArrayInputStream(bos.toByteArray());
        BackendApiClient deserialized;
        try (ObjectInputStream ois = new ObjectInputStream(bis)) {
            deserialized = (BackendApiClient) ois.readObject();
        }

        assertEquals("http://example.com:8080", deserialized.getBaseUrl());
        assertFalse(deserialized.isInitialized());

        // After re-init, should be functional
        deserialized.init(Duration.ofMinutes(5), Duration.ofMinutes(1));
        assertTrue(deserialized.isInitialized());
    }

    @Test
    void cacheIsUpdatedOnSuccessfulFetch() throws Exception {
        // First response
        List<AttributeDefinition> v1 = List.of(
                new AttributeDefinition("a", "string", "event", false, false, null)
        );
        server.enqueue(new MockResponse()
                .setBody(mapper.writeValueAsString(v1))
                .addHeader("Content-Type", "application/json"));
        client.getAttributeDefinitions("proj1");

        // Second response with updated data
        List<AttributeDefinition> v2 = List.of(
                new AttributeDefinition("a", "string", "event", false, false, null),
                new AttributeDefinition("b", "number", "event", false, false, null)
        );
        server.enqueue(new MockResponse()
                .setBody(mapper.writeValueAsString(v2))
                .addHeader("Content-Type", "application/json"));
        List<AttributeDefinition> result = client.getAttributeDefinitions("proj1");

        assertEquals(2, result.size());
    }
}
