# Prism — Realtime Event Action Trigger & Reporting System

Prism 是一套即時事件處理與觸發系統，支援事件接收、格式轉換、串流處理、DSL 規則觸發、巨量資料儲存與報表查詢。系統採用多專案（multi-tenant）架構，支援預設與自訂義屬性的事件與 Profile 模型。

---

## 目錄

- [系統架構總覽](#系統架構總覽)
- [專案資料夾結構](#專案資料夾結構)
- [核心元件](#核心元件)
  - [Event Ingest API (Rust)](#1-event-ingest-api-rust)
  - [Flink Event Processor (Java)](#2-flink-event-processor-java)
  - [Backend API (Python)](#3-backend-api-python)
  - [Frontend (Next.js)](#4-frontend-nextjs)
- [資料模型](#資料模型)
  - [Event 模型](#event-模型)
  - [Profile 模型](#profile-模型)
  - [Project 模型 (Multi-Tenant)](#project-模型-multi-tenant)
- [基礎設施](#基礎設施)
- [開發環境設定](#開發環境設定)
- [技術選型與理由](#技術選型與理由)
- [API 設計概覽](#api-設計概覽)
- [DSL 觸發引擎](#dsl-觸發引擎)
- [監控與可觀測性](#監控與可觀測性)
- [測試策略](#測試策略)
- [部署考量](#部署考量)

---

## 系統架構總覽

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐     ┌──────────┐
│   Client /  │     │  Event Ingest    │     │   Apache Kafka      │     │  Flink   │
│   SDK /     │────▶│  API (Rust)      │────▶│   (4 Partitions)    │────▶│  Event   │
│   Webhook   │     │  - 格式轉換       │     │   - event.raw       │     │ Processor│
└─────────────┘     │  - 驗證           │     │   - event.enriched  │     │ (Java)   │
                    └──────────────────┘     │   - event.triggered  │     │          │
                                             │   - event.dlq        │     │ - 計算    │
                                             └─────────────────────┘     │ - DSL    │
                                                                         │ - Trigger│
                                                                         └────┬─────┘
                                                                              │
                                                                              ▼
                    ┌──────────────────┐     ┌─────────────────────┐     ┌──────────┐
                    │  Frontend        │     │  Reporting API      │     │  DuckDB  │
                    │  (Next.js)       │────▶│  (Python/FastAPI)   │────▶│  Storage │
                    │  - 報表           │     │  - 巨量資料查詢      │     │          │
                    │  - Trigger 設定   │     │  - 聚合分析          │     └──────────┘
                    │  - 專案管理       │     └─────────────────────┘
                    └───────┬──────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  PostgreSQL      │
                    │  - 專案設定       │
                    │  - 使用者管理     │
                    │  - Trigger 規則   │
                    └──────────────────┘
```

### 資料流程

1. 客戶端透過 SDK 或 Webhook 發送事件至 Event Ingest API
2. Rust API 進行格式驗證與轉換，寫入 Kafka `event.raw` topic
3. Flink 從 Kafka 消費事件，執行進階計算與 AviatorScript DSL 規則
4. 觸發結果寫入 Kafka `event.triggered` topic，事件資料寫入 DuckDB
5. Reporting API 從 DuckDB 查詢巨量資料，提供報表 API
6. Frontend 提供報表視覺化、Trigger 規則設定與專案管理介面

---

## 專案資料夾結構

```
prism/
├── README.md                          # 本文件
├── docker-compose.yml                 # 本地開發環境編排
├── docker-compose.infra.yml           # 基礎設施服務（Kafka, PG, DuckDB）
├── .env.example                       # 環境變數範本
│
├── services/
│   ├── event-ingest-api/              # Rust - 事件接收 API
│   │   ├── Cargo.toml
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── config.rs              # 設定管理
│   │   │   ├── routes/                # HTTP 路由
│   │   │   │   ├── mod.rs
│   │   │   │   ├── event.rs           # 事件接收端點
│   │   │   │   └── health.rs          # 健康檢查
│   │   │   ├── models/                # 資料模型
│   │   │   ├── services/              # 業務邏輯（transformer, validator, kafka_producer）
│   │   │   ├── middleware/            # 中介層（auth, tenant）
│   │   │   └── errors.rs              # 錯誤處理
│   │   └── tests/
│   │
│   ├── flink-processor/               # Java - Flink 事件處理
│   │   ├── pom.xml
│   │   ├── Dockerfile
│   │   ├── src/main/java/com/prism/
│   │   │   ├── FlinkApplication.java  # 進入點
│   │   │   ├── config/                # 設定
│   │   │   ├── jobs/                  # Flink Jobs（Enrichment, TriggerEvaluation）
│   │   │   ├── functions/             # Flink Functions（Enrich, TriggerEval, DuckDBSink）
│   │   │   ├── dsl/                   # DSL 引擎（AviatorEngine, RuleCompiler）
│   │   │   ├── models/                # 資料模型（RawEvent, EnrichedEvent, TriggerResult）
│   │   │   └── sinks/                 # Sink（DuckDB, KafkaTrigger）
│   │   └── src/test/java/com/prism/
│   │
│   ├── backend-api/                   # Python - Backend API
│   │   ├── pyproject.toml
│   │   ├── Dockerfile
│   │   ├── app/
│   │   │   ├── main.py               # FastAPI 進入點
│   │   │   ├── config.py             # 設定管理
│   │   │   ├── routers/              # 路由（reports, analytics, health）
│   │   │   ├── services/             # 業務邏輯（query_builder, aggregator）
│   │   │   ├── models/               # Pydantic 模型
│   │   │   ├── db/                   # DuckDB 連線管理
│   │   │   └── middleware/           # 多租戶中介層
│   │   └── tests/
│   │
│   └── frontend/                      # Next.js - 前端應用
│       ├── package.json
│       ├── Dockerfile
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── src/
│       │   ├── app/                   # App Router
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── (dashboard)/
│       │   │   │   ├── reports/       # 報表頁面
│       │   │   │   ├── triggers/      # Trigger 設定頁面
│       │   │   │   ├── events/        # 事件瀏覽頁面
│       │   │   │   └── settings/      # 專案設定頁面
│       │   │   └── (auth)/
│       │   │       └── login/
│       │   ├── components/
│       │   │   ├── ui/                # 基礎 UI 元件
│       │   │   ├── charts/            # 圖表元件
│       │   │   ├── triggers/          # Trigger 相關元件
│       │   │   └── layout/            # 版面元件
│       │   ├── lib/
│       │   │   ├── api.ts             # API 客戶端
│       │   │   └── utils.ts
│       │   ├── hooks/                 # 自訂 Hooks
│       │   ├── stores/                # 狀態管理 (Zustand)
│       │   └── types/                 # TypeScript 型別
│       └── tests/
│
├── shared/                            # 跨服務共用資源
│   ├── schemas/
│   │   ├── event.json                 # Event JSON Schema
│   │   ├── profile.json               # Profile JSON Schema
│   │   └── trigger-rule.json          # Trigger Rule Schema
│   └── proto/                         # Protocol Buffers（可選）
│       └── event.proto
│
├── infra/
│   ├── docker/
│   │   ├── kafka/
│   │   │   └── create-topics.sh       # Kafka topic 初始化
│   │   ├── postgres/
│   │   │   └── init.sql               # PostgreSQL 初始化
│   │   └── duckdb/
│   │       └── init.sql               # DuckDB schema 初始化
│   └── scripts/
│       ├── setup.sh                   # 開發環境初始化
│       └── seed.sh                    # 測試資料填充
│
└── docs/                              # 文件（已存在）
    ├── backend-api/
    ├── backend-worker/
    ├── database-design/
    └── frontend/
```

---

## 核心元件

### 1. Event Ingest API (Rust)

高效能事件接收服務，負責接收來自客戶端的事件資料，進行格式驗證與轉換後寫入 Kafka。

| 項目 | 說明 |
|------|------|
| 語言 | Rust |
| 框架 | Actix Web 4 |
| Kafka 客戶端 | rdkafka (librdkafka binding) |
| 序列化 | serde + serde_json |
| 驗證 | validator crate |
| 設定管理 | config crate + 環境變數 |
| 日誌 | tracing + tracing-subscriber |
| 測試 | cargo test + actix-web test utilities |

#### 核心功能

- **事件接收**: `POST /api/v1/events` — 接收單一或批次事件
- **格式轉換**: 將不同來源格式統一為內部 Event Schema
- **驗證**: 驗證必填欄位、資料型別、自訂屬性格式
- **多租戶識別**: 透過 API Key 或 Header 識別 Project
- **Kafka 寫入**: 將驗證通過的事件寫入 `event.raw` topic（4 partitions）
- **健康檢查**: `GET /health` — Liveness / Readiness probe

#### Kafka Topic 設計

| Topic | 用途 | Partitions | Retention |
|-------|------|------------|-----------|
| `event.raw` | 原始事件（經格式轉換後） | 4 | 7 天 |
| `event.enriched` | 經 Flink 豐富化的事件 | 4 | 7 天 |
| `event.triggered` | 觸發結果通知 | 4 | 30 天 |
| `event.dlq` | 處理失敗的事件（Dead Letter Queue） | 2 | 30 天 |

---

### 2. Flink Event Processor (Java)

基於 Apache Flink 2.2 的串流處理引擎，負責事件豐富化、進階計算與 DSL 規則觸發。

| 項目 | 說明 |
|------|------|
| 語言 | Java 17 |
| 框架 | Apache Flink 2.2 |
| DSL 引擎 | AviatorScript |
| 儲存 | DuckDB (透過 JDBC) |
| 建構工具 | Maven |
| 測試 | JUnit 5 + Flink MiniCluster |

#### 核心功能

- **事件豐富化**: 從 Profile 資料補充事件上下文
- **進階計算**: 滑動視窗聚合、計數、平均值等即時計算
- **DSL 規則引擎**: 使用 AviatorScript 編譯並執行觸發規則
- **DuckDB 寫入**: 將處理後的事件資料批次寫入 DuckDB
- **觸發通知**: 將觸發結果寫入 `event.triggered` topic

#### Flink Job 架構

```
Kafka Source (event.raw)
    │
    ▼
EventEnrichFunction          ← 事件豐富化（補充 Profile 資料）
    │
    ├──▶ TriggerEvalFunction ← AviatorScript DSL 規則評估
    │       │
    │       └──▶ KafkaTriggerSink (event.triggered)
    │
    └──▶ DuckDBSinkFunction  ← 批次寫入 DuckDB
```

#### AviatorScript DSL 範例

```javascript
// 購買金額超過 10000
event.name == 'purchase' && event.props.amount > 10000 && window.count('purchase', '5m') >= 1

// 新使用者首次登入
event.name == 'login' && profile.props.login_count == 0

// 自訂屬性條件
event.name == 'page_view' && event.props.campaign == 'summer_sale' && profile.props.vip_level >= 3
```

---

### 3. Reporting API (Python)

巨量資料報表查詢服務，透過 DuckDB 的高效分析能力提供即時報表與聚合分析。

| 項目 | 說明 |
|------|------|
| 語言 | Python 3.12+ |
| 框架 | FastAPI |
| 資料庫 | DuckDB (duckdb-python) |
| 驗證 | Pydantic v2 |
| 非同步 | asyncio + anyio |
| 設定管理 | pydantic-settings + 環境變數 |
| 日誌 | structlog |
| 測試 | pytest + httpx |

#### 核心功能

- **報表查詢**: 支援時間範圍、事件類型、屬性篩選的彈性查詢
- **聚合分析**: COUNT、SUM、AVG、PERCENTILE 等聚合函數
- **分群分析**: 依 Profile 屬性或事件屬性進行分群統計
- **漏斗分析**: 多步驟轉換漏斗計算
- **趨勢分析**: 時間序列趨勢與同比/環比計算
- **匯出**: 支援 CSV / JSON 格式匯出

---

### 4. Frontend (Next.js)

提供報表視覺化、Trigger 規則設定與專案管理的 Web 應用。

| 項目 | 說明 |
|------|------|
| 語言 | TypeScript |
| 框架 | Next.js 15 (App Router) |
| 樣式 | Tailwind CSS 4 |
| 狀態管理 | Zustand |
| 資料取得 | TanStack Query |
| 圖表 | Recharts 或 Apache ECharts |
| 表單 | React Hook Form + Zod |
| UI 元件 | shadcn/ui |
| 測試 | Vitest + Playwright |

#### 核心頁面

| 頁面 | 路徑 | 說明 |
|------|------|------|
| Dashboard | `/` | 專案總覽與關鍵指標 |
| Reports | `/reports` | 報表查詢與視覺化 |
| Events | `/events` | 事件瀏覽與搜尋 |
| Triggers | `/triggers` | Trigger 規則管理（CRUD + DSL 編輯器） |
| Profiles | `/profiles` | Profile 瀏覽與搜尋 |
| Settings | `/settings` | 專案設定、API Key 管理、屬性定義 |

#### DSL 編輯器

前端提供 AviatorScript DSL 的視覺化編輯器，支援語法高亮（Monaco Editor）、自動補全、即時語法驗證與規則測試功能。

---

## 資料模型

### Event 模型

事件是系統的核心資料單位，包含預設屬性與自訂義屬性。

```json
{
  "event_id": "uuid-v7",
  "project_id": "proj_abc123",
  "event_name": "purchase",
  "cts": 1771665000000,
  "sts": 1771665012345,
  "profile_id": "user_12345",

  "props": {
    "amount": 5999,
    "currency": "TWD",
    "item_count": 3,
    "payment_method": "credit_card",
    "campaign": "lunar_new_year",
    "referral_source": "email",
    "ab_test_variant": "B"
  },

  "ctx": {
    "ip": "203.0.113.42",
    "user_agent": "Mozilla/5.0...",
    "locale": "zh-TW",
    "device_type": "mobile",
    "os": "iOS",
    "app_version": "2.1.0"
  }
}
```

#### 預設屬性（Properties）

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `event_id` | UUID v7 | 是 | 事件唯一識別碼（含時間排序） |
| `project_id` | String | 是 | 所屬專案 ID |
| `event_name` | String | 是 | 事件名稱（如 purchase, login, page_view） |
| `cts` | Integer | 是 | 事件發生時間（Client UTC epoch ms） |
| `sts` | Integer | 否 | 事件接收時間（Server UTC epoch ms，API 自動填入） |
| `profile_id` | String | 否 | 關聯的 Profile ID |
| `props` | Object | 否 | 事件屬性（預設與自訂皆存放於此） |
| `ctx` | Object | 否 | 裝置與環境上下文 |

#### 自訂義屬性

自訂義屬性與預設屬性統一存放於 `props` 欄位中，由各 Project 的 `attribute_definitions` 定義哪些屬性為自訂義屬性。

### Profile 模型

Profile 代表一個使用者或實體，支援預設與自訂義屬性。

```json
{
  "profile_id": "user_12345",
  "project_id": "proj_abc123",
  "created_at": 1736928000000,
  "updated_at": 1771665000000,

  "props": {
    "email": "user@example.com",
    "name": "王小明",
    "signup_date": 1736899200000,
    "login_count": 42,
    "last_active_at": 1771665000000,
    "vip_level": 3,
    "preferred_language": "zh-TW",
    "subscription_plan": "premium",
    "tags": ["early_adopter", "power_user"]
  }
}
```

#### 預設屬性（Attributes）

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `profile_id` | String | 是 | Profile 唯一識別碼 |
| `project_id` | String | 是 | 所屬專案 ID |
| `created_at` | Integer | 是 | 建立時間（UTC epoch ms） |
| `updated_at` | Integer | 是 | 最後更新時間（UTC epoch ms） |
| `props` | Object | 否 | Profile 屬性（預設與自訂皆存放於此） |

#### 自訂義屬性

與 Event 相同，自訂義屬性統一存放於 `props` 欄位中，由各 Project 的 `attribute_definitions` 定義。Profile 的屬性可在 Flink 處理時用於事件豐富化與觸發規則評估。

### Project 模型 (Multi-Tenant)

```json
{
  "project_id": "proj_abc123",
  "name": "My App",
  "description": "Production tracking for My App",
  "created_at": 1735689600000,
  "updated_at": 1771578000000,
  "status": "active",

  "settings": {
    "timezone": "Asia/Taipei",
    "data_retention_days": 90,
    "max_custom_attributes": 50,
    "allowed_event_names": ["purchase", "login", "page_view", "signup"]
  },

  "api_keys": [
    {
      "key_id": "key_001",
      "prefix": "ef_live_",
      "created_at": 1735689600000,
      "last_used_at": 1771665000000,
      "status": "active"
    }
  ],

  "attribute_definitions": {
    "event": {
      "campaign": { "type": "string", "indexed": true },
      "referral_source": { "type": "string", "indexed": true },
      "ab_test_variant": { "type": "string", "indexed": false }
    },
    "profile": {
      "vip_level": { "type": "number", "indexed": true },
      "subscription_plan": { "type": "string", "indexed": true },
      "tags": { "type": "array", "items_type": "string", "indexed": false }
    }
  }
}
```

#### Multi-Tenant 隔離策略

| 層級 | 隔離方式 |
|------|----------|
| API | API Key 綁定 Project，請求層級隔離 |
| Kafka | 事件 payload 包含 `project_id`，共用 topic |
| Flink | 處理時依 `project_id` 路由規則與計算 |
| DuckDB | 資料表包含 `project_id` 欄位，查詢時強制過濾 |
| PostgreSQL | 專案設定以 `project_id` 為主鍵隔離 |

---

## 基礎設施

### PostgreSQL（專案設定）

儲存專案設定、使用者管理、Trigger 規則等結構化設定資料。核心資料表包含：

- `projects` — 專案基本資訊與設定（JSONB）
- `api_keys` — API Key 管理（儲存 hash，非明文）
- `attribute_definitions` — 自訂義屬性定義（per project, per entity type）
- `trigger_rules` — Trigger 規則（DSL + actions config）

完整 Schema 請參考 [infra/docker/postgres/init.sql](infra/docker/postgres/init.sql)。

### DuckDB（事件儲存與分析）

儲存大量事件資料，提供高效的分析查詢能力。核心資料表：

- `events` — 事件主表（含 props, ctx 等 JSON 欄位）
- `profiles` — Profile 快照表
- `trigger_logs` — 觸發記錄表

完整 Schema 請參考 [infra/docker/duckdb/init.sql](infra/docker/duckdb/init.sql)。

### Apache Kafka

| 設定 | 值 |
|------|-----|
| Broker 數量 | 1（開發）/ 3+（生產） |
| 預設 Partitions | 4 |
| Replication Factor | 1（開發）/ 3（生產） |
| 訊息格式 | JSON（開發）/ Avro 或 Protobuf（生產） |
| 壓縮 | zstd |

---

## 開發環境設定

### 前置需求

| 工具 | 版本 | 用途 |
|------|------|------|
| Docker | 24+ | 容器化執行環境 |
| Docker Compose | 2.20+ | 服務編排 |
| Rust | 1.75+ | Event Ingest API 開發 |
| Java | 17+ | Flink Processor 開發 |
| Maven | 3.9+ | Java 建構工具 |
| Python | 3.12+ | Reporting API 開發 |
| Node.js | 20+ | Frontend 開發 |
| pnpm | 9+ | Node.js 套件管理 |

### 快速啟動

```bash
# 1. 複製環境變數範本
cp .env.example .env

# 2. 啟動基礎設施服務（Kafka, PostgreSQL, DuckDB）
docker compose -f docker-compose.infra.yml up -d

# 3. 初始化資料庫與 Kafka topics
./infra/scripts/setup.sh

# 4. 啟動所有應用服務
docker compose up -d

# 5. 填充測試資料（可選）
./infra/scripts/seed.sh

# 6. 開啟前端
open http://localhost:3000
```

### 各服務獨立開發

```bash
# Event Ingest API (Rust)
cd services/event-ingest-api
cargo run

# Flink Processor (Java)
cd services/flink-processor
mvn clean package
java -jar target/flink-processor.jar

# Backend API (Python)
cd services/backend-api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001

# Frontend (Next.js)
cd services/frontend
pnpm install
pnpm dev
```

### Docker Compose 服務對照

| 服務 | Port | 說明 |
|------|------|------|
| event-ingest-api | 8080 | Rust 事件接收 API |
| flink-jobmanager | 8081 | Flink Web UI |
| flink-taskmanager | — | Flink 工作節點 |
| backend-api | 8001 | Python Backend API |
| frontend | 3000 | Next.js 前端 |
| kafka | 9092 | Kafka Broker |
| kafka-ui | 9094 | Kafka Web UI |
| postgres | 5432 | PostgreSQL |
| redis | 6379 | 快取（報表查詢） |

### 環境變數

完整環境變數請參考 [.env.example](.env.example)。

---

## 技術選型與理由

### Rust — Event Ingest API

零成本抽象、無 GC 停頓，Actix Web async runtime 適合高 QPS I/O 密集型事件接收。rdkafka 提供高效能 Kafka producer。

### Apache Flink 2.2 — 串流處理

原生支援事件時間、視窗、狀態管理與 exactly-once 語義。水平擴展 TaskManager 處理更大流量，豐富的 Connector 生態系統。

### AviatorScript — DSL 觸發引擎

編譯為 JVM bytecode 執行效率高，沙箱環境確保安全性，支援執行時期動態載入規則，類 JavaScript 語法降低學習成本。

### DuckDB — 事件儲存與分析

列式儲存引擎分析查詢極快，嵌入式架構無需獨立伺服器，完整 SQL 支援與原生平行查詢執行。

### Python + FastAPI — Reporting API

duckdb-python 原生整合，Pydantic v2 強型別驗證，FastAPI async 支援併發查詢，自動產生 OpenAPI 文件。

### Next.js — Frontend

App Router 檔案系統路由，原生 TypeScript 支援，SSR/SSG 提升首屏載入，React 生態系統豐富。

---

## API 設計概覽

### Event Ingest API (Rust) — Port 8080

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/v1/events` | 接收單一事件 |
| POST | `/api/v1/events/batch` | 批次接收事件（最多 100 筆） |
| POST | `/api/v1/profiles` | 建立或更新 Profile |
| GET | `/api/v1/profiles/:id` | 查詢 Profile |
| GET | `/health` | 健康檢查 |
| GET | `/metrics` | Prometheus metrics |

#### 請求範例

```bash
curl -X POST http://localhost:8080/api/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ef_live_abc123" \
  -d '{"event_name":"purchase","profile_id":"user_12345","props":{"amount":5999,"currency":"TWD"}}'
```

### Reporting API (Python) — Port 8001

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/v1/reports/query` | 執行報表查詢 |
| POST | `/api/v1/reports/funnel` | 漏斗分析 |
| POST | `/api/v1/reports/trend` | 趨勢分析 |
| POST | `/api/v1/reports/segment` | 分群分析 |
| GET | `/api/v1/reports/export/:id` | 匯出報表結果 |
| GET | `/api/v1/events` | 事件列表查詢 |
| GET | `/api/v1/events/:id` | 事件詳情 |
| GET | `/health` | 健康檢查 |

### Frontend API Routes (Next.js) — Port 3000

| Method | Path | 說明 |
|--------|------|------|
| GET/POST | `/api/projects` | 專案 CRUD |
| GET/POST | `/api/triggers` | Trigger 規則 CRUD |
| GET/POST | `/api/attributes` | 屬性定義 CRUD |
| POST | `/api/triggers/test` | 測試 Trigger 規則 |
| GET/POST | `/api/api-keys` | API Key 管理 |

---

## DSL 觸發引擎

### 架構

Rule Loader (from PG) → AviatorScript Compiler & Evaluator → Action Executor → Kafka Trigger Sink

規則透過 Rule Cache 做 Hot Reload，評估時結合 Event + Profile Context。

### 規則生命週期

1. 使用者在 Frontend 建立 Trigger 規則（DSL + Actions 設定）
2. 規則儲存至 PostgreSQL
3. Flink Processor 定期從 PostgreSQL 載入規則（或透過 Kafka 通知更新）
4. AviatorScript 編譯規則為 JVM bytecode 並快取
5. 每個事件到達時，依 `project_id` 取得對應規則集
6. 評估所有 active 規則，觸發匹配的規則
7. 觸發結果寫入 `event.triggered` topic

### Action 設定

觸發後可執行多個動作（actions 陣列），支援的動作類型：

| Action Type | 說明 |
|-------------|------|
| `webhook` | 發送 HTTP POST 至指定 URL |
| `kafka_publish` | 發送訊息至指定 Kafka topic |
| `notification` | 發送站內通知 |
| `tag_profile` | 為 Profile 新增標籤 |
| `update_attribute` | 更新 Profile 屬性 |

---

## 監控與可觀測性

### Metrics（Prometheus 格式）

| 服務 | 關鍵指標 |
|------|----------|
| Event Ingest API | `ingest_events_total`, `ingest_latency_seconds`, `kafka_produce_errors_total` |
| Flink Processor | `flink_events_processed_total`, `trigger_evaluations_total`, `duckdb_write_latency` |
| Reporting API | `report_query_duration_seconds`, `report_query_total`, `duckdb_connection_pool_active` |

### Logging

所有服務使用結構化日誌（JSON 格式），包含 `timestamp`, `level`, `service`, `project_id`, `trace_id`, `message` 等欄位。

### Health Checks

每個服務提供 `GET /health` 端點，回傳服務狀態、版本與各依賴連線狀態。

---

## 測試策略

### 各服務測試方式

| 服務 | 單元測試 | 整合測試 | E2E 測試 |
|------|----------|----------|----------|
| Event Ingest API | `cargo test` | Docker + Kafka | API 端對端 |
| Flink Processor | JUnit 5 | Flink MiniCluster | Kafka → DuckDB 全流程 |
| Reporting API | `pytest` | Docker + DuckDB | API 端對端 |
| Frontend | Vitest | — | Playwright |

### Property-Based Testing

針對核心邏輯使用 Property-Based Testing：
- 事件格式轉換的正確性（任意合法輸入皆產生合法輸出）
- DSL 規則編譯與評估的一致性
- 多租戶隔離的正確性（跨 Project 不可存取）
- DuckDB 查詢結果的正確性

---

## 部署考量

### 開發環境

使用 Docker Compose 在本地完整運行所有服務，適合開發與測試。

### 生產環境建議

| 元件 | 建議 |
|------|------|
| Event Ingest API | Kubernetes Deployment, HPA based on CPU/QPS |
| Flink | Flink on Kubernetes (Native Mode) |
| Reporting API | Kubernetes Deployment, HPA based on request latency |
| Frontend | Vercel 或 Kubernetes + Nginx |
| Kafka | Managed Kafka (AWS MSK, Confluent Cloud) 或 Kubernetes Operator |
| PostgreSQL | Managed RDS 或 Cloud SQL |
| DuckDB | Persistent Volume on Kubernetes 或 S3-backed storage |
| Redis | Managed ElastiCache 或 Kubernetes StatefulSet |

### 擴展策略

- Event Ingest API: 水平擴展多個 instance，透過 Load Balancer 分流
- Kafka: 增加 Broker 與 Partition 數量提升吞吐量
- Flink: 增加 TaskManager 數量處理更大事件流量
- Reporting API: 水平擴展，搭配 Redis 快取減少 DuckDB 負載
- DuckDB: 考慮 S3-backed storage 或分區策略處理超大資料量

---

## License

MIT License

---

## Contributing

Fork → feature branch → commit (Conventional Commits) → Pull Request

### Commit Convention

使用 [Conventional Commits](https://www.conventionalcommits.org/)：`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
