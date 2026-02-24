# Trigger Settings API

事件驅動觸發規則的 CRUD 管理。觸發規則定義了當特定事件條件滿足時要執行的動作。

## Base URL

```
/api/v1/projects/{project_id}/triggers
```

---

## 資料模型

### TriggerAction

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `type` | string | 是 | 動作類型：`webhook`、`kafka_publish`、`notification`、`tag_profile`、`update_attribute` |
| `enabled` | boolean | 否 | 是否啟用（預設 `true`） |
| `url` | string \| null | 否 | Webhook URL |
| `topic` | string \| null | 否 | Kafka topic |
| `headers` | object \| null | 否 | 自訂 HTTP headers |
| `payload_template` | string \| null | 否 | Payload 模板 |

### TriggerSetting（Response）

| 欄位 | 型別 | 說明 |
|---|---|---|
| `rule_id` | string | 規則 ID |
| `project_id` | string | 所屬專案 ID |
| `name` | string | 規則名稱 |
| `description` | string \| null | 規則描述 |
| `dsl` | string | DSL 條件表達式 |
| `status` | string | `active`、`inactive`、`draft` |
| `actions` | TriggerAction[] | 觸發動作列表 |
| `created_at` | datetime | 建立時間 |
| `updated_at` | datetime | 更新時間 |

---

## 端點

### POST / — 建立觸發規則

**Request Body**

```json
{
  "name": "High Value Purchase",
  "description": "當購買金額超過 1000 時觸發",
  "dsl": "GT(EVENT(\"amount\"), 1000)",
  "status": "active",
  "actions": [
    {
      "type": "webhook",
      "enabled": true,
      "url": "https://example.com/hook"
    }
  ]
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `name` | string | 是 | 規則名稱（1-255 字元） |
| `description` | string \| null | 否 | 規則描述 |
| `dsl` | string | 是 | DSL 條件表達式 |
| `status` | string | 否 | 狀態（預設 `draft`） |
| `actions` | TriggerAction[] | 是 | 至少一個觸發動作 |

**Response — 201 Created**

回傳 `TriggerSetting` 物件。

---

### GET / — 列出觸發規則

支援分頁查詢。

**Query Parameters**

| 參數 | 型別 | 預設值 | 說明 |
|---|---|---|---|
| `page` | integer | `1` | 頁碼 |
| `page_size` | integer | `20` | 每頁筆數 |

**Response — 200 OK**

```json
{
  "items": [ ... ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

---

### GET /{rule_id} — 取得單一規則

**Response — 200 OK**

回傳 `TriggerSetting` 物件。

**Error — 404 Not Found**

```json
{
  "detail": "Trigger {rule_id} not found"
}
```

---

### PUT /{rule_id} — 更新規則

所有欄位皆為 Optional，僅更新有提供的欄位。

**Request Body**

```json
{
  "status": "active",
  "dsl": "GT(EVENT(\"amount\"), 2000)"
}
```

**Response — 200 OK**

回傳更新後的 `TriggerSetting` 物件。

---

### DELETE /{rule_id} — 刪除規則

**Response — 200 OK**

```json
{
  "deleted": true
}
```

---

## 錯誤回應

| HTTP 狀態碼 | 情境 |
|---|---|
| 404 | 規則不存在 |
| 422 | DSL 驗證失敗或請求格式錯誤 |
