use crate::models::event::{EnrichedEvent, IngestPayload};
use chrono::Utc;
use uuid::Uuid;

/// Converts an `IngestPayload` into an `EnrichedEvent`.
///
/// - Auto-generates a UUID v7 for `event_id` if the client did not provide one.
/// - Sets `sts` to the current UTC epoch milliseconds.
/// - Preserves the client `cts` if provided; leaves it `None` otherwise.
/// - Converts `Option<HashMap>` fields (`props`, `ctx`) into `HashMap` via `unwrap_or_default`.
pub fn enrich(payload: &IngestPayload) -> EnrichedEvent {
    let event_id = match &payload.event_id {
        Some(id) => id.clone(),
        None => Uuid::now_v7().to_string(),
    };

    let sts = Utc::now().timestamp_millis();

    EnrichedEvent {
        event_id,
        project_id: payload.project_id.clone(),
        event_name: payload.event_name.clone(),
        cts: payload.cts,
        sts,
        profile_id: payload.profile_id.clone(),
        props: payload.props.clone().unwrap_or_default(),
        ctx: payload.ctx.clone().unwrap_or_default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn minimal_payload() -> IngestPayload {
        IngestPayload {
            event_name: "page_view".to_string(),
            project_id: "proj_123".to_string(),
            event_id: None,
            profile_id: None,
            cts: None,
            props: None,
            ctx: None,
            profile_props: None,
        }
    }

    #[test]
    fn test_enrich_generates_uuid_v7_when_event_id_missing() {
        let payload = minimal_payload();
        let enriched = enrich(&payload);

        // Should be a valid UUID
        let parsed = Uuid::parse_str(&enriched.event_id);
        assert!(parsed.is_ok(), "event_id should be a valid UUID");

        // UUID v7 has version nibble == 7
        let uuid = parsed.unwrap();
        assert_eq!(uuid.get_version_num(), 7, "should be UUID v7");
    }

    #[test]
    fn test_enrich_preserves_client_event_id() {
        let mut payload = minimal_payload();
        payload.event_id = Some("client-provided-id".to_string());

        let enriched = enrich(&payload);
        assert_eq!(enriched.event_id, "client-provided-id");
    }

    #[test]
    fn test_enrich_sets_sts_to_current_time() {
        let before = Utc::now().timestamp_millis();
        let enriched = enrich(&minimal_payload());
        let after = Utc::now().timestamp_millis();

        assert!(
            enriched.sts >= before && enriched.sts <= after,
            "sts ({}) should be between {} and {}",
            enriched.sts,
            before,
            after
        );
    }

    #[test]
    fn test_enrich_preserves_client_cts() {
        let mut payload = minimal_payload();
        payload.cts = Some(1700000000000);

        let enriched = enrich(&payload);
        assert_eq!(enriched.cts, Some(1700000000000));
    }

    #[test]
    fn test_enrich_leaves_cts_none_when_not_provided() {
        let payload = minimal_payload();
        let enriched = enrich(&payload);
        assert_eq!(enriched.cts, None);
    }

    #[test]
    fn test_enrich_copies_fields() {
        let mut payload = minimal_payload();
        payload.profile_id = Some("user_42".to_string());
        payload.props = Some(HashMap::from([(
            "page".to_string(),
            serde_json::json!("/home"),
        )]));
        payload.ctx = Some(HashMap::from([(
            "ua".to_string(),
            serde_json::json!("Chrome"),
        )]));

        let enriched = enrich(&payload);
        assert_eq!(enriched.project_id, "proj_123");
        assert_eq!(enriched.event_name, "page_view");
        assert_eq!(enriched.profile_id, Some("user_42".to_string()));
        assert_eq!(enriched.props["page"], serde_json::json!("/home"));
        assert_eq!(enriched.ctx["ua"], serde_json::json!("Chrome"));
    }

    #[test]
    fn test_enrich_defaults_empty_props_and_ctx() {
        let payload = minimal_payload();
        let enriched = enrich(&payload);
        assert!(enriched.props.is_empty());
        assert!(enriched.ctx.is_empty());
    }

    #[test]
    fn test_enrich_generates_unique_ids() {
        let payload = minimal_payload();
        let e1 = enrich(&payload);
        let e2 = enrich(&payload);
        assert_ne!(e1.event_id, e2.event_id, "each call should produce a unique event_id");
    }
}

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use std::collections::HashSet;
    use uuid::Uuid;

    // Feature: event-ingest-api, Property 3: Auto-generated UUID v7
    // **Validates: Requirements 1.3**

    /// Strategy for generating a random valid IngestPayload WITHOUT event_id.
    fn arb_payload_without_event_id() -> impl Strategy<Value = IngestPayload> {
        (
            "[a-zA-Z0-9_]{1,128}",   // event_name
            "[a-zA-Z0-9_]{1,64}",    // project_id
            proptest::bool::ANY,      // has_profile_id
            "[a-zA-Z0-9_]{1,64}",    // profile_id_val
            proptest::bool::ANY,      // has_cts
            proptest::num::i64::ANY,  // cts_val
        )
            .prop_map(
                |(event_name, project_id, has_profile_id, profile_id_val, has_cts, cts_val)| {
                    IngestPayload {
                        event_name,
                        project_id,
                        event_id: None, // always None — this is the property under test
                        profile_id: if has_profile_id { Some(profile_id_val) } else { None },
                        cts: if has_cts { Some(cts_val) } else { None },
                        props: None,
                        ctx: None,
                        profile_props: None,
                    }
                },
            )
    }

    // Feature: event-ingest-api, Property 4: Server timestamp population
    // **Validates: Requirements 1.4, 4.1**

    /// Strategy for generating a random valid IngestPayload for timestamp testing.
    fn arb_payload_for_sts() -> impl Strategy<Value = IngestPayload> {
        (
            "[a-zA-Z0-9_]{1,128}",   // event_name
            "[a-zA-Z0-9_]{1,64}",    // project_id
            proptest::option::of("[a-zA-Z0-9_]{1,64}"),  // event_id
            proptest::option::of("[a-zA-Z0-9_]{1,64}"),  // profile_id
            proptest::option::of(proptest::num::i64::ANY), // cts
        )
            .prop_map(
                |(event_name, project_id, event_id, profile_id, cts)| {
                    IngestPayload {
                        event_name,
                        project_id,
                        event_id,
                        profile_id,
                        cts,
                        props: None,
                        ctx: None,
                        profile_props: None,
                    }
                },
            )
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// For any accepted event, the enriched output SHALL have the `sts` field
        /// set to a UTC epoch milliseconds value within ±1 second of actual server time.
        #[test]
        fn prop_server_timestamp_within_one_second_of_now(
            payload in arb_payload_for_sts(),
        ) {
            let before = Utc::now().timestamp_millis();
            let enriched = enrich(&payload);
            let after = Utc::now().timestamp_millis();

            // sts must be between [before, after] (tight bound)
            prop_assert!(
                enriched.sts >= before && enriched.sts <= after,
                "sts ({}) should be between before ({}) and after ({})",
                enriched.sts, before, after
            );

            // sts must also be within ±1000ms of "now" (the ±1s window from the property)
            let now = Utc::now().timestamp_millis();
            let diff = (enriched.sts - now).abs();
            prop_assert!(
                diff <= 1000,
                "sts ({}) should be within ±1000ms of now ({}), diff = {}",
                enriched.sts, now, diff
            );
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// For any accepted event without a client-provided event_id,
        /// the enriched event_id SHALL be a valid UUID v7.
        #[test]
        fn prop_auto_generated_event_id_is_valid_uuid_v7(
            payload in arb_payload_without_event_id(),
        ) {
            let enriched = enrich(&payload);

            // 1. The event_id must parse as a valid UUID
            let parsed = Uuid::parse_str(&enriched.event_id)
                .expect("enriched event_id should be a valid UUID");

            // 2. The UUID must be version 7
            prop_assert_eq!(
                parsed.get_version_num(),
                7,
                "enriched event_id should be UUID v7, got version {}",
                parsed.get_version_num()
            );
        }

        /// Multiple enrichments of payloads without event_id SHALL produce
        /// unique UUIDs across invocations.
        #[test]
        fn prop_auto_generated_event_ids_are_unique(
            payloads in proptest::collection::vec(arb_payload_without_event_id(), 2..=20),
        ) {
            let ids: Vec<String> = payloads.iter().map(|p| enrich(p).event_id).collect();
            let unique: HashSet<&String> = ids.iter().collect();

            prop_assert_eq!(
                ids.len(),
                unique.len(),
                "all auto-generated event_ids should be unique, but got duplicates"
            );
        }
    }

    // Feature: event-ingest-api, Property 7: Client timestamp round-trip
    // **Validates: Requirements 4.2, 4.3**

    /// Strategy for generating a valid IngestPayload with a provided cts value.
    fn arb_payload_with_cts() -> impl Strategy<Value = IngestPayload> {
        (
            "[a-zA-Z0-9_]{1,128}",   // event_name
            "[a-zA-Z0-9_]{1,64}",    // project_id
            proptest::num::i64::ANY,  // cts value
        )
            .prop_map(|(event_name, project_id, cts_val)| {
                IngestPayload {
                    event_name,
                    project_id,
                    event_id: None,
                    profile_id: None,
                    cts: Some(cts_val),
                    props: None,
                    ctx: None,
                    profile_props: None,
                }
            })
    }

    /// Strategy for generating a valid IngestPayload without a cts value.
    fn arb_payload_without_cts() -> impl Strategy<Value = IngestPayload> {
        (
            "[a-zA-Z0-9_]{1,128}",   // event_name
            "[a-zA-Z0-9_]{1,64}",    // project_id
        )
            .prop_map(|(event_name, project_id)| {
                IngestPayload {
                    event_name,
                    project_id,
                    event_id: None,
                    profile_id: None,
                    cts: None,
                    props: None,
                    ctx: None,
                    profile_props: None,
                }
            })
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// For any event where the client provides a `cts` value,
        /// the enriched output `cts` SHALL equal the input `cts` exactly.
        #[test]
        fn prop_client_cts_preserved_exactly(
            payload in arb_payload_with_cts(),
        ) {
            let input_cts = payload.cts;
            let enriched = enrich(&payload);

            prop_assert_eq!(
                enriched.cts, input_cts,
                "enriched cts ({:?}) should equal input cts ({:?})",
                enriched.cts, input_cts
            );
        }

        /// For any event where the client does not provide `cts`,
        /// the enriched output `cts` SHALL be `None`.
        #[test]
        fn prop_missing_cts_stays_none(
            payload in arb_payload_without_cts(),
        ) {
            let enriched = enrich(&payload);

            prop_assert_eq!(
                enriched.cts, None,
                "enriched cts should be None when client does not provide cts, got {:?}",
                enriched.cts
            );
        }
    }
}

