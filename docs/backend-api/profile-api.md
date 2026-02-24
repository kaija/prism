# Profile API

Profile 摘要查詢、事件時間軸與事件統計。

## Base URL

```
/api/v1/projects/{project_id}/profiles
```

---

## 端點

### POST /summary — Profile 摘要查詢

根據篩選條件查詢 profile 列表，支援自訂欄位選擇與分頁。

**Request Body**

```json
{
  "filters": {
    "logic": "and",
    "conditions": [
      {"attribute": "country", "operator": "is", "value": "TW"}
    ]
  },
  "columns": ["name", "email", "country"],
  "page": 1,
  "page_size": 20
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `filters` | ConditionGroup \| null | 否 | 篩選條件（參見 [Report API](report-api.md) 的 ConditionGroup） |
| `columns` | string[] | 是 | 要顯示的欄位列表（至少一個） |
| `page` | integer | 否 | 頁碼（預設 1，最小 1） |
| `page_size` | integer | 否 | 每頁筆數（預設 20，1-100） |

**Response — 200 OK**

```json
{
  "items": [
    {"name": "Alice", "email": "[email]", "country": "TW"}
  ],
  "total": 150,
  "page": 1,
  "page_size": 20
}
```

---

### POST /timeline — 事件時間軸

取得一組 profile 的事件時間分佈資料。

**Request Body**

```json
{
  "profile_ids": ["user_001", "user_002"],
  "timeframe": {
    "type": "relative",
    "relative": "last_30_days"
  },
  "event_selection": {
    "type": "all"
  },
  "filters": null,
  "bucket_size": "day"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `profile_ids` | string[] | 是 | Profile ID 列表 |
| `timeframe` | Timeframe | 是 | 時間範圍 |
| `event_selection` | EventSelection \| null | 否 | 事件選擇 |
| `filters` | ConditionGroup \| null | 否 | 篩選條件 |
| `bucket_size` | string | 否 | 時間桶大小：`hour`、`day`、`week`、`month`（預設 `day`） |

**Response — 200 OK**

```json
[
  {"bucket": "2025-01-01", "count": 42},
  {"bucket": "2025-01-02", "count": 38}
]
```

---

### POST /event-summary — 事件統計

取得一組 profile 的事件名稱聚合統計。

**Request Body**

```json
{
  "profile_ids": ["user_001", "user_002"]
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `profile_ids` | string[] | 是 | Profile ID 列表 |

**Response — 200 OK**

```json
[
  {"event_name": "page_view", "count": 120},
  {"event_name": "purchase", "count": 5}
]
```
