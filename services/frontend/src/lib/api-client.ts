import type {
  ReportRequest,
  JobResponse,
  JobStatus,
  ProfileSummaryRequest,
  Profile,
  EventSummaryItem,
  TimelineRequest,
  TimelineBucket,
  PaginatedResult,
  TriggerSetting,
  TriggerCreate,
  TriggerUpdate,
} from "@/types/api";

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export class BackendAPIClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ?? process.env.BACKEND_API_URL ?? "http://localhost:8000";
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new APIError(
        response.status,
        body || `Request failed with status ${response.status}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ─── Config ──────────────────────────────────────────────────

  async getConfig(projectId: string): Promise<Record<string, string>> {
    return this.request<Record<string, string>>(
      `/projects/${projectId}/config`,
    );
  }

  async setConfig(
    projectId: string,
    key: string,
    value: string,
  ): Promise<void> {
    return this.request<void>(`/projects/${projectId}/config`, {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    });
  }

  // ─── Feature Flags ──────────────────────────────────────────

  async getFeatureFlags(projectId: string): Promise<Record<string, string>> {
    return this.request<Record<string, string>>(
      `/projects/${projectId}/feature-flags`,
    );
  }

  async setFeatureFlag(
    projectId: string,
    key: string,
    value: string,
  ): Promise<void> {
    return this.request<void>(`/projects/${projectId}/feature-flags`, {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    });
  }

  // ─── Reports ────────────────────────────────────────────────

  async submitReport(
    projectId: string,
    request: ReportRequest,
  ): Promise<JobResponse> {
    return this.request<JobResponse>(`/projects/${projectId}/reports`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    return this.request<JobStatus>(`/jobs/${jobId}`);
  }

  // ─── Profiles ───────────────────────────────────────────────

  async queryProfiles(
    projectId: string,
    request: ProfileSummaryRequest,
  ): Promise<PaginatedResult<Profile>> {
    return this.request<PaginatedResult<Profile>>(
      `/projects/${projectId}/profiles`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }

  async getEventSummary(
    projectId: string,
    profileIds: string[],
  ): Promise<EventSummaryItem[]> {
    return this.request<EventSummaryItem[]>(
      `/projects/${projectId}/profiles/event-summary`,
      {
        method: "POST",
        body: JSON.stringify({ profile_ids: profileIds }),
      },
    );
  }

  async getTimeline(
    projectId: string,
    request: TimelineRequest,
  ): Promise<TimelineBucket[]> {
    return this.request<TimelineBucket[]>(
      `/projects/${projectId}/profiles/timeline`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }

  // ─── Triggers ───────────────────────────────────────────────

  async listTriggers(
    projectId: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<TriggerSetting>> {
    return this.request<PaginatedResult<TriggerSetting>>(
      `/projects/${projectId}/triggers?page=${page}&page_size=${pageSize}`,
    );
  }

  async createTrigger(
    projectId: string,
    trigger: TriggerCreate,
  ): Promise<TriggerSetting> {
    return this.request<TriggerSetting>(`/projects/${projectId}/triggers`, {
      method: "POST",
      body: JSON.stringify(trigger),
    });
  }

  async updateTrigger(
    projectId: string,
    ruleId: string,
    trigger: TriggerUpdate,
  ): Promise<TriggerSetting> {
    return this.request<TriggerSetting>(
      `/projects/${projectId}/triggers/${ruleId}`,
      {
        method: "PUT",
        body: JSON.stringify(trigger),
      },
    );
  }

  async deleteTrigger(projectId: string, ruleId: string): Promise<void> {
    return this.request<void>(`/projects/${projectId}/triggers/${ruleId}`, {
      method: "DELETE",
    });
  }
}
