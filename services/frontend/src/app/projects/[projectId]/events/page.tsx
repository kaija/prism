"use client";

import { useParams } from "next/navigation";

export default function EventsPage() {
  const params = useParams<{ projectId: string }>();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Events</h1>
        <p className="page-subtitle">Browse and explore all tracked events for your project.</p>
      </div>
      <div className="ds-card">
        <div className="ds-card-body" style={{ color: "var(--text-muted)", textAlign: "center", padding: 40 }}>
          Event explorer is coming soon. Events are being tracked and processed in the background.
        </div>
      </div>
    </div>
  );
}
