# Reporting Config API

專案報表設定管理。

## Base URL

```
/api/v1/projects/{project_id}/reporting
```

---

## 資料模型

### ReportingConfig

| 欄位 | 型別 | 預設值 | 說明 |
|---|---|---|---|
| `default_timeframe` | string | `"last_30_days"` | 預設時間範圍 |
| `max_concurrent_reports` | integer | `3` | 最大同時報表數（1-20） |
| `default_report_type` | string | `"trend"` | 預設報表類型 |

---

## 端點

### PUT / — 設定報表配置

設定或更新專案的報表配置。

**Request Body**

```json
{
  "default_timeframe": "last_7_days",
  "max_concurrent_reports": 5,
  "default_report_type": "trend"
}
```

**Response — 200 OK**

回傳 `ReportingConfig` 物件。

---

### GET / — 取得報表配置

取得專案目前的報表配置。

**Response — 200 OK**

```json
{
  "default_timeframe": "last_30_days",
  "max_concurrent_reports": 3,
  "default_report_type": "trend"
}
```
