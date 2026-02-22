#[cfg(test)]
mod tests {
    use crate::config::app_config::AppConfig;
    use std::io::Write;
    use std::sync::Mutex;

    /// Global mutex to serialize tests that manipulate environment variables.
    /// Env vars are process-global, so concurrent access causes flaky tests.
    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    /// Helper: create a temp YAML file and return its path.
    fn write_temp_yaml(content: &str) -> tempfile::NamedTempFile {
        let mut f = tempfile::NamedTempFile::new().unwrap();
        f.write_all(content.as_bytes()).unwrap();
        f.flush().unwrap();
        f
    }

    /// Helper: safely set an env var (unsafe in Rust 2024 edition).
    unsafe fn set_env(key: &str, val: &str) {
        unsafe { std::env::set_var(key, val); }
    }

    /// Helper: safely remove an env var.
    unsafe fn remove_env(key: &str) {
        unsafe { std::env::remove_var(key); }
    }

    /// Helper: clear all INGEST_ prefixed env vars.
    unsafe fn clear_ingest_env_vars() {
        let keys: Vec<String> = std::env::vars()
            .filter(|(k, _)| k.starts_with("INGEST_"))
            .map(|(k, _)| k)
            .collect();
        for k in keys {
            unsafe { std::env::remove_var(&k); }
        }
    }

    #[test]
    fn test_load_from_yaml_file() {
        let _lock = ENV_MUTEX.lock().unwrap();
        let yaml = r#"
server:
  host: "127.0.0.1"
  port: 9090
  shutdown_timeout: 10
kafka:
  bootstrap_servers: "localhost:9092"
  topic_raw: "my.topic"
geoip:
  enabled: false
  db_path: ""
sentry:
  dsn: "https://example@sentry.io/1"
  rate_limit_seconds: 60
logging:
  level: "debug"
"#;
        let tmp = write_temp_yaml(yaml);
        unsafe {
            set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
            clear_ingest_env_vars();
        }

        let cfg = AppConfig::load().expect("should load config from YAML");
        assert_eq!(cfg.server.host, "127.0.0.1");
        assert_eq!(cfg.server.port, 9090);
        assert_eq!(cfg.server.shutdown_timeout, 10);
        assert_eq!(cfg.kafka.bootstrap_servers, "localhost:9092");
        assert_eq!(cfg.kafka.topic_raw, "my.topic");
        assert!(!cfg.geoip.enabled);
        assert_eq!(cfg.sentry.dsn.as_deref(), Some("https://example@sentry.io/1"));
        assert_eq!(cfg.sentry.rate_limit_seconds, 60);
        assert_eq!(cfg.logging.level, "debug");

        unsafe { remove_env("CONFIG_FILE"); }
    }

    #[test]
    fn test_defaults_applied_when_no_file() {
        let _lock = ENV_MUTEX.lock().unwrap();
        unsafe {
            set_env("CONFIG_FILE", "/tmp/nonexistent_config_12345.yaml");
            clear_ingest_env_vars();
            set_env("INGEST_KAFKA__BOOTSTRAP_SERVERS", "localhost:9092");
        }

        let cfg = AppConfig::load().expect("should load with defaults");
        assert_eq!(cfg.server.host, "0.0.0.0");
        assert_eq!(cfg.server.port, 8080);
        assert_eq!(cfg.server.shutdown_timeout, 30);
        assert_eq!(cfg.kafka.topic_raw, "event.raw");
        assert!(!cfg.geoip.enabled);
        assert!(cfg.sentry.dsn.is_none());
        assert_eq!(cfg.sentry.rate_limit_seconds, 300);
        assert_eq!(cfg.logging.level, "info");

        unsafe {
            remove_env("CONFIG_FILE");
            remove_env("INGEST_KAFKA__BOOTSTRAP_SERVERS");
        }
    }

    #[test]
    fn test_env_var_overrides_yaml() {
        let _lock = ENV_MUTEX.lock().unwrap();
        let yaml = r#"
server:
  host: "127.0.0.1"
  port: 3000
kafka:
  bootstrap_servers: "yaml-broker:9092"
logging:
  level: "warn"
"#;
        let tmp = write_temp_yaml(yaml);
        unsafe {
            set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
            clear_ingest_env_vars();
            set_env("INGEST_SERVER__PORT", "4000");
            set_env("INGEST_LOGGING__LEVEL", "error");
        }

        let cfg = AppConfig::load().expect("should load with env overrides");
        assert_eq!(cfg.server.host, "127.0.0.1");
        assert_eq!(cfg.server.port, 4000);
        assert_eq!(cfg.logging.level, "error");
        assert_eq!(cfg.kafka.bootstrap_servers, "yaml-broker:9092");

        unsafe {
            remove_env("CONFIG_FILE");
            remove_env("INGEST_SERVER__PORT");
            remove_env("INGEST_LOGGING__LEVEL");
        }
    }

    #[test]
    fn test_validation_fails_missing_bootstrap_servers() {
        let _lock = ENV_MUTEX.lock().unwrap();
        let yaml = r#"
kafka:
  bootstrap_servers: ""
"#;
        let tmp = write_temp_yaml(yaml);
        unsafe {
            set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
            clear_ingest_env_vars();
        }

        let result = AppConfig::load();
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("kafka.bootstrap_servers"),
            "Error should mention kafka.bootstrap_servers, got: {err_msg}"
        );

