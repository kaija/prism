use std::sync::Arc;

use crate::config::AppConfig;
use crate::services::geoip::GeoIpService;
use crate::services::kafka::KafkaProducerService;
use crate::services::sentry_reporter::SentryReporter;

/// Shared application state passed to handlers via Actix `web::Data`.
pub struct AppState {
    pub kafka_producer: Arc<KafkaProducerService>,
    pub geoip_service: Arc<GeoIpService>,
    pub sentry_reporter: Arc<SentryReporter>,
    pub config: Arc<AppConfig>,
}
