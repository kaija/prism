use std::collections::HashMap;

use crate::models::event::{EnrichedEvent, IngestPayload};
use crate::services::enrichment::enrich;

/// Represents the result of routing an ingested event.
#[derive(Debug, Clone)]
pub enum RoutedEvent {
    ProfileUpdate {
        profile_id: String,
        project_id: String,
        profile_props: HashMap<String, serde_json::Value>,
        updated_at: i64,
    },
    TrackEvent {
        event: EnrichedEvent,
    },
}

/// Routes an `IngestPayload` based on `event_name`.
pub fn route_event(payload: &IngestPayload, server_ts: i64) -> RoutedEvent {
    if payload.event_name == "profile" {
        let profile_props = payload
            .profile_props
            .clone()
            .or_else(|| payload.props.clone())
            .unwrap_or_default();
        RoutedEvent::ProfileUpdate {
            profile_id: payload.profile_id.clone().unwrap_or_default(),
            project_id: payload.project_id.clone(),
            profile_props,
            updated_at: server_ts,
        }
    } else {
        RoutedEvent::TrackEvent {
            event: enrich(payload),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use proptest::prelude::*;

    fn profile_payload() -> IngestPayload {
        IngestPayload {
            event_name: "profile".to_string(),
            project_id: "proj_123".to_string(),
            event_id: None,
            profile_id: Some("user_42".to_string()),
            cts: None,
            props: None,
            ctx: None,
            profile_props: Some(HashMap::from([
                ("name".to_string(), serde_json::json!("Alice")),
                ("plan".to_string(), serde_json::json!("pro")),
            ])),
        }
    }

    fn track_payload() -> IngestPayload {
        IngestPayload {
            event_name: "page_view".to_string(),
            project_id: "proj_123".to_string(),
            event_id: Some("evt_001".to_string()),
            profile_id: Some("user_42".to_string()),
            cts: Some(1700000000000),
            props: Some(HashMap::from([
                ("page".to_string(), serde_json::json!("/home")),
            ])),
            ctx: Some(HashMap::from([
                ("ua".to_string(), serde_json::json!("Chrome")),
            ])),
            profile_props: None,
        }
    }

    #[test]
    fn test_route_profile_event_produces_profile_update() {
        let server_ts = Utc::now().timestamp_millis();
        let result = route_event(&profile_payload(), server_ts);
        match result {
            RoutedEvent::ProfileUpdate {
                profile_id,
                project_id,
                profile_props,
                updated_at,
            } => {
                assert_eq!(profile_id, "user_42");
                assert_eq!(project_id, "proj_123");
                assert_eq!(profile_props["name"], serde_json::json!("Alice"));
                assert_eq!(profile_props["plan"], serde_json::json!("pro"));
                assert_eq!(updated_at, server_ts);
            }
            _ => panic!("expected ProfileUpdate for event_name == profile"),
        }
    }

    #[test]
    fn test_route_non_profile_event_produces_track_event() {
        let server_ts = Utc::now().timestamp_millis();
        let result = route_event(&track_payload(), server_ts);
        match result {
            RoutedEvent::TrackEvent { event } => {
                assert_eq!(event.event_name, "page_view");
                assert_eq!(event.project_id, "proj_123");
                assert_eq!(event.event_id, "evt_001");
                assert_eq!(event.profile_id, Some("user_42".to_string()));
                assert_eq!(event.cts, Some(1700000000000));
                assert_eq!(event.props["page"], serde_json::json!("/home"));
                assert_eq!(event.ctx["ua"], serde_json::json!("Chrome"));
            }
            _ => panic!("expected TrackEvent for event_name != profile"),
        }
    }

    #[test]
    fn test_route_profile_falls_back_to_props_when_profile_props_missing() {
        let payload = IngestPayload {
            event_name: "profile".to_string(),
            project_id: "proj_1".to_string(),
            event_id: None,
            profile_id: Some("user_1".to_string()),
            cts: None,
            props: Some(HashMap::from([
                ("email".to_string(), serde_json::json!("a@b.com")),
            ])),
            ctx: None,
            profile_props: None,
        };
        let result = route_event(&payload, 1700000000000);
        match result {
            RoutedEvent::ProfileUpdate { profile_props, .. } => {
                assert_eq!(profile_props["email"], serde_json::json!("a@b.com"));
            }
            _ => panic!("expected ProfileUpdate"),
        }
    }

    #[test]
    fn test_route_profile_defaults_empty_when_no_props() {
        let payload = IngestPayload {
            event_name: "profile".to_string(),
            project_id: "proj_1".to_string(),
            event_id: None,
            profile_id: None,
            cts: None,
            props: None,
            ctx: None,
            profile_props: None,
        };
        let result = route_event(&payload, 1700000000000);
        match result {
            RoutedEvent::ProfileUpdate {
                profile_id,
                profile_props,
                ..
            } => {
                assert_eq!(profile_id, "");
                assert!(profile_props.is_empty());
            }
            _ => panic!("expected ProfileUpdate"),
        }
    }

    #[test]
    fn test_route_profile_updated_at_matches_server_ts() {
        let server_ts = 1700000005000i64;
        let result = route_event(&profile_payload(), server_ts);
        match result {
            RoutedEvent::ProfileUpdate { updated_at, .. } => {
                assert_eq!(updated_at, server_ts);
            }
            _ => panic!("expected ProfileUpdate"),
        }
    }

    #[test]
    fn test_route_track_event_generates_event_id_when_missing() {
        let payload = IngestPayload {
            event_name: "click".to_string(),
            project_id: "proj_1".to_string(),
            event_id: None,
            profile_id: None,
            cts: None,
            props: None,
            ctx: None,
            profile_props: None,
        };
        let result = route_event(&payload, Utc::now().timestamp_millis());
        match result {
            RoutedEvent::TrackEvent { event } => {
                assert!(!event.event_id.is_empty());
                let parsed = uuid::Uuid::parse_str(&event.event_id).unwrap();
                assert_eq!(parsed.get_version_num(), 7);
            }
            _ => panic!("expected TrackEvent"),
        }
    }

    #[test]
    fn test_profile_routing_is_case_sensitive() {
        for name in &["Profile", "PROFILE", "pRoFiLe", "profile "] {
            let payload = IngestPayload {
                event_name: name.to_string(),
                project_id: "proj_1".to_string(),
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };
            let result = route_event(&payload, 1000);
            match result {
                RoutedEvent::TrackEvent { .. } => {}
                RoutedEvent::ProfileUpdate { .. } => {
                    panic!("event_name '{}' should NOT route to ProfileUpdate", name)
                }
            }
        }
    }

    #[test]
    fn test_profile_event_prefers_profile_props_over_props() {
        let payload = IngestPayload {
            event_name: "profile".to_string(),
            project_id: "proj_1".to_string(),
            event_id: None,
            profile_id: Some("user_1".to_string()),
            cts: None,
            props: Some(HashMap::from([(
                "from_props".to_string(),
                serde_json::json!(true),
            )])),
            ctx: None,
            profile_props: Some(HashMap::from([(
                "from_profile_props".to_string(),
                serde_json::json!(true),
            )])),
        };
        let result = route_event(&payload, 1000);
        match result {
            RoutedEvent::ProfileUpdate { profile_props, .. } => {
                assert!(profile_props.contains_key("from_profile_props"));
                assert!(
                    !profile_props.contains_key("from_props"),
                    "profile_props should take priority over props"
                );
            }
            _ => panic!("expected ProfileUpdate"),
        }
    }

    // ---------------------------------------------------------------
    // Feature: event-ingest-api, Property 6: Event routing by event_name
    // **Validates: Requirements 3.1, 3.2**
    // ---------------------------------------------------------------

    /// Strategy: generate an IngestPayload with event_name fixed to "profile".
    fn arb_profile_payload() -> impl Strategy<Value = (IngestPayload, i64)> {
        (
            "[a-zA-Z0-9_]{1,64}",                // project_id
            proptest::option::of("[a-zA-Z0-9_]{1,64}"), // profile_id
            proptest::option::of(0..i64::MAX),    // cts
            proptest::bool::ANY,                  // has_props
            proptest::bool::ANY,                  // has_profile_props
            1_000_000_000_000i64..2_000_000_000_000i64, // server_ts
        )
            .prop_map(
                |(project_id, profile_id, cts, has_props, has_profile_props, server_ts)| {
                    let props = if has_props {
                        Some(HashMap::from([("key".to_string(), serde_json::json!("val"))]))
                    } else {
                        None
                    };
                    let profile_props = if has_profile_props {
                        Some(HashMap::from([("pkey".to_string(), serde_json::json!("pval"))]))
                    } else {
                        None
                    };
                    let payload = IngestPayload {
                        event_name: "profile".to_string(),
                        project_id,
                        event_id: None,
                        profile_id,
                        cts,
                        props,
                        ctx: None,
                        profile_props,
                    };
                    (payload, server_ts)
                },
            )
    }

    /// Strategy: generate an IngestPayload with event_name != "profile".
    fn arb_non_profile_payload() -> impl Strategy<Value = (IngestPayload, i64)> {
        (
            "[a-zA-Z0-9_]{1,128}"
                .prop_filter("must not be 'profile'", |s| s != "profile"),
            "[a-zA-Z0-9_]{1,64}",                // project_id
            proptest::option::of("[a-zA-Z0-9_]{1,64}"), // profile_id
            proptest::option::of("[a-zA-Z0-9_-]{1,64}"), // event_id
            proptest::option::of(0..i64::MAX),    // cts
            proptest::bool::ANY,                  // has_props
            1_000_000_000_000i64..2_000_000_000_000i64, // server_ts
        )
            .prop_map(
                |(event_name, project_id, profile_id, event_id, cts, has_props, server_ts)| {
                    let props = if has_props {
                        Some(HashMap::from([("attr".to_string(), serde_json::json!(42))]))
                    } else {
                        None
                    };
                    let payload = IngestPayload {
                        event_name,
                        project_id,
                        event_id,
                        profile_id,
                        cts,
                        props,
                        ctx: None,
                        profile_props: None,
                    };
                    (payload, server_ts)
                },
            )
    }

    /// Sub-property 1: event_name == "profile" -> ProfileUpdate with profile data, no event record.
    #[test]
    fn prop_profile_event_routes_to_profile_update() {
        let mut runner = proptest::test_runner::TestRunner::new(
            proptest::test_runner::Config::with_cases(100),
        );
        runner
            .run(&arb_profile_payload(), |(payload, server_ts)| {
                let result = route_event(&payload, server_ts);
                match result {
                    RoutedEvent::ProfileUpdate {
                        profile_id,
                        project_id,
                        profile_props: _,
                        updated_at,
                    } => {
                        prop_assert_eq!(&project_id, &payload.project_id);
                        prop_assert_eq!(
                            &profile_id,
                            &payload.profile_id.clone().unwrap_or_default()
                        );
                        prop_assert_eq!(updated_at, server_ts);
                    }
                    RoutedEvent::TrackEvent { .. } => {
                        prop_assert!(
                            false,
                            "event_name == 'profile' must produce ProfileUpdate, got TrackEvent"
                        );
                    }
                }
                Ok(())
            })
            .unwrap();
    }

    /// Sub-property 2: event_name != "profile" -> TrackEvent with EnrichedEvent containing attributes in event props.
    #[test]
    fn prop_non_profile_event_routes_to_track_event() {
        let mut runner = proptest::test_runner::TestRunner::new(
            proptest::test_runner::Config::with_cases(100),
        );
        runner
            .run(&arb_non_profile_payload(), |(payload, server_ts)| {
                let result = route_event(&payload, server_ts);
                match result {
                    RoutedEvent::TrackEvent { event } => {
                        prop_assert_eq!(&event.event_name, &payload.event_name);
                        prop_assert_eq!(&event.project_id, &payload.project_id);
                        prop_assert!(!event.event_id.is_empty());
                        if let Some(ref input_props) = payload.props {
                            for (k, v) in input_props {
                                prop_assert_eq!(event.props.get(k), Some(v));
                            }
                        }
                    }
                    RoutedEvent::ProfileUpdate { .. } => {
                        prop_assert!(
                            false,
                            "event_name != 'profile' must produce TrackEvent, got ProfileUpdate"
                        );
                    }
                }
                Ok(())
            })
            .unwrap();
    }
}
