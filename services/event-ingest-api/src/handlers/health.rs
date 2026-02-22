use actix_web::{web, HttpResponse};

use crate::app_state::AppState;

/// GET /healthz — liveness probe.
///
/// Always returns 200 OK with `{ "status": "ok" }`.
/// Requirement 10.1
pub async fn healthz() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({ "status": "ok" }))
}

/// GET /readyz — readiness probe.
///
/// Checks whether all dependencies are ready:
/// - If GeoIP is enabled in config, verifies the GeoIP database is loaded via `is_ready()`.
/// - If GeoIP is disabled, the check is considered passing.
///
/// Returns 200 with `{ "status": "ready", "checks": { "geoip": "ok" } }` when ready,
/// or 503 with `{ "status": "not_ready", "checks": { "geoip": "not_loaded" } }` otherwise.
/// Requirements 10.1, 10.2
pub async fn readyz(state: web::Data<AppState>) -> HttpResponse {
    let geoip_ready = if state.config.geoip.enabled {
        state.geoip_service.is_ready()
    } else {
        true
    };

    if geoip_ready {
        HttpResponse::Ok().json(serde_json::json!({
            "status": "ready",
            "checks": {
                "geoip": "ok"
            }
        }))
    } else {
        HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "status": "not_ready",
            "checks": {
                "geoip": "not_loaded"
            }
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app_state::AppState;
    use crate::config::{AppConfig, GeoIpConfig, KafkaConfig, LoggingConfig, SentryConfig, ServerConfig};
    use crate::services::geoip::GeoIpService;
    use crate::services::kafka::KafkaProducerService;
    use crate::services::sentry_reporter::SentryReporter;
    use actix_web::{test, web, App};
    use std::sync::Arc;

    fn make_app_state(geoip_enabled: bool) -> web::Data<AppState> {
        let geoip_config = GeoIpConfig {
            enabled: geoip_enabled,
            db_path: String::new(),
        };
        // When enabled=false, GeoIpService::new succeeds with no reader (is_ready() == false).
        // This lets us test the 503 path when geoip is enabled but db isn't loaded.
        let geoip_service = GeoIpService::new(&GeoIpConfig {
            enabled: false,
            db_path: String::new(),
        })
        .unwrap();

        let config = AppConfig {
            server: ServerConfig {
                host: "127.0.0.1".to_string(),
                port: 8080,
                shutdown_timeout: 30,
            },
            kafka: KafkaConfig {
                bootstrap_servers: "localhost:9092".to_string(),
                topic_raw: "event.raw".to_string(),
            },
            geoip: geoip_config,
            sentry: SentryConfig {
                dsn: None,
                rate_limit_seconds: 300,
            },
            logging: LoggingConfig {
                level: "info".to_string(),
            },
        };

        web::Data::new(AppState {
            kafka_producer: Arc::new(KafkaProducerService::new_noop()),
            geoip_service: Arc::new(geoip_service),
            sentry_reporter: Arc::new(SentryReporter::new(300)),
            config: Arc::new(config),
        })
    }

    #[actix_web::test]
    async fn test_healthz_returns_200() {
        let app = test::init_service(
            App::new().route("/healthz", web::get().to(healthz)),
        )
        .await;

        let req = test::TestRequest::get().uri("/healthz").to_request();
        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "ok");
    }

    #[actix_web::test]
    async fn test_readyz_returns_200_when_geoip_disabled() {
        let state = make_app_state(false);
        let app = test::init_service(
            App::new()
                .app_data(state)
                .route("/readyz", web::get().to(readyz)),
        )
        .await;

        let req = test::TestRequest::get().uri("/readyz").to_request();
        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), 200);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "ready");
        assert_eq!(body["checks"]["geoip"], "ok");
    }

    #[actix_web::test]
    async fn test_readyz_returns_503_when_geoip_enabled_but_not_loaded() {
        // geoip_enabled=true in config, but the GeoIpService was created with enabled=false
        // (no reader), so is_ready() returns false → 503
        let state = make_app_state(true);
        let app = test::init_service(
            App::new()
                .app_data(state)
                .route("/readyz", web::get().to(readyz)),
        )
        .await;

        let req = test::TestRequest::get().uri("/readyz").to_request();
        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), 503);

        let body: serde_json::Value = test::read_body_json(resp).await;
        assert_eq!(body["status"], "not_ready");
        assert_eq!(body["checks"]["geoip"], "not_loaded");
    }
}
