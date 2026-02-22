use std::collections::HashMap;

use crate::models::IngestPayload;

/// Parses GET query parameters into an `IngestPayload`.
///
/// Mapping rules:
/// - `event_name`, `project_id`, `profile_id`, `cts`, `event_id` → top-level fields
/// - `e_<key>` → `props[<key>]` (event properties, prefix stripped)
/// - `p_<key>` → `profile_props[<key>]` (profile properties, prefix stripped)
///
/// All values from query params are strings; `cts` is parsed as `i64`.
pub fn parse_query_params(params: &HashMap<String, String>) -> IngestPayload {
    let event_name = params.get("event_name").cloned().unwrap_or_default();
    let project_id = params.get("project_id").cloned().unwrap_or_default();
    let profile_id = params.get("profile_id").cloned();
    let event_id = params.get("event_id").cloned();
    let cts = params.get("cts").and_then(|v| v.parse::<i64>().ok());

    let mut event_props: HashMap<String, serde_json::Value> = HashMap::new();
    let mut profile_props: HashMap<String, serde_json::Value> = HashMap::new();

    for (key, value) in params {
        if let Some(stripped) = key.strip_prefix("e_") {
            if !stripped.is_empty() {
                event_props.insert(
                    stripped.to_string(),
                    serde_json::Value::String(value.clone()),
                );
            }
        } else if let Some(stripped) = key.strip_prefix("p_") {
            if !stripped.is_empty() {
                profile_props.insert(
                    stripped.to_string(),
                    serde_json::Value::String(value.clone()),
                );
            }
        }
    }

    IngestPayload {
        event_name,
        project_id,
        event_id,
        profile_id,
        cts,
        props: if event_props.is_empty() {
            None
        } else {
            Some(event_props)
        },
        ctx: None,
        profile_props: if profile_props.is_empty() {
            None
        } else {
            Some(profile_props)
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_params(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn test_parse_top_level_fields() {
        let params = make_params(&[
            ("event_name", "page_view"),
            ("project_id", "proj_123"),
            ("profile_id", "user_456"),
            ("event_id", "evt_789"),
            ("cts", "1700000000000"),
        ]);
        let payload = parse_query_params(&params);
        assert_eq!(payload.event_name, "page_view");
        assert_eq!(payload.project_id, "proj_123");
        assert_eq!(payload.profile_id.as_deref(), Some("user_456"));
        assert_eq!(payload.event_id.as_deref(), Some("evt_789"));
        assert_eq!(payload.cts, Some(1700000000000));
    }

    #[test]
    fn test_parse_minimal_params() {
        let params = make_params(&[("event_name", "click"), ("project_id", "proj_1")]);
        let payload = parse_query_params(&params);
        assert_eq!(payload.event_name, "click");
        assert_eq!(payload.project_id, "proj_1");
        assert!(payload.profile_id.is_none());
        assert!(payload.event_id.is_none());
        assert!(payload.cts.is_none());
        assert!(payload.props.is_none());
        assert!(payload.profile_props.is_none());
    }

    #[test]
    fn test_parse_event_props_prefix_stripped() {
        let params = make_params(&[
            ("event_name", "click"),
            ("project_id", "proj_1"),
            ("e_page", "/home"),
            ("e_button", "signup"),
        ]);
        let payload = parse_query_params(&params);
        let props = payload.props.unwrap();
        assert_eq!(props.get("page").unwrap(), "/home");
        assert_eq!(props.get("button").unwrap(), "signup");
        // Original prefixed keys must not appear
        assert!(!props.contains_key("e_page"));
        assert!(!props.contains_key("e_button"));
    }

    #[test]
    fn test_parse_profile_props_prefix_stripped() {
        let params = make_params(&[
            ("event_name", "profile"),
            ("project_id", "proj_1"),
            ("p_name", "Alice"),
            ("p_email", "alice@example.com"),
        ]);
        let payload = parse_query_params(&params);
        let profile_props = payload.profile_props.unwrap();
        assert_eq!(profile_props.get("name").unwrap(), "Alice");
        assert_eq!(profile_props.get("email").unwrap(), "alice@example.com");
        assert!(!profile_props.contains_key("p_name"));
        assert!(!profile_props.contains_key("p_email"));
    }

    #[test]
    fn test_parse_mixed_event_and_profile_props() {
        let params = make_params(&[
            ("event_name", "profile"),
            ("project_id", "proj_1"),
            ("e_source", "web"),
            ("p_city", "Seattle"),
        ]);
        let payload = parse_query_params(&params);
        let props = payload.props.unwrap();
        assert_eq!(props.get("source").unwrap(), "web");
        let profile_props = payload.profile_props.unwrap();
        assert_eq!(profile_props.get("city").unwrap(), "Seattle");
    }

    #[test]
    fn test_parse_cts_invalid_not_parsed() {
        let params = make_params(&[
            ("event_name", "click"),
            ("project_id", "proj_1"),
            ("cts", "not_a_number"),
        ]);
        let payload = parse_query_params(&params);
        assert!(payload.cts.is_none());
    }

    #[test]
    fn test_parse_empty_prefix_keys_ignored() {
        // "e_" alone (no key after prefix) should be ignored
        let params = make_params(&[
            ("event_name", "click"),
            ("project_id", "proj_1"),
            ("e_", "value"),
            ("p_", "value"),
        ]);
        let payload = parse_query_params(&params);
        assert!(payload.props.is_none());
        assert!(payload.profile_props.is_none());
    }

    #[test]
    fn test_parse_missing_required_fields_defaults_to_empty() {
        let params = make_params(&[]);
        let payload = parse_query_params(&params);
        assert_eq!(payload.event_name, "");
        assert_eq!(payload.project_id, "");
    }

    #[test]
    fn test_parse_unknown_params_ignored() {
        let params = make_params(&[
            ("event_name", "click"),
            ("project_id", "proj_1"),
            ("random_key", "random_value"),
            ("another", "thing"),
        ]);
        let payload = parse_query_params(&params);
        assert_eq!(payload.event_name, "click");
        assert!(payload.props.is_none());
        assert!(payload.profile_props.is_none());
    }

    #[test]
    fn test_parse_ctx_is_none() {
        let params = make_params(&[("event_name", "click"), ("project_id", "proj_1")]);
        let payload = parse_query_params(&params);
        assert!(payload.ctx.is_none());
    }
}


#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use proptest::collection::hash_map;

    // Feature: event-ingest-api, Property 5: Query parameter prefix mapping
    // **Validates: Requirements 2.2, 2.3**

    /// Strategy for generating valid property key suffixes.
    /// Keys are non-empty alphanumeric strings that don't themselves start with e_ or p_
    /// to avoid confusion in assertions about the output.
    fn key_suffix_strategy() -> impl Strategy<Value = String> {
        "[a-z][a-z0-9]{0,19}".prop_map(|s| s)
    }

    /// Strategy for generating arbitrary non-empty string values.
    fn value_strategy() -> impl Strategy<Value = String> {
        "[a-zA-Z0-9 _./@!#%&*+-]{1,50}"
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_e_prefix_params_mapped_to_props_with_prefix_stripped(
            e_params in hash_map(key_suffix_strategy(), value_strategy(), 1..10)
        ) {
            // Build query params with e_ prefix
            let mut params: HashMap<String, String> = HashMap::new();
            params.insert("event_name".to_string(), "click".to_string());
            params.insert("project_id".to_string(), "proj_1".to_string());
            for (k, v) in &e_params {
                params.insert(format!("e_{}", k), v.clone());
            }

            let payload = parse_query_params(&params);
            let props = payload.props.expect("props should be Some when e_ params exist");

            // All e_ params appear in props with prefix stripped and values preserved
            for (k, v) in &e_params {
                prop_assert_eq!(
                    props.get(k).and_then(|val| val.as_str()),
                    Some(v.as_str()),
                    "e_{} should map to props[\"{}\"] with value \"{}\"", k, k, v
                );
            }

            // No original e_-prefixed keys remain in props output
            for key in props.keys() {
                let original_key = format!("e_{}", key);
                prop_assert!(
                    !params.contains_key(&original_key) || !props.contains_key(&original_key),
                    "Original e_-prefixed key {} should not remain in props", original_key
                );
            }

            // props count matches e_params count (no extra keys from e_ mapping)
            prop_assert_eq!(props.len(), e_params.len());
        }

        #[test]
        fn prop_p_prefix_params_mapped_to_profile_props_with_prefix_stripped(
            p_params in hash_map(key_suffix_strategy(), value_strategy(), 1..10)
        ) {
            // Build query params with p_ prefix
            let mut params: HashMap<String, String> = HashMap::new();
            params.insert("event_name".to_string(), "profile".to_string());
            params.insert("project_id".to_string(), "proj_1".to_string());
            for (k, v) in &p_params {
                params.insert(format!("p_{}", k), v.clone());
            }

            let payload = parse_query_params(&params);
            let profile_props = payload.profile_props.expect("profile_props should be Some when p_ params exist");

            // All p_ params appear in profile_props with prefix stripped and values preserved
            for (k, v) in &p_params {
                prop_assert_eq!(
                    profile_props.get(k).and_then(|val| val.as_str()),
                    Some(v.as_str()),
                    "p_{} should map to profile_props[\"{}\"] with value \"{}\"", k, k, v
                );
            }

            // No original p_-prefixed keys remain in profile_props output
            for key in profile_props.keys() {
                let original_key = format!("p_{}", key);
                prop_assert!(
                    !params.contains_key(&original_key) || !profile_props.contains_key(&original_key),
                    "Original p_-prefixed key {} should not remain in profile_props", original_key
                );
            }

            // profile_props count matches p_params count
            prop_assert_eq!(profile_props.len(), p_params.len());
        }

        #[test]
        fn prop_mixed_e_and_p_params_correctly_separated(
            e_params in hash_map(key_suffix_strategy(), value_strategy(), 1..8),
            p_params in hash_map(key_suffix_strategy(), value_strategy(), 1..8),
        ) {
            let mut params: HashMap<String, String> = HashMap::new();
            params.insert("event_name".to_string(), "profile".to_string());
            params.insert("project_id".to_string(), "proj_1".to_string());
            for (k, v) in &e_params {
                params.insert(format!("e_{}", k), v.clone());
            }
            for (k, v) in &p_params {
                params.insert(format!("p_{}", k), v.clone());
            }

            let payload = parse_query_params(&params);

            // e_ params go to props with values preserved
            let props = payload.props.expect("props should be Some");
            for (k, v) in &e_params {
                prop_assert_eq!(
                    props.get(k).and_then(|val| val.as_str()),
                    Some(v.as_str()),
                    "e_{} should be in props as \"{}\"", k, k
                );
            }

            // p_ params go to profile_props with values preserved
            let profile_props = payload.profile_props.expect("profile_props should be Some");
            for (k, v) in &p_params {
                prop_assert_eq!(
                    profile_props.get(k).and_then(|val| val.as_str()),
                    Some(v.as_str()),
                    "p_{} should be in profile_props as \"{}\"", k, k
                );
            }

            // Counts match — no cross-contamination
            prop_assert_eq!(props.len(), e_params.len());
            prop_assert_eq!(profile_props.len(), p_params.len());
        }
    }
}


