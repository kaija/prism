"use client";

import { useState, useEffect } from "react";
import { BackendAPIClient } from "@/lib/api-client";
import type { EventSummaryItem } from "@/types/api";

export interface EventSummaryProps {
  projectId: string;
  profileIds: string[];
}

const styles = {
  container: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: "0.875rem",
  } as React.CSSProperties,
  title: {
    fontWeight: 600,
    marginBottom: 12,
    color: "#3c4858",
  } as React.CSSProperties,
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #eff0f6",
  } as React.CSSProperties,
  eventName: {
    color: "#3c4858",
    fontWeight: 500,
  } as React.CSSProperties,
  count: {
    color: "#4a77f0",
    fontWeight: 600,
    fontSize: "0.9rem",
  } as React.CSSProperties,
  empty: {
    padding: 24,
    textAlign: "center" as const,
    color: "#8e99a4",
  } as React.CSSProperties,
  loading: {
    padding: 24,
    textAlign: "center" as const,
    color: "#8e99a4",
  } as React.CSSProperties,
};

export function EventSummary({ projectId, profileIds }: EventSummaryProps) {
  const [items, setItems] = useState<EventSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profileIds.length) {
      setItems([]);
      return;
    }

    let cancelled = false;
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const api = new BackendAPIClient();
        const result = await api.getEventSummary(projectId, profileIds);
        if (!cancelled) setItems(result);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSummary();
    return () => { cancelled = true; };
  }, [projectId, profileIds]);

  if (!profileIds.length) {
    return <div style={styles.empty}>Select profiles to view event summary.</div>;
  }

  if (loading) {
    return <div style={styles.loading}>Loading event summary…</div>;
  }

  if (!items.length) {
    return <div style={styles.empty}>No events found for selected profiles.</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Event Summary</div>
      <ul style={styles.list}>
        {items.map((item) => (
          <li key={item.event_name} style={styles.item}>
            <span style={styles.eventName}>{item.event_name}</span>
            <span style={styles.count}>{item.count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
