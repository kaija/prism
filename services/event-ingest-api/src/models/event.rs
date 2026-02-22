use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Incoming event payload from clients via POST (JSON body) or GET (query params).
#[derive(Debug, Clone, Deserialize)]
pub struct IngestPayload {
    pub event_name: String,
    pub project_id: String,
    #[serde(default)]
    pub event_id: Option<String>,
    #[serde(default)]
    pub profile_id: Option<String>,
    #[serde(default)]
    pub cts: Option<i64>,
    #[serde(default)]
    pub props: Option<HashMap<String, serde_json::Value>>,
    #[serde(default)]
    pub ctx: Option<HashMap<String, serde_json::Value>>,
    /// Profile properties parsed from `p_`-prefixed query parameters (GET only).
    #[serde(default)]
    pub profile_props: Option<HashMap<String, serde_json::Value>>,
}

/// Enriched event published to Kafka for non-profile events.
#[derive(Debug, Clone, Serialize)]
pub struct EnrichedEvent {
    pub event_id: String,
    pub project_id: String,
    pub event_name: String,
    pub cts: Option<i64>,
    pub sts: i64,
    pub profile_id: Option<String>,
    pub props: HashMap<String, serde_json::Value>,
    pub ctx: HashMap<String, serde_json::Value>,
}

/// Profile update payload published to Kafka when event_name == "profile".
#[derive(Debug, Clone, Serialize)]
pub struct ProfileUpdatePayload {
    pub profile_id: String,
    pub project_id: String,
    pub props: HashMap<String, serde_json::Value>,
    pub updated_at: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_ingest_payload_full() {
        let json = r#"{
            "event_name": "page_view",
            "project_id": "proj_123",
            "event_id": "evt_456",
            "profile_id": "user_789",
            "cts": 1700000000000,
            "props": {"page": "/home"},
            "ctx": {"ua": "Mozilla/5.0"}
        }"#;
        let payload: IngestPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.event_name, "page_view");
        assert_eq!(payload.project_id, "proj_123");
        assert_eq!(payload.event_id.as_deref(), Some("evt_456"));
        assert_eq!(payload.profile_id.as_deref(), Some("user_789"));
        assert_eq!(payload.cts, Some(1700000000000));
        assert!(payload.props.is_some());
        assert!(payload.ctx.is_some());
    }

    #[test]
    fn test_deserialize_ingest_payload_minimal() {
        let json = r#"{"event_name": "click", "project_id": "proj_1"}"#;
        let payload: IngestPayload = serde_json::from_str(json).unwrap();
        assert_eq!(payload.event_name, "click");
        assert_eq!(payload.project_id, "proj_1");
        assert!(payload.event_id.is_none());
        assert!(payload.profile_id.is_none());
        assert!(payload.cts.is_none());
        assert!(payload.props.is_none());
        assert!(payload.ctx.is_none());
    }

    #[test]
    fn test_deserialize_missing_required_field() {
        let json = r#"{"event_name": "click"}"#;
        let result: Result<IngestPayload, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn test_serialize_enriched_event() {
        let event = EnrichedEvent {
            event_id: "01902a3b-0000-7000-8000-000000000000".to_string(),
            project_id: "proj_123".to_string(),
            event_name: "page_view".to_string(),
            cts: Some(1700000000000),
            sts: 1700000001000,
            profile_id: Some("user_789".to_string()),
            props: HashMap::from([("page".to_string(), serde_json::json!("/home"))]),
            ctx: HashMap::new(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert_eq!(json["event_id"], "01902a3b-0000-7000-8000-000000000000");
        assert_eq!(json["sts"], 1700000001000i64);
        assert_eq!(json["props"]["page"], "/home");
    }

    #[test]
    fn test_serialize_enriched_event_no_cts() {
        let event = EnrichedEvent {
            event_id: "test-id".to_string(),
            project_id: "proj_1".to_string(),
            event_name: "click".to_string(),
            cts: None,
            sts: 1700000001000,
            profile_id: None,
            props: HashMap::new(),
            ctx: HashMap::new(),
        };
        let json = serde_json::to_value(&event).unwrap();
        assert!(json["cts"].is_null());
        assert!(json["profile_id"].is_null());
    }

    #[test]
    fn test_serialize_profile_update_payload() {
        let payload = ProfileUpdatePayload {
            profile_id: "user_789".to_string(),
            project_id: "proj_123".to_string(),
            props: HashMap::from([("name".to_string(), serde_json::json!("Alice"))]),
            updated_at: 1700000001000,
        };
        let json = serde_json::to_value(&payload).unwrap();
        assert_eq!(json["profile_id"], "user_789");
        assert_eq!(json["project_id"], "proj_123");
        assert_eq!(json["props"]["name"], "Alice");
        assert_eq!(json["updated_at"], 1700000001000i64);
    }

    #[test]
    fn test_ingest_payload_clone() {
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
        let cloned = payload.clone();
        assert_eq!(cloned.event_name, payload.event_name);
    }
}
