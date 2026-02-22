use anyhow::{Context, Result};
use config::{Config, Environment, File};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default)]
    pub server: ServerConfig,
    #[serde(default)]
    pub kafka: KafkaConfig,
    #[serde(default)]
    pub geoip: GeoIpConfig,
    #[serde(default)]
    pub sentry: SentryConfig,
    #[serde(default)]
    pub logging: LoggingConfig,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ServerConfig {
    #[serde(default = "default_host")]
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default = "default_shutdown_timeout")]
    pub shutdown_timeout: u64,
}

#[derive(Debug, Deserialize, Clone)]
pub struct KafkaConfig {
    #[serde(default)]
    pub bootstrap_servers: String,
    #[serde(default = "default_topic_raw")]
    pub topic_raw: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct GeoIpConfig {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub db_path: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct SentryConfig {
    #[serde(default)]
    pub dsn: Option<String>,
    #[serde(default = "default_rate_limit_seconds")]
    pub rate_limit_seconds: u64,
}

#[derive(Debug, Deserialize, Clone)]
pub struct LoggingConfig {
    #[serde(default = "default_level")]
    pub level: String,
}

// Default value functions
fn default_host() -> String {
    "0.0.0.0".to_string()
}

fn default_port() -> u16 {
    8080
}

fn default_shutdown_timeout() -> u64 {
    30
}

fn default_topic_raw() -> String {
    "event.raw".to_string()
}

fn default_rate_limit_seconds() -> u64 {
    300
}

fn default_level() -> String {
    "info".to_string()
}

// Default trait implementations for nested structs so serde can
// construct them when the entire section is absent from config.
impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: default_host(),
            port: default_port(),
            shutdown_timeout: default_shutdown_timeout(),
        }
    }
}

impl Default for KafkaConfig {
    fn default() -> Self {
        Self {
            bootstrap_servers: String::new(),
            topic_raw: default_topic_raw(),
        }
    }
}

impl Default for GeoIpConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            db_path: String::new(),
        }
    }
}

impl Default for SentryConfig {
    fn default() -> Self {
        Self {
            dsn: None,
            rate_limit_seconds: default_rate_limit_seconds(),
        }
    }
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            level: default_level(),
        }
    }
}

impl AppConfig {
    /// Load configuration with layered precedence:
    /// 1. Hardcoded defaults (via serde defaults + Default impls)
    /// 2. YAML config file (from `CONFIG_FILE` env var or `config/default.yaml`)
    /// 3. Environment variable overrides (prefixed `INGEST_`, separator `__`)
    pub fn load() -> Result<Self> {
        let config_path = std::env::var("CONFIG_FILE")
            .unwrap_or_else(|_| "config/default.yaml".to_string());

        let builder = Config::builder()
            // Layer 1: hardcoded defaults are handled by serde defaults
            // Layer 2: YAML config file (optional — missing file is not an error)
            .add_source(
                File::with_name(&config_path)
                    .format(config::FileFormat::Yaml)
                    .required(false),
            )
            // Layer 3: Environment variable overrides
            .add_source(
                Environment::with_prefix("INGEST")
                    .prefix_separator("_")
                    .separator("__")
                    .try_parsing(true),
            );

        let cfg = builder
            .build()
            .context("Failed to build configuration")?;

        let app_config: AppConfig = cfg.try_deserialize().context(
            "Failed to deserialize configuration. Check that all values are valid.",
        )?;

        app_config.validate()?;

        Ok(app_config)
    }

    /// Validate required fields and return descriptive errors.
    fn validate(&self) -> Result<()> {
        if self.kafka.bootstrap_servers.trim().is_empty() {
            anyhow::bail!(
                "Configuration error: kafka.bootstrap_servers is required and must not be empty. \
                 Set it in the YAML config file or via INGEST_KAFKA__BOOTSTRAP_SERVERS env var."
            );
        }

        if self.geoip.enabled && self.geoip.db_path.trim().is_empty() {
            anyhow::bail!(
                "Configuration error: geoip.db_path is required when geoip.enabled is true. \
                 Set it in the YAML config file or via INGEST_GEOIP__DB_PATH env var."
            );
        }

        Ok(())
    }
}
