pub mod app_state;
mod config;
mod handlers;
mod middleware;
mod models;
mod services;

use std::sync::Arc;

use actix_web::web::JsonConfig;
use actix_web::{web, App, HttpServer, ResponseError};
use tokio::signal::unix::{signal, SignalKind};
use tracing_subscriber::EnvFilter;

use app_state::AppState;
use config::AppConfig;
use middleware::error::ApiError;
use services::geoip::GeoIpService;
use services::kafka::KafkaProducerService;
use services::sentry_reporter::SentryReporter;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // 1. Load configuration (defaults → YAML → env vars)
    let config = AppConfig::load().expect("Failed to load configuration");

    // 2. Initialize structured JSON logging (Requirement 8.1)
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new(&config.logging.level));
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(env_filter)
        .init();

    // 3. Initialize Sentry SDK if DSN is configured (Requirement 8.2)
    let _sentry_guard = config.sentry.dsn.as_ref().map(|dsn| {
        tracing::info!("Initializing Sentry integration");
        sentry::init((
            dsn.as_str(),
            sentry::ClientOptions {
                release: sentry::release_name!(),
                ..Default::default()
            },
        ))
    });

    // 4. Create GeoIpService (log error and exit if enabled but fails)
    let geoip_service = GeoIpService::new(&config.geoip).unwrap_or_else(|e| {
        tracing::error!(error = %e, "Failed to initialize GeoIP service");
        std::process::exit(1);
    });

    // 5. Create KafkaProducerService
    let kafka_producer = KafkaProducerService::new(&config.kafka).unwrap_or_else(|e| {
        tracing::error!(error = %e, "Failed to initialize Kafka producer");
        std::process::exit(1);
    });

    // 6. Create SentryReporter
    let sentry_reporter = SentryReporter::new(config.sentry.rate_limit_seconds);

    let host = config.server.host.clone();
    let port = config.server.port;
    let shutdown_timeout = config.server.shutdown_timeout;

    // 7. Build AppState with all services wrapped in Arc
    let app_state = web::Data::new(AppState {
        kafka_producer: Arc::new(kafka_producer),
        geoip_service: Arc::new(geoip_service),
        sentry_reporter: Arc::new(sentry_reporter),
        config: Arc::new(config),
    });

    tracing::info!("Starting Event Ingest API on {}:{}", host, port);

    // 8. Configure and run Actix Web server with graceful shutdown (Requirement 9)
    let server = HttpServer::new(move || {
        // Custom JSON error handler: JsonPayloadError → ApiError::InvalidJson
        let json_cfg = JsonConfig::default().error_handler(|err, _req| {
            let api_err = ApiError::InvalidJson(err.to_string());
            actix_web::error::InternalError::from_response(
                err,
                api_err.error_response(),
            )
            .into()
        });

        App::new()
            .app_data(app_state.clone())
            .app_data(json_cfg)
            .route("/ingest", web::post().to(handlers::ingest::ingest_post))
            .route("/ingest", web::get().to(handlers::ingest::ingest_get))
            .route("/healthz", web::get().to(handlers::health::healthz))
            .route("/readyz", web::get().to(handlers::health::readyz))
    })
    .bind((host.as_str(), port))?
    .shutdown_timeout(shutdown_timeout)
    .run();

    let handle = server.handle();

    // Spawn background task to listen for shutdown signals (Requirement 9.1)
    tokio::spawn(async move {
        shutdown_signal().await;
        tracing::info!("Shutdown signal received, stopping server gracefully");
        handle.stop(true).await;
    });

    // Await server completion — blocks until shutdown is finished
    server.await?;

    // Release resources after server stops (Requirement 9.4)
    tracing::info!("Server stopped, releasing resources");

    Ok(())
}

/// Wait for either SIGTERM or SIGINT (Ctrl+C) shutdown signal.
async fn shutdown_signal() {
    let mut sigterm = signal(SignalKind::terminate())
        .expect("Failed to install SIGTERM handler");

    tokio::select! {
        _ = sigterm.recv() => {
            tracing::info!("Received SIGTERM");
        }
        _ = tokio::signal::ctrl_c() => {
            tracing::info!("Received SIGINT (Ctrl+C)");
        }
    }
}
