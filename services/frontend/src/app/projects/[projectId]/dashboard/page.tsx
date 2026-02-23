"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BackendAPIClient } from "@/lib/api-client";

interface DashboardMetrics {
  totalEvents: string;
  activeUsers: string;
  reportsRun: string;
}

export default function DashboardPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalEvents: "—",
    activeUsers: "—",
    reportsRun: "—",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchMetrics() {
      setLoading(true);
      setError(null);
      try {
        const api = new BackendAPIClient();
        const config = await api.getConfig(projectId);
        if (!cancelled) {
          setMetrics({
            totalEvents: config.total_events ?? "0",
            activeUsers: config.active_users ?? "0",
            reportsRun: config.reports_run ?? "0",
          });
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load metrics from backend");
          setMetrics({ totalEvents: "0", activeUsers: "0", reportsRun: "0" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMetrics();
    return () => { cancelled = true; };
  }, [projectId]);

  const statCards = [
    { label: "Total Events", value: metrics.totalEvents },
    { label: "Active Users", value: metrics.activeUsers },
    { label: "Reports Run", value: metrics.reportsRun },
    { label: "Project Health", value: "Good" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your analytics project.</p>
      </div>

      {error && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "var(--radius-md)",
          marginBottom: 20,
          fontSize: 14,
          background: "rgba(255, 199, 97, 0.15)",
          color: "#b8860b",
          border: "1px solid rgba(255, 199, 97, 0.3)",
        }}>
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 24,
        marginBottom: 24,
      }}>
        {statCards.map((card) => (
          <div key={card.label} className="ds-card">
            <div className="ds-card-header">{card.label}</div>
            <div className="ds-card-body">
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-default)" }}>
                {loading ? "…" : card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-default)", marginBottom: 16 }}>
          Quick Links
        </h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24,
        }}>
          {[
            { title: "Reports", desc: "Build trend, attribution, and cohort reports", href: `/projects/${projectId}/reports` },
            { title: "Profiles", desc: "Browse user profiles, event summaries, and timelines", href: `/projects/${projectId}/profiles` },
            { title: "Settings", desc: "Configure timezone, feature flags, and project options", href: `/projects/${projectId}/settings` },
            { title: "Team", desc: "Manage team members, roles, and user groups", href: `/projects/${projectId}/users` },
          ].map((link) => (
            <Link key={link.title} href={link.href} className="ds-card" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ds-card-header" style={{ color: "var(--primary)", fontWeight: 600 }}>
                {link.title}
              </div>
              <div className="ds-card-body">
                <p style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  {link.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
