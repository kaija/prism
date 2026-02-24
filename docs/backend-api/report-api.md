# Report API

非同步報表產生。提交報表請求後回傳 job_id，透過 Job API 查詢進度與結果。

## Base URL

```
/api/v1/projects/{project_id}/reports
```

---

## 共用資料模型

### Timeframe

| 欄位 | 型別 | 說明 |
|---|---|---|
| `type` | string | `absolute` 或 `relative` |
| `start` | integer \| null | 起始時間（epoch ms），absolute 模式使用 |
| `end` | integer \| null | 結束時間（epoch ms），absolute 模式使用 |
| `relative` | string \| null | 相對時間，如 `last_7_days`、`last_30_days` |

### EventSelection

| 欄位 | 型別 | 說明 |
|---|---|---|
| `type` | string | `all` 或 `specific` |
| `event_names` | string[] \| null | 指定事件名稱列表（`specific` 模式使用） |

### ConditionFilter

| 欄位 | 型別 | 說明 |
|---|---|---|
| `attribute` | string | 屬性名稱 |
| `operator` | string | 運算子（見下方列表） |
| `value` | string \| number \| boolean \| null | 比較值 |

支援的 operator：`is`、`is_not`、`contains`、`not_contains`、`starts_with`、`not_starts_with`、`ends_with`、`not_ends_with`、`equals`、`not_equals`、`greater_than`、`less_than`、`true`、`false`

### ConditionGroup

支援巢狀 AND/OR 邏輯組合。

| 欄位 | 型別 | 說明 |
|---|---|---|
| `logic` | string | `and` 或 `or` |
| `conditions` | (ConditionFilter \| ConditionGroup)[] | 條件列表（可巢狀） |

### Aggregation

| 欄位 | 型別 | 說明 |
|---|---|---|
| `function` | string | 聚合函式：`count`、`sum`、`count_unique`、`last_event`、`first_event`、`min`、`max`、`mean`、`average`、`tops` |
| `attribute` | string \| null | 聚合目標屬性 |

---

## 端點

### POST / — 提交報表

提交非同步報表產生請求，回傳 202 Accepted。

**Request Body**

```json
{
  "report_type": "trend",
  "timeframe": {
    "type": "relative",
    "relative": "last_30_days"
  },
  "event_selection": {
    "type": "all"
  },
  "filters": {
    "logic": "and",
    "conditions": [
      {"attribute": "country", "operator": "is", "value": "TW"}
    ]
  },
  "aggregation": {
    "function": "count"
  },
  "group_by": ["event_name"]
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `report_type` | string | 是 | `trend`、`attribution`、`cohort` |
| `timeframe` | Timeframe | 是 | 時間範圍 |
| `event_selection` | EventSelection | 是 | 事件選擇 |
| `filters` | ConditionGroup \| null | 否 | 篩選條件 |
| `aggregation` | Aggregation | 是 | 聚合設定 |
| `group_by` | string[] \| null | 否 | 分組欄位 |

**Response — 202 Accepted**

```json
{
  "job_id": "job_abc123",
  "status": "queued"
}
```
