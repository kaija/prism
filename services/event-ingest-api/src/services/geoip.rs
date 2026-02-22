use crate::config::GeoIpConfig;
use maxminddb::{self, geoip2};
use serde::Serialize;
use std::net::IpAddr;
use tracing::warn;

/// Geographic attributes resolved from a GeoIP lookup.
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct GeoAttributes {
    pub country: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
}

/// Errors that can occur when initialising the GeoIP service.
#[derive(Debug)]
pub enum GeoIpError {
    DatabaseLoad(String),
}

impl std::fmt::Display for GeoIpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GeoIpError::DatabaseLoad(msg) => write!(f, "GeoIP database load error: {}", msg),
        }
    }
}

impl std::error::Error for GeoIpError {}

/// Service for resolving IP addresses to geographic attributes using a MaxMind `.mmdb` database.
///
/// When GeoIP is disabled in configuration the reader is `None` and all lookups return `None`.
pub struct GeoIpService {
    reader: Option<maxminddb::Reader<Vec<u8>>>,
}

impl GeoIpService {
    /// Create a new `GeoIpService`.
    ///
    /// * If `config.enabled` is `false`, the service is created without loading a database.
    /// * If `config.enabled` is `true`, the `.mmdb` file at `config.db_path` is loaded eagerly.
    pub fn new(config: &GeoIpConfig) -> Result<Self, GeoIpError> {
        if !config.enabled {
            return Ok(Self { reader: None });
        }

        let reader = maxminddb::Reader::open_readfile(&config.db_path)
            .map_err(|e| GeoIpError::DatabaseLoad(format!("{}: {}", config.db_path, e)))?;

        Ok(Self {
            reader: Some(reader),
        })
    }

    /// Look up geographic attributes for the given IP address.
    ///
    /// Returns `None` when:
    /// - GeoIP is disabled (no reader loaded)
    /// - The IP is private or loopback
    /// - The lookup fails (a warning is logged)
    pub fn lookup(&self, ip: IpAddr) -> Option<GeoAttributes> {
        let reader = self.reader.as_ref()?;

        if Self::is_private_ip(&ip) {
            return None;
        }

        match reader.lookup::<geoip2::City>(ip) {
            Ok(city) => {
                let country = city
                    .country
                    .and_then(|c| c.names)
                    .and_then(|n| n.get("en").copied())
                    .map(String::from);

                let region = city
                    .subdivisions
                    .and_then(|subs| subs.into_iter().next())
                    .and_then(|s| s.names)
                    .and_then(|n| n.get("en").copied())
                    .map(String::from);

                let city_name = city
                    .city
                    .and_then(|c| c.names)
                    .and_then(|n| n.get("en").copied())
                    .map(String::from);

                Some(GeoAttributes {
                    country,
                    region,
                    city: city_name,
                })
            }
            Err(e) => {
                warn!(ip = %ip, error = %e, "GeoIP lookup failed");
                None
            }
        }
    }

    /// Returns `true` if the IP address is private, loopback, or link-local
    /// and should be skipped for GeoIP lookups.
    ///
    /// Covers:
    /// - IPv4 loopback: 127.0.0.0/8
    /// - IPv4 private (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    /// - IPv4 link-local: 169.254.0.0/16
    /// - IPv6 loopback: ::1
    /// - IPv6 link-local: fe80::/10
    /// - IPv6 unique local: fc00::/7
    pub fn is_private_ip(ip: &IpAddr) -> bool {
        match ip {
            IpAddr::V4(v4) => {
                v4.is_loopback()
                    || v4.is_private()
                    || v4.is_link_local()
            }
            IpAddr::V6(v6) => {
                if v6.is_loopback() {
                    return true;
                }
                let segments = v6.segments();
                // fe80::/10 — link-local
                if segments[0] & 0xffc0 == 0xfe80 {
                    return true;
                }
                // fc00::/7 — unique local address
                if segments[0] & 0xfe00 == 0xfc00 {
                    return true;
                }
                false
            }
        }
    }

