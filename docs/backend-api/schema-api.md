# Profile & Event Schema Management API

管理 Project 的 Profile Schema 與 Event Schema 屬性定義。每個屬性包含名稱、資料型別、描述、類型（靜態/動態）及 DSL formula。

## Base URL

```
/api/v1/projects/{project_id}/schemas/{schema_type}
```

### 路徑參數

| 參數 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `project_id` | string | 是 | 專案 ID |
| `schema_type` | string | 是 | Schema 類型，僅接受 `profile` 或 `event` |

---

## 資料模型

### PropertyResponse

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | integer | 屬性 ID（自動產生） |
| `project_id` | string | 所屬專案 ID |
| `schema_type` | string | `profile` 或 `event` |
| `name` | string | 屬性名稱（1-128 字元） |
| `data_type` | string | 資料型別（1-50 字元），如 `string`、`integer`、`boolean`、`float`、`date` |
| `description` | string \| null | 屬性描述 |
| `property_type` | string | `static`（靜態）或 `dynamic`（動態） |
| `formula` | string \| null | DSL 公式，僅 dynamic 屬性有值 |
| `created_at` | datetime | 建立時間（ISO 8601） |

---

## 端點

### POST / — 建立屬性

建立一個新的 schema 屬性定義。

**Request Body**

```json
{
  "name": "birthday",
  "data_type": "string",
  "description": "使用者生日",
  "property_type": "static",
  "formula": null
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `name` | string | 是 | 屬性名稱（1-128 字元），同一 project + schema_type 下不可重複 |
| `data_type` | string | 是 | 資料型別（1-50 字元） |
| `description` | string \| null | 否 | 屬性描述 |
| `property_type` | string | 是 | `static` 或 `dynamic` |
| `formula` | string \| null | 條件 | `dynamic` 時必填且須通過 DSL 驗證；`static` 時必須為 null |

**Response — 201 Created**

```json
{
  "id": 1,
  "project_id": "proj_001",
  "schema_type": "profile",
  "name": "birthday",
  "data_type": "string",
  "description": "使用者生日",
  "property_type": "static",
  "formula": null,
  "created_at": "2025-01-01T00:00:00Z"
}
```

**Dynamic 屬性範例**

```json
{
  "name": "name_upper",
  "data_type": "string",
  "description": "大寫姓名",
  "property_type": "dynamic",
  "formula": "UPPER(PROFILE(\"name\"))"
}
```

---

### GET / — 列出屬性

取得指定 project + schema_type 下的全部屬性。結果會透過 Redis 快取加速。

**Response — 200 OK**

```json
[
  {
    "id": 1,
    "project_id": "proj_001",
    "schema_type": "profile",
    "name": "birthday",
    "data_type": "string",
    "description": "使用者生日",
    "property_type": "static",
    "formula": null,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### GET /{property_id} — 取得單一屬性

根據 ID 取得單一屬性的完整資訊。

**路徑參數**

| 參數 | 型別 | 說明 |
|---|---|---|
| `property_id` | integer | 屬性 ID |

**Response — 200 OK**

回傳 `PropertyResponse` 物件。

---

### PUT /{property_id} — 更新屬性

更新已存在的屬性定義。所有欄位皆為 Optional，僅更新有提供的欄位。

**Request Body**

```json
{
  "description": "更新後的描述",
  "data_type": "integer"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `name` | string \| null | 否 | 新名稱（1-128 字元） |
| `data_type` | string \| null | 否 | 新資料型別（1-50 字元） |
| `description` | string \| null | 否 | 新描述 |
| `property_type` | string \| null | 否 | `static` 或 `dynamic` |
| `formula` | string \| null | 否 | 新 DSL 公式 |

**property_type 轉換規則**

- `static` → `dynamic`：必須同時提供有效的 `formula`
- `dynamic` → `static`：`formula` 會自動設為 null

**Response — 200 OK**

回傳更新後的 `PropertyResponse` 物件。

---

### DELETE /{property_id} — 刪除屬性

刪除指定的屬性定義。

**Response — 200 OK**

```json
{
  "deleted": true
}
```

---

## 錯誤回應

| HTTP 狀態碼 | 情境 | 回應範例 |
|---|---|---|
| 404 | 屬性不存在 | `{"error": "Property not found", "detail": "Property 99 not found"}` |
| 409 | 重複屬性名稱 | `{"error": "Conflict", "detail": "Property name 'birthday' already exists"}` |
| 422 | DSL formula 驗證失敗 | `{"error": "Validation error", "detail": "DSL validation failed: ...", "field_errors": [...]}` |
| 422 | Dynamic 屬性缺少 formula | `{"error": "Validation error", "detail": "Formula is required for dynamic properties"}` |
| 422 | 無效的 schema_type | `{"error": "Validation error", "detail": "schema_type must be 'profile' or 'event'"}` |

---

## 快取機制

- 快取鍵格式：`schema:{project_id}:{schema_type}`
- TTL：3600 秒（1 小時）
- 列表查詢（GET /）優先從 Redis 讀取，未命中時查詢資料庫並回寫快取
- 所有寫入操作（POST / PUT / DELETE）成功後自動清除對應快取
- Redis 故障時自動降級為直接查詢資料庫，不影響 API 回應