        unsafe { remove_env("CONFIG_FILE"); }
    }

    #[test]
    fn test_validation_fails_geoip_enabled_without_db_path() {
        let _lock = ENV_MUTEX.lock().unwrap();
        let yaml = r#"
kafka:
  bootstrap_servers: "localhost:9092"
geoip:
  enabled: true
  db_path: ""
"#;
        let tmp = write_temp_yaml(yaml);
        unsafe {
            set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
            clear_ingest_env_vars();
        }

        let result = AppConfig::load();
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("geoip.db_path"),
            "Error should mention geoip.db_path, got: {err_msg}"
        );

        unsafe { remove_env("CONFIG_FILE"); }
    }

    // Feature: event-ingest-api, Property 12: Environment variables override config file values
    // **Validates: Requirements 7.2**
    mod prop_env_var_override {
        use super::*;
        use proptest::prelude::*;

        /// Strategy for generating a valid server port (1–65535).
        fn port_strategy() -> impl Strategy<Value = u16> {
            1u16..=65535u16
        }

        /// Strategy for generating a non-empty host string (alphanumeric, dots, hyphens).
        fn host_strategy() -> impl Strategy<Value = String> {
            "[a-z][a-z0-9.\\-]{0,30}".prop_filter("must not be empty", |s| !s.is_empty())
        }

        /// Strategy for generating a valid log level string.
        fn log_level_strategy() -> impl Strategy<Value = String> {
            prop_oneof![
                Just("trace".to_string()),
                Just("debug".to_string()),
                Just("info".to_string()),
                Just("warn".to_string()),
                Just("error".to_string()),
            ]
        }

        /// Strategy for generating a non-empty bootstrap_servers string.
        fn bootstrap_servers_strategy() -> impl Strategy<Value = String> {
            "[a-z][a-z0-9\\-]{0,15}:[0-9]{4,5}"
        }

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(100))]

            #[test]
            fn env_vars_override_server_port(
                yaml_port in port_strategy(),
                env_port in port_strategy(),
                yaml_bootstrap in bootstrap_servers_strategy(),
            ) {
                // Ensure YAML and env values differ so the test is meaningful
                prop_assume!(yaml_port != env_port);

                let _lock = ENV_MUTEX.lock().unwrap();

                let yaml = format!(
                    "server:\n  host: \"0.0.0.0\"\n  port: {yaml_port}\nkafka:\n  bootstrap_servers: \"{yaml_bootstrap}\"\n"
                );
                let tmp = write_temp_yaml(&yaml);

                unsafe {
                    set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
                    clear_ingest_env_vars();
                    set_env("INGEST_SERVER__PORT", &env_port.to_string());
                }

                let cfg = AppConfig::load().expect("config should load");
                prop_assert_eq!(cfg.server.port, env_port, "env var should override YAML port");

                unsafe {
                    remove_env("CONFIG_FILE");
                    clear_ingest_env_vars();
                }
            }

            #[test]
            fn env_vars_override_server_host(
                yaml_host in host_strategy(),
                env_host in host_strategy(),
                yaml_bootstrap in bootstrap_servers_strategy(),
            ) {
                prop_assume!(yaml_host != env_host);

                let _lock = ENV_MUTEX.lock().unwrap();

                let yaml = format!(
                    "server:\n  host: \"{yaml_host}\"\nkafka:\n  bootstrap_servers: \"{yaml_bootstrap}\"\n"
                );
                let tmp = write_temp_yaml(&yaml);

                unsafe {
                    set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
                    clear_ingest_env_vars();
                    set_env("INGEST_SERVER__HOST", &env_host);
                }

                let cfg = AppConfig::load().expect("config should load");
                prop_assert_eq!(cfg.server.host, env_host, "env var should override YAML host");

                unsafe {
                    remove_env("CONFIG_FILE");
                    clear_ingest_env_vars();
                }
            }

            #[test]
            fn env_vars_override_logging_level(
                yaml_level in log_level_strategy(),
                env_level in log_level_strategy(),
                yaml_bootstrap in bootstrap_servers_strategy(),
            ) {
                prop_assume!(yaml_level != env_level);

                let _lock = ENV_MUTEX.lock().unwrap();

                let yaml = format!(
                    "logging:\n  level: \"{yaml_level}\"\nkafka:\n  bootstrap_servers: \"{yaml_bootstrap}\"\n"
                );
                let tmp = write_temp_yaml(&yaml);

                unsafe {
                    set_env("CONFIG_FILE", tmp.path().to_str().unwrap());
                    clear_ingest_env_vars();
                    set_env("INGEST_LOGGING__LEVEL", &env_level);
                }

                let cfg = AppConfig::load().expect("config should load");
                prop_assert_eq!(cfg.logging.level, env_level, "env var should override YAML logging level");

                unsafe {
                    remove_env("CONFIG_FILE");
                    clear_ingest_env_vars();
                }
            }
        }
    }
}
