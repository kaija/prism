# Project Config API

專案層級的 Key-Value 設定管理。

## Base URL

```
/api/v1/projects/{project_id}/config
```

### 路徑參數

| 參數 | 型別 | 說明 |
|---|---|---|
| `project_id` | string | 專案 ID |

---

## 端點

### PUT /{key} — 設定值

設定或更新一個 config key-value。

**Request Body**

```json
{
  "key": "timezone",
  "value": "Asia/Taipei"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `key` | string | 是 | 設定鍵（1-255 字元） |
| `value` | string | 是 | 設定值 |

**Response — 200 OK**

```json
{
  "key": "timezone",
  "value": "Asia/Taipei"
}
```

---

### GET / — 取得全部設定

取得該專案的所有 config key-value。

**Response — 200 OK**

```json
{
  "items": [
    {"key": "timezone", "value": "Asia/Taipei"},
    {"key": "locale", "value": "zh-TW"}
  ]
}
```

---

### GET /{key} — 取得單一設定

根據 key 取得單一設定值。

**Response — 200 OK**

```json
{
  "key": "timezone",
  "value": "Asia/Taipei"
}
```

**Error — 404 Not Found**

```json
{
  "detail": "Config key 'unknown_key' not found"
}
```

---

### DELETE /{key} — 刪除設定

刪除指定的 config key-value。

**Response — 200 OK**

```json
{
  "deleted": true
}
```

**Error — 404 Not Found**

```json
{
  "detail": "Config key 'unknown_key' not found"
}
```
