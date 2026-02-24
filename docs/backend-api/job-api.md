# Job API

查詢非同步任務（報表產生等）的執行狀態與結果。

## Base URL

```
/api/v1/jobs
```

---

## 資料模型

### JobStatus

| 欄位 | 型別 | 說明 |
|---|---|---|
| `job_id` | string | 任務 ID |
| `status` | string | `queued`、`running`、`completed`、`failed` |
| `result` | object \| null | 任務結果（completed 時有值） |
| `error` | string \| null | 錯誤訊息（failed 時有值） |
| `created_at` | datetime | 建立時間 |
| `started_at` | datetime \| null | 開始執行時間 |
| `completed_at` | datetime \| null | 完成時間 |

---

## 端點

### GET /{job_id} — 查詢任務狀態

**路徑參數**

| 參數 | 型別 | 說明 |
|---|---|---|
| `job_id` | string | 任務 ID |

**Response — 200 OK**

```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "result": { "rows": [...] },
  "error": null,
  "created_at": "2025-01-01T00:00:00Z",
  "started_at": "2025-01-01T00:00:01Z",
  "completed_at": "2025-01-01T00:00:05Z"
}
```

**Error — 404 Not Found**

```json
{
  "detail": "Job job_abc123 not found"
}
```
