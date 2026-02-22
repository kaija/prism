use actix_web::{web, HttpRequest, HttpResponse};
use std::collections::HashMap;
use std::net::IpAddr;
use tracing;

use crate::app_state::AppState;
use crate::middleware::error::ApiError;
use crate::models::event::ProfileUpdatePayload;
use crate::models::validation::validate;
use crate::services::enrichment::enrich;
use crate::services::query_parser::parse_query_params;
use crate::services::router::{route_event, RoutedEvent};

/// POST /ingest — accepts a JSON body, validates, enriches, routes, and publishes to Kafka.
///
/// Returns 202 Accepted with `{ "status": "accepted", "event_id": "..." }` on success.
/// Kafka publishing is fire-and-forget via `tokio::spawn`.
pub async fn ingest_post(
    body: web::Json<crate::models::event::IngestPayload>,
    state: web::Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse, ApiError> {
    let payload = body.into_inner();

    // 1. Validate synchronously (Requirement 6.2)
    validate(&payload).map_err(ApiError::Validation)?;

    // 2. Enrich: auto-generate UUID v7 for event_id if missing, set sts (Requirements 1.3, 1.4)
    let enriched = enrich(&payload);
    let event_id = enriched.event_id.clone();
    let server_ts = enriched.sts;

    // 3. Route by event_name (Requirements 3.1, 3.2)
    let routed = route_event(&payload, server_ts);

    // 4. For profile events with GeoIP enabled: look up client IP
    match routed {
        RoutedEvent::ProfileUpdate {
            profile_id,
            project_id,
            mut profile_props,
            updated_at,
        } => {
            // GeoIP enrichment for profile events (Requirement 5.1)
            if state.config.geoip.enabled {
                if let Some(ip) = extract_client_ip(&req) {
                    if let Some(geo) = state.geoip_service.lookup(ip) {
                        if let Some(country) = geo.country {
                            profile_props.insert(
                                "country".to_string(),
                                serde_json::Value::String(country),
                            );
                        }
                        if let Some(region) = geo.region {
                            profile_props.insert(
                                "region".to_string(),
                                serde_json::Value::String(region),
                            );
                        }
                        if let Some(city) = geo.city {
                            profile_props.insert(
                                "city".to_string(),
                                serde_json::Value::String(city),
                            );
                        }
                    }
                }
            }

            let profile_payload = ProfileUpdatePayload {
                profile_id,
                project_id,
                props: profile_props,
                updated_at,
            };

            // 5. Publish to Kafka via tokio::spawn (fire-and-forget, Requirement 6.1)
            let kafka = state.kafka_producer.clone();
            let sentry = state.sentry_reporter.clone();
            tokio::spawn(async move {
                if let Err(e) = kafka.publish_profile(&profile_payload).await {
                    let err = anyhow::anyhow!("Kafka publish_profile failed: {}", e);
                    tracing::error!(error = %e, "Failed to publish profile to Kafka");
                    sentry.report(&err);
                }
            });
        }
        RoutedEvent::TrackEvent { event } => {
            // 5. Publish to Kafka via tokio::spawn (fire-and-forget, Requirement 6.1)
            let kafka = state.kafka_producer.clone();
            let sentry = state.sentry_reporter.clone();
            tokio::spawn(async move {
                if let Err(e) = kafka.publish_event(&event).await {
                    let err = anyhow::anyhow!("Kafka publish_event failed: {}", e);
                    tracing::error!(error = %e, "Failed to publish event to Kafka");
                    sentry.report(&err);
                }
            });
        }
    }

    // 6. Return 202 Accepted immediately (Requirement 6.1)
    Ok(HttpResponse::Accepted().json(serde_json::json!({
        "status": "accepted",
        "event_id": event_id,
    })))
}

/// GET /ingest — accepts query string parameters, validates, enriches, routes, and publishes to Kafka.
///
/// Query parameter mapping:
/// - `event_name`, `project_id`, `profile_id`, `cts`, `event_id` → top-level fields
/// - `e_<key>` → event `props[<key>]` (prefix stripped)
/// - `p_<key>` → profile `props[<key>]` (prefix stripped)
///
/// Returns 202 Accepted with `{ "status": "accepted", "event_id": "..." }` on success.
/// Kafka publishing is fire-and-forget via `tokio::spawn`.
pub async fn ingest_get(
    query: web::Query<HashMap<String, String>>,
    state: web::Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse, ApiError> {
    let params = query.into_inner();

    // 1. Parse query params into IngestPayload (handles e_/p_ prefix stripping)
    let payload = parse_query_params(&params);

    // 2. Validate synchronously (Requirement 6.2)
    validate(&payload).map_err(ApiError::Validation)?;

    // 3. Enrich: auto-generate UUID v7 for event_id if missing, set sts (Requirements 1.3, 1.4)
    let enriched = enrich(&payload);
    let event_id = enriched.event_id.clone();
    let server_ts = enriched.sts;

    // 4. Route by event_name (Requirements 3.1, 3.2)
    let routed = route_event(&payload, server_ts);

    // 5. For profile events with GeoIP enabled: look up client IP
    match routed {
        RoutedEvent::ProfileUpdate {
            profile_id,
            project_id,
            mut profile_props,
            updated_at,
        } => {
            // GeoIP enrichment for profile events (Requirement 5.1)
            if state.config.geoip.enabled {
                if let Some(ip) = extract_client_ip(&req) {
                    if let Some(geo) = state.geoip_service.lookup(ip) {
                        if let Some(country) = geo.country {
                            profile_props.insert(
                                "country".to_string(),
                                serde_json::Value::String(country),
                            );
                        }
                        if let Some(region) = geo.region {
                            profile_props.insert(
                                "region".to_string(),
                                serde_json::Value::String(region),
                            );
                        }
                        if let Some(city) = geo.city {
                            profile_props.insert(
                                "city".to_string(),
                                serde_json::Value::String(city),
                            );
                        }
                    }
                }
            }

            let profile_payload = ProfileUpdatePayload {
                profile_id,
                project_id,
                props: profile_props,
                updated_at,
            };

            // 6. Publish to Kafka via tokio::spawn (fire-and-forget, Requirement 6.1)
            let kafka = state.kafka_producer.clone();
            let sentry = state.sentry_reporter.clone();
            tokio::spawn(async move {
                if let Err(e) = kafka.publish_profile(&profile_payload).await {
                    let err = anyhow::anyhow!("Kafka publish_profile failed: {}", e);
                    tracing::error!(error = %e, "Failed to publish profile to Kafka");
                    sentry.report(&err);
                }
            });
        }
        RoutedEvent::TrackEvent { event } => {
            // 6. Publish to Kafka via tokio::spawn (fire-and-forget, Requirement 6.1)
            let kafka = state.kafka_producer.clone();
            let sentry = state.sentry_reporter.clone();
            tokio::spawn(async move {
                if let Err(e) = kafka.publish_event(&event).await {
                    let err = anyhow::anyhow!("Kafka publish_event failed: {}", e);
                    tracing::error!(error = %e, "Failed to publish event to Kafka");
                    sentry.report(&err);
                }
            });
        }
    }

    // 7. Return 202 Accepted immediately (Requirement 6.1)
    Ok(HttpResponse::Accepted().json(serde_json::json!({
        "status": "accepted",
        "event_id": event_id,
    })))
}


/// Extract the client IP address from the request.
///
/// Checks `X-Forwarded-For` header first (first IP in the chain),
/// then falls back to the peer address.
fn extract_client_ip(req: &HttpRequest) -> Option<IpAddr> {
    // Check X-Forwarded-For header
    if let Some(forwarded_for) = req.headers().get("x-forwarded-for") {
        if let Ok(value) = forwarded_for.to_str() {
            // Take the first IP in the comma-separated list
            if let Some(first_ip) = value.split(',').next() {
                if let Ok(ip) = first_ip.trim().parse::<IpAddr>() {
                    return Some(ip);
                }
            }
        }
    }

    // Fall back to peer address
    req.peer_addr().map(|addr| addr.ip())
}
