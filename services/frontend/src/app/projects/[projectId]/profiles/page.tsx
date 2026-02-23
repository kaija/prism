"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ProfileTable } from "@/components/profiles/profile-table";
import { EventSummary } from "@/components/profiles/event-summary";
import { TimelineChart } from "@/components/profiles/timeline-chart";
import { ConditionBuilder } from "@/components/filters/condition-builder";
import { EventSelector } from "@/components/filters/event-selector";
import { BackendAPIClient } from "@/lib/api-client";
import type { ConditionGroup, EventSelection, TimelineBucket, Timeframe } from "@/types/api";

export default function ProfilesPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [conditions, setConditions] = useState<ConditionGroup>({ logic: "and", conditions: [] });
  const [eventSelection, setEventSelection] = useState<EventSelection>({ type: "all" });
  const [appliedFilters, setAppliedFilters] = useState<ConditionGroup | undefined>(undefined);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineBucket[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const handleApplyFilters = () => {
    setAppliedFilters(conditions.conditions.length > 0 ? conditions : undefined);
  };

  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedProfileIds(ids);
  }, []);

  const handleLoadTimeline = async () => {
    if (!selectedProfileIds.length) return;
    setTimelineLoading(true);
    try {
      const api = new BackendAPIClient();
      const timeframe: Timeframe = { type: "relative", relative: "last_30_days" };
      const result = await api.getTimeline(projectId, {
        profile_ids: selectedProfileIds,
        timeframe,
        event_selection: eventSelection.type === "all" ? undefined : eventSelection,
        bucket_size: "day",
      });
      setTimelineData(result);
    } catch {
      setTimelineData([]);
    } finally {
      setTimelineLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profiles</h1>
        <p className="page-subtitle">Browse user profiles, filter by conditions, and view event timelines.</p>
      </div>

      {/* Filters */}
      <div className="ds-card" style={{ marginBottom: 24 }}>
        <div className="ds-card-header">Filters</div>
        <div className="ds-card-body">
          <div style={{ marginBottom: 16 }}>
            <ConditionBuilder value={conditions} onChange={setConditions} />
          </div>
          <EventSelector value={eventSelection} onChange={setEventSelection} />
          <button
            type="button"
            onClick={handleApplyFilters}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-family)",
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Profile table + Event summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, marginBottom: 24 }}>
        <div className="ds-card">
          <div className="ds-card-header">Profile Table</div>
          <div className="ds-card-body">
            <ProfileTable projectId={projectId} filters={appliedFilters} onSelectionChange={handleSelectionChange} />
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-card-header">Event Summary</div>
          <div className="ds-card-body">
            <EventSummary projectId={projectId} profileIds={selectedProfileIds} />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="ds-card">
        <div className="ds-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Timeline</span>
          <button
            type="button"
            onClick={handleLoadTimeline}
            disabled={!selectedProfileIds.length || timelineLoading}
            style={{
              padding: "6px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              cursor: selectedProfileIds.length ? "pointer" : "not-allowed",
              opacity: selectedProfileIds.length ? 1 : 0.5,
              fontFamily: "var(--font-family)",
            }}
          >
            {timelineLoading ? "Loading…" : "Load Timeline"}
          </button>
        </div>
        <div className="ds-card-body">
          <TimelineChart data={timelineData} />
        </div>
      </div>
    </div>
  );
}
