use std::time::{Duration, Instant};

use dashmap::DashMap;
use tracing::warn;

/// Rate-limited Sentry exception reporter.
///
/// Uses a `DashMap<String, Instant>` to track the last report time per unique
/// exception title. If the elapsed time since the last report is less than the
/// configured window, the report is suppressed.
pub struct SentryReporter {
    rate_limiter: DashMap<String, Instant>,
    window: Duration,
}

impl SentryReporter {
    /// Create a new `SentryReporter` with the given rate-limit window in seconds.
    pub fn new(rate_limit_seconds: u64) -> Self {
        Self {
            rate_limiter: DashMap::new(),
            window: Duration::from_secs(rate_limit_seconds),
        }
    }

    /// Reports an exception to Sentry if it has not been reported within the
    /// configured time window. The exception's `Display` representation is used
    /// as the rate-limiting key (title).
    pub fn report(&self, exception: &anyhow::Error) {
        let title = exception.to_string();

        if self.is_rate_limited(&title) {
            warn!(
                exception_title = %title,
                "Sentry report suppressed (rate-limited)"
            );
            return;
        }

        // Record the report time *before* sending so concurrent calls for the
        // same title within the same instant are also deduplicated.
        self.rate_limiter.insert(title.clone(), Instant::now());

        sentry::capture_message(&title, sentry::Level::Error);
    }

    /// Returns `true` if the given title has been reported within the configured
    /// time window and should therefore be suppressed.
    pub fn is_rate_limited(&self, title: &str) -> bool {
        if let Some(last_reported) = self.rate_limiter.get(title) {
            last_reported.elapsed() < self.window
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;
    use std::thread;

    #[test]
    fn test_first_report_is_not_rate_limited() {
        let reporter = SentryReporter::new(300);
        assert!(!reporter.is_rate_limited("some error"));
    }

    #[test]
    fn test_duplicate_within_window_is_rate_limited() {
        let reporter = SentryReporter::new(300);
        // Simulate a first report by inserting directly.
        reporter
            .rate_limiter
            .insert("some error".to_string(), Instant::now());

        assert!(reporter.is_rate_limited("some error"));
    }

    #[test]
    fn test_different_titles_are_independent() {
        let reporter = SentryReporter::new(300);
        reporter
            .rate_limiter
            .insert("error A".to_string(), Instant::now());

        assert!(reporter.is_rate_limited("error A"));
        assert!(!reporter.is_rate_limited("error B"));
    }

    #[test]
    fn test_expired_window_allows_new_report() {
        // Use a tiny window so it expires quickly.
        let reporter = SentryReporter::new(0);
        reporter
            .rate_limiter
            .insert("some error".to_string(), Instant::now());

        // Even a 0-second window should expire after a small sleep.
        thread::sleep(Duration::from_millis(5));
        assert!(!reporter.is_rate_limited("some error"));
    }

    #[test]
    fn test_report_records_timestamp() {
        // Initialise Sentry with a disabled DSN so `capture_message` is a no-op.
        let _guard = sentry::init(sentry::ClientOptions {
            dsn: None,
            ..Default::default()
        });

        let reporter = SentryReporter::new(300);
        let err = anyhow::anyhow!("test error");

        reporter.report(&err);

        // After reporting, the title should be rate-limited.
        assert!(reporter.is_rate_limited("test error"));
    }

    #[test]
    fn test_report_suppresses_duplicate() {
        let _guard = sentry::init(sentry::ClientOptions {
            dsn: None,
            ..Default::default()
        });

        let reporter = SentryReporter::new(300);
        let err = anyhow::anyhow!("duplicate error");

        reporter.report(&err);
        // Second call should be suppressed (rate-limited).
        reporter.report(&err);

        assert!(reporter.is_rate_limited("duplicate error"));
    }

    // Feature: event-ingest-api, Property 11: Sentry rate limiting by exception title
    // **Validates: Requirements 8.3, 8.4**
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// For any sequence of N exceptions with the same title submitted within
        /// a single time window, the SentryReporter SHALL report exactly 1
        /// exception and suppress the remaining N-1.
        #[test]
        fn prop_same_title_rate_limited_after_first_report(
            title in "[a-zA-Z0-9 _-]{1,100}",
            n in 2u32..50u32,
        ) {
            // Initialise Sentry with dsn: None so capture_message is a no-op.
            let _guard = sentry::init(sentry::ClientOptions {
                dsn: None,
                ..Default::default()
            });

            // Large window (300s) so nothing expires during the test.
            let reporter = SentryReporter::new(300);

            // First call should NOT be rate-limited (title is new).
            let err = anyhow::anyhow!("{}", title);
            prop_assert!(
                !reporter.is_rate_limited(&title),
                "Title should not be rate-limited before first report"
            );

            // First report — this inserts the title into the rate limiter.
            reporter.report(&err);

            // After the first report, the title must be rate-limited.
            prop_assert!(
                reporter.is_rate_limited(&title),
                "Title should be rate-limited after first report"
            );

            // Call report() N-1 more times — all should be suppressed.
            for _ in 1..n {
                reporter.report(&err);
            }

            // The rate limiter map should contain exactly 1 entry for this title.
            prop_assert_eq!(
                reporter.rate_limiter.len(),
                1,
                "Rate limiter should contain exactly 1 entry"
            );
            prop_assert!(
                reporter.rate_limiter.contains_key(&title),
                "Rate limiter should contain the reported title"
            );
        }

        /// Different titles should be independently rate-limited: reporting
        /// title A should not rate-limit title B.
        #[test]
        fn prop_different_titles_independently_rate_limited(
            title_a in "[a-zA-Z]{1,50}",
            title_b in "[a-zA-Z]{1,50}",
        ) {
            // Skip when titles happen to be identical.
            prop_assume!(title_a != title_b);

            let _guard = sentry::init(sentry::ClientOptions {
                dsn: None,
                ..Default::default()
            });

            let reporter = SentryReporter::new(300);

            let err_a = anyhow::anyhow!("{}", title_a);
            reporter.report(&err_a);

            // title_a should be rate-limited, title_b should not.
            prop_assert!(
                reporter.is_rate_limited(&title_a),
                "title_a should be rate-limited after report"
            );
            prop_assert!(
                !reporter.is_rate_limited(&title_b),
                "title_b should NOT be rate-limited (never reported)"
            );

            // Now report title_b.
            let err_b = anyhow::anyhow!("{}", title_b);
            reporter.report(&err_b);

            // Both should now be rate-limited independently.
            prop_assert!(reporter.is_rate_limited(&title_a));
            prop_assert!(reporter.is_rate_limited(&title_b));

            // Map should have exactly 2 entries.
            prop_assert_eq!(
                reporter.rate_limiter.len(),
                2,
                "Rate limiter should contain exactly 2 independent entries"
            );
        }
    }
}
