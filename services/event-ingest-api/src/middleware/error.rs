use actix_web::error::JsonPayloadError;
use actix_web::{HttpResponse, ResponseError};
use serde::Serialize;
use std::fmt;

use crate::models::validation::{FieldError, ValidationErrors};

/// Consistent JSON error response envelope.
#[derive(Debug, Serialize)]
struct ErrorResponse {
    error: ErrorBody,
}

/// Inner error body with code, message, and optional field-level details.
#[derive(Debug, Serialize)]
struct ErrorBody {
    code: &'static str,
    message: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    details: Vec<FieldError>,
}

/// Centralized API error type for the Event Ingest API.
///
/// Each variant maps to a specific HTTP status code and error code string.
#[derive(Debug)]
pub enum ApiError {
    /// Input validation failed (400).
    Validation(ValidationErrors),
    /// Malformed JSON body (400).
    InvalidJson(String),
    /// Unexpected server error (500).
    Internal(anyhow::Error),
    /// Dependency not ready (503).
    ServiceUnavailable(String),
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::Validation(errs) => write!(f, "Validation error: {}", errs),
            ApiError::InvalidJson(msg) => write!(f, "Invalid JSON: {}", msg),
            ApiError::Internal(err) => write!(f, "Internal error: {}", err),
            ApiError::ServiceUnavailable(msg) => write!(f, "Service unavailable: {}", msg),
        }
    }
}

impl ResponseError for ApiError {
    fn error_response(&self) -> HttpResponse {
        match self {
            ApiError::Validation(errs) => {
                let body = ErrorResponse {
                    error: ErrorBody {
                        code: "VALIDATION_ERROR",
                        message: "Invalid input data".to_string(),
                        details: errs.errors.clone(),
                    },
                };
                HttpResponse::BadRequest().json(body)
            }
            ApiError::InvalidJson(msg) => {
                let body = ErrorResponse {
                    error: ErrorBody {
                        code: "INVALID_JSON",
                        message: msg.clone(),
                        details: Vec::new(),
                    },
                };
                HttpResponse::BadRequest().json(body)
            }
            ApiError::Internal(_) => {
                let body = ErrorResponse {
                    error: ErrorBody {
                        code: "INTERNAL_ERROR",
                        message: "An unexpected error occurred".to_string(),
                        details: Vec::new(),
                    },
                };
                HttpResponse::InternalServerError().json(body)
            }
            ApiError::ServiceUnavailable(msg) => {
                let body = ErrorResponse {
                    error: ErrorBody {
                        code: "SERVICE_UNAVAILABLE",
                        message: msg.clone(),
                        details: Vec::new(),
                    },
                };
                HttpResponse::ServiceUnavailable().json(body)
            }
        }
    }
}

/// Convert Actix JSON payload errors into `ApiError::InvalidJson`.
impl From<JsonPayloadError> for ApiError {
    fn from(err: JsonPayloadError) -> Self {
        ApiError::InvalidJson(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::body::to_bytes;

    /// Helper to extract the JSON body from an HttpResponse.
    async fn response_json(resp: HttpResponse) -> serde_json::Value {
        let body = to_bytes(resp.into_body()).await.unwrap();
        serde_json::from_slice(&body).unwrap()
    }

    #[actix_rt::test]
    async fn test_validation_error_response() {
        let err = ApiError::Validation(ValidationErrors {
            errors: vec![
                FieldError {
                    field: "event_name".to_string(),
                    message: "must be between 1 and 128 characters".to_string(),
                },
                FieldError {
                    field: "project_id".to_string(),
                    message: "must not be empty".to_string(),
                },
            ],
        });

        let resp = err.error_response();
        assert_eq!(resp.status(), actix_web::http::StatusCode::BAD_REQUEST);

        let json = response_json(resp).await;
        assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
        assert_eq!(json["error"]["message"], "Invalid input data");
        assert_eq!(json["error"]["details"].as_array().unwrap().len(), 2);
        assert_eq!(json["error"]["details"][0]["field"], "event_name");
        assert_eq!(json["error"]["details"][1]["field"], "project_id");
    }

    #[actix_rt::test]
    async fn test_invalid_json_error_response() {
        let err = ApiError::InvalidJson("missing field `event_name`".to_string());

        let resp = err.error_response();
        assert_eq!(resp.status(), actix_web::http::StatusCode::BAD_REQUEST);

        let json = response_json(resp).await;
        assert_eq!(json["error"]["code"], "INVALID_JSON");
        assert_eq!(json["error"]["message"], "missing field `event_name`");
        // details should be absent (empty vec is skipped)
        assert!(json["error"].get("details").is_none());
    }

    #[actix_rt::test]
    async fn test_internal_error_response() {
        let err = ApiError::Internal(anyhow::anyhow!("kafka connection failed"));

        let resp = err.error_response();
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::INTERNAL_SERVER_ERROR
        );

        let json = response_json(resp).await;
        assert_eq!(json["error"]["code"], "INTERNAL_ERROR");
        assert_eq!(json["error"]["message"], "An unexpected error occurred");
        // Internal details must not leak to the client
        assert!(json["error"].get("details").is_none());
    }

    #[actix_rt::test]
    async fn test_service_unavailable_error_response() {
        let err = ApiError::ServiceUnavailable("GeoIP database not loaded".to_string());

        let resp = err.error_response();
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::SERVICE_UNAVAILABLE
        );

        let json = response_json(resp).await;
        assert_eq!(json["error"]["code"], "SERVICE_UNAVAILABLE");
        assert_eq!(json["error"]["message"], "GeoIP database not loaded");
    }

    #[actix_rt::test]
    async fn test_validation_error_empty_details() {
        let err = ApiError::Validation(ValidationErrors {
            errors: Vec::new(),
        });

        let resp = err.error_response();
        assert_eq!(resp.status(), actix_web::http::StatusCode::BAD_REQUEST);

        let json = response_json(resp).await;
        assert_eq!(json["error"]["code"], "VALIDATION_ERROR");
        // Empty details vec is skipped in serialization
        assert!(json["error"].get("details").is_none());
    }

    #[test]
    fn test_display_validation() {
        let err = ApiError::Validation(ValidationErrors {
            errors: vec![FieldError {
                field: "event_name".to_string(),
                message: "too long".to_string(),
            }],
        });
        let display = format!("{}", err);
        assert!(display.contains("Validation error"));
        assert!(display.contains("event_name"));
    }

    #[test]
    fn test_display_invalid_json() {
        let err = ApiError::InvalidJson("bad json".to_string());
        assert!(format!("{}", err).contains("Invalid JSON: bad json"));
    }

    #[test]
    fn test_display_internal() {
        let err = ApiError::Internal(anyhow::anyhow!("oops"));
        assert!(format!("{}", err).contains("Internal error: oops"));
    }

    #[test]
    fn test_display_service_unavailable() {
        let err = ApiError::ServiceUnavailable("down".to_string());
        assert!(format!("{}", err).contains("Service unavailable: down"));
    }

    #[test]
    fn test_from_json_payload_error() {
        let payload_err = JsonPayloadError::ContentType;
        let api_err: ApiError = payload_err.into();
        match api_err {
            ApiError::InvalidJson(msg) => {
                assert!(!msg.is_empty());
            }
            other => panic!("Expected InvalidJson, got: {:?}", other),
        }
    }
}
