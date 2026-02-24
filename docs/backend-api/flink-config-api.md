# Flink Config API（內部）

供 Flink Processor 使用的內部設定端點，提供屬性定義與觸發規則資料。

## Base URL

```
/api/v1/config/projects/{project_id}
```

---

## 端點

### GET /attributes — 取得屬性定義

回傳該專案的所有屬性定義，格式對應 Flink 的 `AttributeDefinition` 模型。

**Response — 200 OK**

```json
[
  {
    "name": "birthday",
    "type": "string",
    "entity_type": "profile",
    "indexed": false,
    "computed": false,
    "formula": null
  },
  {
    "name": "name_upper",
    "type": "string",
    "entity_type": "profile",
    "indexed": false,
    "computed": true,
    "formula": "UPPER(PROFILE(\"name\"))"
  }
]
```

---

### GET /trigger-rules — 取得啟用的觸發規則

回傳該專案所有 `status = 'active'` 的觸發規則，格式對應 Flink 的 `TriggerRule` 模型。

**Response — 200 OK**

```json
[
  {
    "rule_id": "rule_001",
    "project_id": "proj_001",
    "name": "High Value Purchase",
    "description": "購買金額超過 1000",
    "dsl": "GT(EVENT(\"amount\"), 1000)",
    "status": "active",
    "actions": [
      {"type": "webhook", "enabled": true, "url": "https://example.com/hook"}
    ],
    "frequency": null,
    "timeframe": null,
    "selected_event_names": null,
    "constraints": null
  }
]
```
