# DSL Validation API

驗證 DSL 表達式的語法與語意正確性。

## Base URL

```
/api/v1/dsl
```

---

## 端點

### POST /validate — 驗證 DSL 表達式

解析並驗證 DSL 表達式，檢查語法正確性與函式簽名。

**Request Body**

```json
{
  "expression": "UPPER(PROFILE(\"name\"))"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `expression` | string | 是 | DSL 表達式 |

**Response — 200 OK（驗證通過）**

```json
{
  "valid": true,
  "return_type": "string",
  "errors": null
}
```

**Error — 422（驗證失敗）**

```json
{
  "detail": {
    "errors": ["Unknown function: UNKNOWN_FUNC"]
  }
}
```