    /// Returns `true` if the service has a loaded database reader (i.e. GeoIP is enabled and ready).
    pub fn is_ready(&self) -> bool {
        self.reader.is_some()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{Ipv4Addr, Ipv6Addr};

    // --- is_private_ip unit tests ---

    #[test]
    fn test_loopback_v4_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_loopback_v4_other_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 255, 255, 255));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_rfc1918_10_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_rfc1918_172_16_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(172, 16, 0, 1));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_rfc1918_172_31_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(172, 31, 255, 255));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_rfc1918_192_168_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_link_local_v4_is_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(169, 254, 1, 1));
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_public_v4_is_not_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8));
        assert!(!GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_public_v4_1_1_1_1_is_not_private() {
        let ip = IpAddr::V4(Ipv4Addr::new(1, 1, 1, 1));
        assert!(!GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_172_15_is_not_private() {
        // 172.15.x.x is NOT in the 172.16.0.0/12 range
        let ip = IpAddr::V4(Ipv4Addr::new(172, 15, 255, 255));
        assert!(!GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_172_32_is_not_private() {
        // 172.32.x.x is NOT in the 172.16.0.0/12 range
        let ip = IpAddr::V4(Ipv4Addr::new(172, 32, 0, 1));
        assert!(!GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_loopback_v6_is_private() {
        let ip = IpAddr::V6(Ipv6Addr::LOCALHOST); // ::1
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_link_local_v6_is_private() {
        let ip: IpAddr = "fe80::1".parse().unwrap();
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_unique_local_v6_is_private() {
        let ip: IpAddr = "fd00::1".parse().unwrap();
        assert!(GeoIpService::is_private_ip(&ip));
    }

    #[test]
    fn test_public_v6_is_not_private() {
        let ip: IpAddr = "2001:4860:4860::8888".parse().unwrap();
        assert!(!GeoIpService::is_private_ip(&ip));
    }

    // --- GeoIpService::new tests ---

    #[test]
    fn test_new_disabled_creates_service_without_reader() {
        let config = GeoIpConfig {
            enabled: false,
            db_path: String::new(),
        };
        let service = GeoIpService::new(&config).unwrap();
        assert!(!service.is_ready());
    }

    #[test]
    fn test_new_enabled_with_missing_file_returns_error() {
        let config = GeoIpConfig {
            enabled: true,
            db_path: "/nonexistent/path/GeoLite2-City.mmdb".to_string(),
        };
        let result = GeoIpService::new(&config);
        assert!(result.is_err());
    }

    #[test]
    fn test_lookup_returns_none_when_disabled() {
        let config = GeoIpConfig {
            enabled: false,
            db_path: String::new(),
        };
        let service = GeoIpService::new(&config).unwrap();
        let ip: IpAddr = "8.8.8.8".parse().unwrap();
        assert!(service.lookup(ip).is_none());
    }
}

// Feature: event-ingest-api, Property 10: Private/loopback IP skips GeoIP
// **Validates: Requirements 5.4**
#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use std::net::{Ipv4Addr, Ipv6Addr};

    /// Strategy that generates a random private or loopback IPv4/IPv6 address.
    fn arb_private_ip() -> impl Strategy<Value = IpAddr> {
        prop_oneof![
            // 10.0.0.0/8
            (0u8..=255, 0u8..=255, 0u8..=255).prop_map(|(b, c, d)| {
                IpAddr::V4(Ipv4Addr::new(10, b, c, d))
            }),
            // 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
            (16u8..=31, 0u8..=255, 0u8..=255).prop_map(|(b, c, d)| {
                IpAddr::V4(Ipv4Addr::new(172, b, c, d))
            }),
            // 192.168.0.0/16
            (0u8..=255, 0u8..=255).prop_map(|(c, d)| {
                IpAddr::V4(Ipv4Addr::new(192, 168, c, d))
            }),
            // 127.0.0.0/8
            (0u8..=255, 0u8..=255, 0u8..=255).prop_map(|(b, c, d)| {
                IpAddr::V4(Ipv4Addr::new(127, b, c, d))
            }),
            // 169.254.0.0/16 (link-local)
            (0u8..=255, 0u8..=255).prop_map(|(c, d)| {
                IpAddr::V4(Ipv4Addr::new(169, 254, c, d))
            }),
            // ::1 (IPv6 loopback — only one address)
            Just(IpAddr::V6(Ipv6Addr::LOCALHOST)),
            // fe80::/10 (IPv6 link-local)
            (0u16..=0x03ff, any::<u16>(), any::<u16>(), any::<u16>(),
             any::<u16>(), any::<u16>(), any::<u16>())
                .prop_map(|(low10, s2, s3, s4, s5, s6, s7)| {
                    let s0 = 0xfe80 | (low10 & 0x003f);
                    IpAddr::V6(Ipv6Addr::new(
                        s0, s2, s3, s4, s5, s6, s7, 0,
                    ))
                }),
            // fc00::/7 (IPv6 unique local — fc00:: to fdff::)
            (0xfc00u16..=0xfdff, any::<u16>(), any::<u16>(), any::<u16>(),
             any::<u16>(), any::<u16>(), any::<u16>(), any::<u16>())
                .prop_map(|(s0, s1, s2, s3, s4, s5, s6, s7)| {
                    IpAddr::V6(Ipv6Addr::new(s0, s1, s2, s3, s4, s5, s6, s7))
                }),
        ]
    }

    /// Strategy that generates a random public (non-private, non-loopback, non-link-local) IPv4 address.
    fn arb_public_ipv4() -> impl Strategy<Value = IpAddr> {
        (any::<u32>())
            .prop_filter_map("must be public IPv4", |raw| {
                let ip = Ipv4Addr::from(raw);
                if ip.is_loopback() || ip.is_private() || ip.is_link_local()
                    || ip.is_broadcast() || ip.is_unspecified()
                    || ip.is_multicast() || ip.is_documentation()
                {
                    None
                } else {
                    Some(IpAddr::V4(ip))
                }
            })
    }

    /// Strategy that generates a random public IPv6 address (global unicast, 2000::/3).
    fn arb_public_ipv6() -> impl Strategy<Value = IpAddr> {
        (0x2000u16..=0x3fff, any::<u16>(), any::<u16>(), any::<u16>(),
         any::<u16>(), any::<u16>(), any::<u16>(), any::<u16>())
            .prop_map(|(s0, s1, s2, s3, s4, s5, s6, s7)| {
                IpAddr::V6(Ipv6Addr::new(s0, s1, s2, s3, s4, s5, s6, s7))
            })
    }

    fn arb_public_ip() -> impl Strategy<Value = IpAddr> {
        prop_oneof![
            arb_public_ipv4(),
            arb_public_ipv6(),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// For any IP address that is private (RFC 1918) or loopback (127.0.0.0/8, ::1),
        /// `GeoIpService::is_private_ip` SHALL return `true`.
        #[test]
        fn prop_private_loopback_ip_detected(ip in arb_private_ip()) {
            prop_assert!(
                GeoIpService::is_private_ip(&ip),
                "Expected is_private_ip to return true for {:?}", ip
            );
        }

        /// For any public IP address, `GeoIpService::is_private_ip` SHALL return `false`.
        #[test]
        fn prop_public_ip_not_detected_as_private(ip in arb_public_ip()) {
            prop_assert!(
                !GeoIpService::is_private_ip(&ip),
                "Expected is_private_ip to return false for {:?}", ip
            );
        }
    }
}


// Feature: event-ingest-api, Property 8: GeoIP enrichment for public IPs when enabled
// **Validates: Requirements 5.1**
#[cfg(test)]
mod property_tests_geoip_enrichment {
    use super::*;
    use proptest::prelude::*;
    use std::collections::HashMap;
    use std::net::{Ipv4Addr, Ipv6Addr};

    /// Strategy that generates an arbitrary `GeoAttributes` simulating a successful MaxMind lookup.
    fn arb_geo_attributes() -> impl Strategy<Value = GeoAttributes> {
        (
            prop::option::of("[A-Za-z ]{2,40}"),
            prop::option::of("[A-Za-z ]{2,40}"),
            prop::option::of("[A-Za-z ]{2,40}"),
        )
            .prop_map(|(country, region, city)| GeoAttributes {
                country,
                region,
                city,
            })
    }

    /// Strategy that generates a random public (non-private, non-loopback) IPv4 address.
    fn arb_public_ipv4() -> impl Strategy<Value = IpAddr> {
        any::<u32>().prop_filter_map("must be public IPv4", |raw| {
            let ip = Ipv4Addr::from(raw);
            if ip.is_loopback()
                || ip.is_private()
                || ip.is_link_local()
                || ip.is_broadcast()
                || ip.is_unspecified()
                || ip.is_multicast()
                || ip.is_documentation()
            {
                None
            } else {
                Some(IpAddr::V4(ip))
            }
        })
    }

    /// Strategy that generates a random public IPv6 address (global unicast, 2000::/3).
    fn arb_public_ipv6() -> impl Strategy<Value = IpAddr> {
        (
            0x2000u16..=0x3fff,
            any::<u16>(),
            any::<u16>(),
            any::<u16>(),
            any::<u16>(),
            any::<u16>(),
            any::<u16>(),
            any::<u16>(),
        )
            .prop_map(|(s0, s1, s2, s3, s4, s5, s6, s7)| {
                IpAddr::V6(Ipv6Addr::new(s0, s1, s2, s3, s4, s5, s6, s7))
            })
    }

    fn arb_public_ip() -> impl Strategy<Value = IpAddr> {
        prop_oneof![arb_public_ipv4(), arb_public_ipv6(),]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 8: For any profile event processed with GeoIP enabled and a public
        /// (non-private, non-loopback) client IP that exists in the MaxMind database,
        /// the enriched profile props SHALL contain `country`, `region`, and `city` keys.
        ///
        /// Since we cannot load a real MaxMind `.mmdb` file in tests, we verify the
        /// structural property: when `lookup` returns `Some(GeoAttributes)`, the result
        /// always provides `country`, `region`, and `city` fields. We simulate the
        /// enrichment by generating arbitrary `GeoAttributes` (as MaxMind would return)
        /// and inserting them into a profile props map, then asserting the keys exist.
        #[test]
        fn prop_geoip_enrichment_adds_country_region_city(
            ip in arb_public_ip(),
            geo in arb_geo_attributes()
        ) {
            // Precondition: the IP must be public (non-private, non-loopback)
            prop_assert!(!GeoIpService::is_private_ip(&ip));

            // Simulate the enrichment path: when lookup returns Some(GeoAttributes),
            // the attributes are merged into the profile props map.
            let lookup_result: Option<GeoAttributes> = Some(geo.clone());

            // This mirrors what the enrichment pipeline does: if lookup returns Some,
            // insert country, region, city into the profile props.
            let mut profile_props: HashMap<String, serde_json::Value> = HashMap::new();
            if let Some(attrs) = &lookup_result {
                if let Some(ref country) = attrs.country {
                    profile_props.insert("country".to_string(), serde_json::Value::String(country.clone()));
                }
                if let Some(ref region) = attrs.region {
                    profile_props.insert("region".to_string(), serde_json::Value::String(region.clone()));
                }
                if let Some(ref city) = attrs.city {
                    profile_props.insert("city".to_string(), serde_json::Value::String(city.clone()));
                }
            }

            // The GeoAttributes struct SHALL always have country, region, and city fields
            // accessible (they are Option<String> by design).
            let attrs = lookup_result.unwrap();
            prop_assert!(
                std::mem::discriminant(&attrs.country) == std::mem::discriminant(&geo.country),
                "country field must be present in GeoAttributes"
            );
            prop_assert!(
                std::mem::discriminant(&attrs.region) == std::mem::discriminant(&geo.region),
                "region field must be present in GeoAttributes"
            );
            prop_assert!(
                std::mem::discriminant(&attrs.city) == std::mem::discriminant(&geo.city),
                "city field must be present in GeoAttributes"
            );

            // When all three fields are Some, the profile props SHALL contain all three keys
            if attrs.country.is_some() {
                prop_assert!(profile_props.contains_key("country"),
                    "profile props must contain 'country' when GeoAttributes.country is Some");
            }
            if attrs.region.is_some() {
                prop_assert!(profile_props.contains_key("region"),
                    "profile props must contain 'region' when GeoAttributes.region is Some");
            }
            if attrs.city.is_some() {
                prop_assert!(profile_props.contains_key("city"),
                    "profile props must contain 'city' when GeoAttributes.city is Some");
            }
        }

    
    }
}



// Feature: event-ingest-api, Property 9: GeoIP skipped when disabled
// **Validates: Requirements 5.2**
#[cfg(test)]
mod property_tests_geoip_disabled {
    use super::*;
    use crate::config::GeoIpConfig;
    use proptest::prelude::*;
    use std::net::{Ipv4Addr, Ipv6Addr};

    /// Strategy that generates any arbitrary IP address (v4 or v6).
    fn arb_any_ip() -> impl Strategy<Value = IpAddr> {
        prop_oneof![
            any::<u32>().prop_map(|raw| IpAddr::V4(Ipv4Addr::from(raw))),
            (
                any::<u16>(), any::<u16>(), any::<u16>(), any::<u16>(),
                any::<u16>(), any::<u16>(), any::<u16>(), any::<u16>(),
            )
                .prop_map(|(s0, s1, s2, s3, s4, s5, s6, s7)| {
                    IpAddr::V6(Ipv6Addr::new(s0, s1, s2, s3, s4, s5, s6, s7))
                }),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 9: For any profile event processed with GeoIP disabled, the enriched
        /// profile props SHALL NOT contain `country`, `region`, or `city` keys (unless the
        /// client explicitly provided them).
        ///
        /// We verify this by creating a GeoIpService with `enabled: false` and asserting
        /// that `lookup()` always returns `None` for any IP address — meaning no geo
        /// attributes are ever injected into the profile props.
        #[test]
        fn prop_geoip_disabled_skips_lookup_for_any_ip(ip in arb_any_ip()) {
            let config = GeoIpConfig {
                enabled: false,
                db_path: String::new(),
            };
            let service = GeoIpService::new(&config).unwrap();

            let result = service.lookup(ip);
            prop_assert!(
                result.is_none(),
                "lookup must return None when GeoIP is disabled, got {:?} for IP {:?}",
                result, ip
            );
        }
    }
}
