use serde::Serialize;

use super::event::IngestPayload;

/// A single field-level validation error.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

/// Collection of field-level validation errors.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ValidationErrors {
    pub errors: Vec<FieldError>,
}

impl std::fmt::Display for ValidationErrors {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let messages: Vec<String> = self
            .errors
            .iter()
            .map(|e| format!("{}: {}", e.field, e.message))
            .collect();
        write!(f, "Validation failed: {}", messages.join("; "))
    }
}

impl std::error::Error for ValidationErrors {}

/// Validates an `IngestPayload`, collecting all field-level errors.
///
/// - `event_name`: must be 1–128 characters
/// - `project_id`: must be non-empty
/// - `event_id`: if provided, must be non-empty
pub fn validate(payload: &IngestPayload) -> Result<(), ValidationErrors> {
    let mut errors = Vec::new();

    // Requirement 11.1: event_name is non-empty, max 128 chars
    if payload.event_name.is_empty() {
        errors.push(FieldError {
            field: "event_name".to_string(),
            message: "must be between 1 and 128 characters".to_string(),
        });
    } else if payload.event_name.len() > 128 {
        errors.push(FieldError {
            field: "event_name".to_string(),
            message: "must be between 1 and 128 characters".to_string(),
        });
    }

    // Requirement 11.2: project_id is non-empty
    if payload.project_id.is_empty() {
        errors.push(FieldError {
            field: "project_id".to_string(),
            message: "must not be empty".to_string(),
        });
    }

    // Requirement 11.3: event_id, if provided, must be a valid (non-empty) string
    if let Some(ref event_id) = payload.event_id {
        if event_id.is_empty() {
            errors.push(FieldError {
                field: "event_id".to_string(),
                message: "must not be empty when provided".to_string(),
            });
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(ValidationErrors { errors })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    fn make_payload(event_name: &str, project_id: &str, event_id: Option<&str>) -> IngestPayload {
        IngestPayload {
            event_name: event_name.to_string(),
            project_id: project_id.to_string(),
            event_id: event_id.map(|s| s.to_string()),
            profile_id: None,
            cts: None,
            props: None,
            ctx: None,
            profile_props: None,
        }
    }

    #[test]
    fn test_valid_payload() {
        let payload = make_payload("page_view", "proj_1", None);
        assert!(validate(&payload).is_ok());
    }

    #[test]
    fn test_valid_payload_with_event_id() {
        let payload = make_payload("click", "proj_1", Some("evt_123"));
        assert!(validate(&payload).is_ok());
    }

    #[test]
    fn test_event_name_empty() {
        let payload = make_payload("", "proj_1", None);
        let err = validate(&payload).unwrap_err();
        assert_eq!(err.errors.len(), 1);
        assert_eq!(err.errors[0].field, "event_name");
    }

    #[test]
    fn test_event_name_at_128_chars() {
        let name = "a".repeat(128);
        let payload = make_payload(&name, "proj_1", None);
        assert!(validate(&payload).is_ok());
    }

    #[test]
    fn test_event_name_at_129_chars() {
        let name = "a".repeat(129);
        let payload = make_payload(&name, "proj_1", None);
        let err = validate(&payload).unwrap_err();
        assert_eq!(err.errors[0].field, "event_name");
    }

    #[test]
    fn test_project_id_empty() {
        let payload = make_payload("click", "", None);
        let err = validate(&payload).unwrap_err();
        assert_eq!(err.errors.len(), 1);
        assert_eq!(err.errors[0].field, "project_id");
    }

    #[test]
    fn test_event_id_empty_when_provided() {
        let payload = make_payload("click", "proj_1", Some(""));
        let err = validate(&payload).unwrap_err();
        assert_eq!(err.errors.len(), 1);
        assert_eq!(err.errors[0].field, "event_id");
    }

    #[test]
    fn test_multiple_errors_collected() {
        let payload = make_payload("", "", Some(""));
        let err = validate(&payload).unwrap_err();
        assert_eq!(err.errors.len(), 3);
        let fields: Vec<&str> = err.errors.iter().map(|e| e.field.as_str()).collect();
        assert!(fields.contains(&"event_name"));
        assert!(fields.contains(&"project_id"));
        assert!(fields.contains(&"event_id"));
    }

    #[test]
    fn test_validation_errors_display() {
        let errors = ValidationErrors {
            errors: vec![FieldError {
                field: "event_name".to_string(),
                message: "must be between 1 and 128 characters".to_string(),
            }],
        };
        let display = format!("{}", errors);
        assert!(display.contains("event_name"));
        assert!(display.contains("must be between 1 and 128 characters"));
    }

    #[test]
    fn test_validation_errors_serialize() {
        let errors = ValidationErrors {
            errors: vec![FieldError {
                field: "project_id".to_string(),
                message: "must not be empty".to_string(),
            }],
        };
        let json = serde_json::to_value(&errors).unwrap();
        assert_eq!(json["errors"][0]["field"], "project_id");
        assert_eq!(json["errors"][0]["message"], "must not be empty");
    }

    #[test]
    fn test_event_id_none_is_valid() {
        let payload = make_payload("click", "proj_1", None);
        assert!(validate(&payload).is_ok());
    }

    // Feature: event-ingest-api, Property 1: Valid payload acceptance
    // **Validates: Requirements 1.1, 2.1, 6.1**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_valid_payload_passes_validation(
            event_name in "[a-zA-Z0-9_]{1,128}",
            project_id in "[a-zA-Z0-9_]{1,64}",
            has_event_id in proptest::bool::ANY,
            event_id_val in "[a-zA-Z0-9_]{1,64}",
            has_profile_id in proptest::bool::ANY,
            profile_id_val in "[a-zA-Z0-9_]{1,64}",
            has_cts in proptest::bool::ANY,
            cts_val in proptest::num::i64::ANY,
        ) {
            let event_id = if has_event_id { Some(event_id_val) } else { None };
            let profile_id = if has_profile_id { Some(profile_id_val) } else { None };
            let cts = if has_cts { Some(cts_val) } else { None };

            let payload = IngestPayload {
                event_name,
                project_id,
                event_id,
                profile_id,
                cts,
                props: None,
                ctx: None,
                profile_props: None,
            };

            let result = validate(&payload);
            prop_assert!(result.is_ok(), "Expected Ok for valid payload, got: {:?}", result);
        }
    }

    // Feature: event-ingest-api, Property 2: Invalid payload rejection with field-level errors
    // **Validates: Requirements 1.2, 2.4, 11.1, 11.2, 11.4**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn prop_invalid_payload_rejected_with_field_errors(
            invalid_kind in 0u8..3,
            long_suffix in "[a-zA-Z0-9]{1,100}",
            project_id_empty in proptest::bool::ANY,
            valid_project_id in "[a-zA-Z0-9_]{1,64}",
            valid_event_name in "[a-zA-Z0-9_]{1,128}",
        ) {
            // Generate payloads with at least one invalid field.
            // Scenarios:
            //   0 → empty event_name
            //   1 → event_name > 128 chars
            //   2 → valid event_name but empty project_id

            let (event_name, expect_event_name_error) = match invalid_kind {
                0 => ("".to_string(), true),
                1 => {
                    let over = format!("{}{}", "a".repeat(128), long_suffix);
                    (over, true)
                }
                _ => (valid_event_name.clone(), false),
            };

            let (project_id, expect_project_id_error) = if invalid_kind == 2 {
                // Must have empty project_id to ensure at least one error
                ("".to_string(), true)
            } else if project_id_empty {
                ("".to_string(), true)
            } else {
                (valid_project_id.clone(), false)
            };

            prop_assume!(expect_event_name_error || expect_project_id_error);

            let payload = IngestPayload {
                event_name,
                project_id,
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };

            let result = validate(&payload);
            prop_assert!(result.is_err(), "Expected Err for invalid payload, got Ok");

            let validation_errors = result.unwrap_err();
            prop_assert!(
                !validation_errors.errors.is_empty(),
                "Expected at least one field error"
            );

            let error_fields: Vec<&str> = validation_errors
                .errors
                .iter()
                .map(|e| e.field.as_str())
                .collect();

            if expect_event_name_error {
                prop_assert!(
                    error_fields.contains(&"event_name"),
                    "Expected event_name error, got fields: {:?}",
                    error_fields
                );
            }

            if expect_project_id_error {
                prop_assert!(
                    error_fields.contains(&"project_id"),
                    "Expected project_id error, got fields: {:?}",
                    error_fields
                );
            }

            // Every reported error must have a non-empty message
            for err in &validation_errors.errors {
                prop_assert!(
                    !err.message.is_empty(),
                    "Field error message must not be empty for field: {}",
                    err.field
                );
            }
        }
    }

    // Feature: event-ingest-api, Property: event_name length boundary validation
    // **Validates: Requirements 11.1**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// 1-char event_name is valid
        #[test]
        fn prop_event_name_1_char_valid(
            c in proptest::char::range('a', 'z'),
            project_id in "[a-zA-Z0-9_]{1,64}",
        ) {
            let payload = IngestPayload {
                event_name: c.to_string(),
                project_id,
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };
            let result = validate(&payload);
            prop_assert!(result.is_ok(), "1-char event_name should be valid, got: {:?}", result);
        }

        /// 128-char event_name is valid (upper boundary)
        #[test]
        fn prop_event_name_128_chars_valid(
            chars in proptest::collection::vec(proptest::char::range('a', 'z'), 128..=128),
            project_id in "[a-zA-Z0-9_]{1,64}",
        ) {
            let event_name: String = chars.into_iter().collect();
            prop_assert_eq!(event_name.len(), 128);

            let payload = IngestPayload {
                event_name,
                project_id,
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };
            let result = validate(&payload);
            prop_assert!(result.is_ok(), "128-char event_name should be valid, got: {:?}", result);
        }

        /// Empty event_name (0 chars) is invalid
        #[test]
        fn prop_event_name_empty_invalid(
            project_id in "[a-zA-Z0-9_]{1,64}",
        ) {
            let payload = IngestPayload {
                event_name: String::new(),
                project_id,
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };
            let result = validate(&payload);
            prop_assert!(result.is_err(), "Empty event_name should be invalid");
            let errors = result.unwrap_err();
            let fields: Vec<&str> = errors.errors.iter().map(|e| e.field.as_str()).collect();
            prop_assert!(fields.contains(&"event_name"), "Expected event_name error, got: {:?}", fields);
        }

        /// 129+ char event_name is invalid (over boundary)
        #[test]
        fn prop_event_name_129_plus_invalid(
            extra_len in 1usize..100,
            project_id in "[a-zA-Z0-9_]{1,64}",
        ) {
            let event_name = "a".repeat(128 + extra_len);
            prop_assert!(event_name.len() >= 129);

            let payload = IngestPayload {
                event_name,
                project_id,
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };
            let result = validate(&payload);
            prop_assert!(result.is_err(), "129+ char event_name should be invalid");
            let errors = result.unwrap_err();
            let fields: Vec<&str> = errors.errors.iter().map(|e| e.field.as_str()).collect();
            prop_assert!(fields.contains(&"event_name"), "Expected event_name error, got: {:?}", fields);
        }

        /// Whitespace-only event_name (non-empty) is valid
        #[test]
        fn prop_event_name_whitespace_only_valid(
            len in 1usize..=128,
            project_id in "[a-zA-Z0-9_]{1,64}",
        ) {
            let event_name = " ".repeat(len);
            prop_assert!(!event_name.is_empty());
            prop_assert!(event_name.len() <= 128);

            let payload = IngestPayload {
                event_name,
                project_id,
                event_id: None,
                profile_id: None,
                cts: None,
                props: None,
                ctx: None,
                profile_props: None,
            };
            let result = validate(&payload);
            prop_assert!(result.is_ok(), "Whitespace-only non-empty event_name should be valid, got: {:?}", result);
        }
    }

}
