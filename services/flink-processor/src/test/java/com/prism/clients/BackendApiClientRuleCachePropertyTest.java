package com.prism.clients;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.prism.models.TriggerRule;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.AfterProperty;
import net.jqwik.api.lifecycle.BeforeProperty;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

// Feature: flink-processor, Property 7: Rule cache indexed by project_id
// Validates: Requirements 7.2
class BackendApiClientRuleCachePropertyTest {

    private MockWebServer server;
    private BackendApiClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeProperty
    void setUp() throws Exception {
        server = new MockWebServer();
        server.start();
    }

    @AfterProperty
    void tearDown() throws Exception {
        if (server != null) {
            server.shutdown();
        }
    }

    /**
     * For any set of TriggerRule records loaded into the cache, querying the cache
     * by a project_id SHALL return exactly the rules belonging to that project,
     * and querying by a project_id with no rules SHALL return an empty list.
     *
     * Validates: Requirements 7.2
     */
    @Property(tries = 100)
    void ruleCacheReturnsExactRulesForProjectAndEmptyForUnknown(
            @ForAll("ruleSets") Map<String, List<TriggerRule>> rulesByProject) throws Exception {

        // Set up dispatcher to serve rules per project
        server.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) {
                String path = request.getPath();
                // Extract projectId from /api/v1/config/projects/{projectId}/trigger-rules
                String prefix = "/api/v1/config/projects/";
                String suffix = "/trigger-rules";
                if (path != null && path.startsWith(prefix) && path.endsWith(suffix)) {
                    String projectId = path.substring(prefix.length(), path.length() - suffix.length());
                    List<TriggerRule> rules = rulesByProject.getOrDefault(projectId, Collections.emptyList());
                    try {
                        return new MockResponse()
                                .setBody(mapper.writeValueAsString(rules))
                                .addHeader("Content-Type", "application/json");
                    } catch (Exception e) {
                        return new MockResponse().setResponseCode(500);
                    }
                }
                return new MockResponse().setResponseCode(404);
            }
        });

        // Create a fresh client for each property run pointing at the mock server
        client = new BackendApiClient(server.url("/").toString().replaceAll("/$", ""));
        client.init(Duration.ofMinutes(5), Duration.ofMinutes(1));

        // Query each project and verify we get exactly the expected rules
        for (Map.Entry<String, List<TriggerRule>> entry : rulesByProject.entrySet()) {
            String projectId = entry.getKey();
            List<TriggerRule> expectedRules = entry.getValue();

            List<TriggerRule> actualRules = client.getTriggerRules(projectId);

            assertEquals(expectedRules.size(), actualRules.size(),
                    "Rule count mismatch for project " + projectId);

            // Verify each rule matches by ruleId
            Set<String> expectedIds = expectedRules.stream()
                    .map(TriggerRule::getRuleId)
                    .collect(Collectors.toSet());
            Set<String> actualIds = actualRules.stream()
                    .map(TriggerRule::getRuleId)
                    .collect(Collectors.toSet());
            assertEquals(expectedIds, actualIds,
                    "Rule IDs mismatch for project " + projectId);

            // Verify each returned rule has the correct projectId
            for (TriggerRule rule : actualRules) {
                assertEquals(projectId, rule.getProjectId(),
                        "Rule " + rule.getRuleId() + " should belong to project " + projectId);
            }
        }

        // Query a non-existent project — should return empty list
        String nonExistentProject = "nonexistent_proj_" + UUID.randomUUID();
        List<TriggerRule> emptyResult = client.getTriggerRules(nonExistentProject);
        assertNotNull(emptyResult, "Result for non-existent project should not be null");
        assertTrue(emptyResult.isEmpty(),
                "Result for non-existent project should be empty but got " + emptyResult.size() + " rules");
    }

    @Provide
    Arbitrary<Map<String, List<TriggerRule>>> ruleSets() {
        // Generate 1-5 distinct project IDs, each with 0-6 rules
        Arbitrary<String> projectIds = Arbitraries.strings()
                .alpha()
                .ofMinLength(3).ofMaxLength(10)
                .map(s -> "proj_" + s.toLowerCase());

        return projectIds.list().ofMinSize(1).ofMaxSize(5)
                .uniqueElements()
                .flatMap(projects -> {
                    // For each project, generate a list of rules
                    List<Arbitrary<Map.Entry<String, List<TriggerRule>>>> entryArbitraries = new ArrayList<>();
                    for (String projectId : projects) {
                        Arbitrary<Map.Entry<String, List<TriggerRule>>> entryArb =
                                triggerRulesForProject(projectId)
                                        .map(rules -> Map.entry(projectId, rules));
                        entryArbitraries.add(entryArb);
                    }
                    return Combinators.combine(entryArbitraries).as(entries -> {
                        Map<String, List<TriggerRule>> map = new LinkedHashMap<>();
                        for (Map.Entry<String, List<TriggerRule>> e : entries) {
                            map.put(e.getKey(), e.getValue());
                        }
                        return map;
                    });
                });
    }

    private Arbitrary<List<TriggerRule>> triggerRulesForProject(String projectId) {
        return triggerRuleArbitrary(projectId).list().ofMinSize(0).ofMaxSize(6);
    }

    private Arbitrary<TriggerRule> triggerRuleArbitrary(String projectId) {
        Arbitrary<String> ruleIds = Arbitraries.strings()
                .alpha().numeric()
                .ofMinLength(3).ofMaxLength(12)
                .map(s -> "rule_" + s);
        Arbitrary<String> names = Arbitraries.strings()
                .alpha()
                .ofMinLength(2).ofMaxLength(20)
                .map(s -> "Rule " + s);
        Arbitrary<String> statuses = Arbitraries.of("active", "inactive", "draft");

        return Combinators.combine(ruleIds, names, statuses)
                .as((ruleId, name, status) -> {
                    TriggerRule rule = new TriggerRule();
                    rule.setRuleId(ruleId);
                    rule.setProjectId(projectId);
                    rule.setName(name);
                    rule.setStatus(status);
                    return rule;
                });
    }
}
