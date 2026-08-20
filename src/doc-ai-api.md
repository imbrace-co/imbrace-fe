# Document AI API

Backend APIs for the Document AI **Categories** and **Schemas** screens.

- Source code: [doc-ai.router.ts](../src/presentation/routers/doc-ai.router.ts), [doc-category.controller.ts](../src/presentation/controllers/doc-category.controller.ts), [doc-schema.controller.ts](../src/presentation/controllers/doc-schema.controller.ts).
- Data model: [doc-category.types.ts](../src/domain/shared/doc-category.types.ts), [doc-schema.types.ts](../src/domain/shared/doc-schema.types.ts).
- Migration: [0005_curved_lilith.sql](../src/db/drizzle/migrations/0005_curved_lilith.sql) — creates the `doc_categories` and `doc_schemas` tables. Already applied to the dev database.

All endpoints are mounted under `/api`. URLs follow the spec: Categories at `/api/schema/categories`, Schemas at `/api/schemas`.

## Auth

Uses the [`extractUserContext`](../src/presentation/middleware/context.middleware.ts) middleware — it reads the headers injected by the gateway:

| Header | Required | Purpose |
|---|---|---|
| `x-organization-id` | yes | Scoping. 401 when missing. |
| `x-user-id` | optional | Audit. |
| `x-business-unit-id` | optional | Default BU. |
| `x-team-ids` | optional | Comma-separated. |

---

## Categories

### `GET /api/schema/categories`

Lists categories as a tree, with `search` + pagination.

| Query | Type | Default | Purpose |
|---|---|---|---|
| `search` | string | — | Matches the category name (case-insensitive). When present, the matching node is returned as the root (along with its subtree). |
| `limit` | int (1-500) | — | Caps the number of roots. |
| `skip` | int ≥ 0 | 0 | Offset. |

**Response**
```json
{
  "data": [
    { "id": "cat_1", "name": "Finance", "subCategories": [
      { "id": "cat_2", "name": "Invoices", "subCategories": [] }
    ]}
  ],
  "count": 2,
  "limit": 20,
  "skip": 0
}
```

```bash
curl 'http://localhost:3000/api/schema/categories?search=invoice&limit=20' \
  -H 'x-organization-id: org_test'
```

### `GET /api/schema/categories/:id`

Full subtree rooted at `:id`. Returns `{ data: Category }`. 404 when it does not exist.

```bash
curl 'http://localhost:3000/api/schema/categories/<id>' \
  -H 'x-organization-id: org_test'
```

### `POST /api/schema/categories`

Body:
```ts
{ name: string; parentId?: string | null }
```
- `name` is required and unique per parent (the same name may exist under two different parents).
- Omitting `parentId` creates a root category.
- 400 on a duplicate name; 404 when `parentId` does not exist.

```bash
curl -X POST 'http://localhost:3000/api/schema/categories' \
  -H 'x-organization-id: org_test' -H 'Content-Type: application/json' \
  -d '{"name":"Finance"}'

curl -X POST 'http://localhost:3000/api/schema/categories' \
  -H 'x-organization-id: org_test' -H 'Content-Type: application/json' \
  -d '{"name":"Invoices","parentId":"<finance-id>"}'
```

### `PUT /api/schema/categories/:id`

Body (at least one field):
```ts
{ name?: string; parentId?: string | null }
```
- Rename → checks for a duplicate name under the same parent.
- Move (new `parentId`) → checks for cycles (a node cannot be moved under its own descendant).

```bash
curl -X PUT 'http://localhost:3000/api/schema/categories/<id>' \
  -H 'x-organization-id: org_test' -H 'Content-Type: application/json' \
  -d '{"name":"Sales Invoices","parentId":"<new-parent-id>"}'
```

### `DELETE /api/schema/categories/:id`

**Behavior** (see [doc-category.service.ts:155-194](../src/core/services/doc-category.service.ts#L155-L194)):
- Deletes only the target category.
- Direct children are **promoted** one level (the children's `parent_id` becomes the deleted node's `parent_id`, or `null` when a root is deleted).
- Schemas whose `category_id` matches the deleted id have `category_id` set to `null` (falling back to the 'All' tab).
- Returns `204 No Content`.

```bash
curl -X DELETE 'http://localhost:3000/api/schema/categories/<id>' \
  -H 'x-organization-id: org_test'
```

---

## Schemas

### `GET /api/schemas`

Lists schemas, supporting search and category-subtree filtering.

| Query | Type | Default | Purpose |
|---|---|---|---|
| `search` | string | — | Matches the schema name (case-insensitive). |
| `categoryId` | string | — | Returns every schema in the category's subtree (descendants included). |
| `limit` | int (1-500) | — | Cap. |
| `skip` | int ≥ 0 | 0 | Offset. |

**Response**
```json
{
  "data": [
    {
      "_id": "schema_1",
      "id": "schema_1",
      "organization_id": "org_test",
      "name": "Invoice Schema",
      "category_id": "cat_2",
      "access_teams": ["team-1"],
      "attributes": [/* DocAttribute[] */],
      "agent_ids": ["agent-1"],
      "databoard_ids": ["board-1"],
      "created_at": "2026-05-18T...",
      "updated_at": "2026-05-18T..."
    }
  ],
  "count": 1,
  "limit": 20,
  "skip": 0
}
```

```bash
curl 'http://localhost:3000/api/schemas?search=invoice&categoryId=<id>&limit=20' \
  -H 'x-organization-id: org_test'
```

### `GET /api/schemas/:id`

Returns the full schema. 404 when it does not exist.

```bash
curl 'http://localhost:3000/api/schemas/<id>' -H 'x-organization-id: org_test'
```

### `POST /api/schemas`

Body:
```ts
{
  name: string;                        // required, unique per org
  category?: string | null;            // category id
  accessTeam?: string;                 // SPEC: single team — auto-normalized to [accessTeam]
  accessTeams?: string[];              // OR multiple team IDs
  attributes?: DocAttribute[];         // attribute array (see the schema below)
  agents?: (string | { _id: string })[];      // BE persists only _id
  databoards?: (string | { _id: string })[];  // BE persists only _id
}
```

`DocAttribute` (mirrors `BoardField` plus 2 AI fields):
```ts
{
  id?: string;                  // server-generated when absent
  name: string;                 // required, unique within the schema
  type: BoardFieldType;         // 23 types: ShortText, LongText, Number, Email, Phone, Date, Datetime,
                                // SingleSelection, MultipleSelection, Assignee, MultipleAssignee,
                                // Priority, Currency, Link, Attachment, Notes, Country, Origin,
                                // MapToBoard, TableInTable, Checkbox, Formula, Rating
  description?: string;
  isUniqueIdentifier?: boolean;
  isDefault?: boolean;
  isIdentifier?: boolean;
  hidden?: boolean;
  hiddenOnRecord?: boolean;
  defaultFieldName?: string;
  contactField?: string;
  data?: { id?: string; value: string; color?: string; order?: number }[];  // dropdown options
  settings?: Record<string, any>;       // type-specific
  extractionPrompt?: string;            // AI prompt
  sampleData?: string;                  // plain string OR a JSON string for TableInTable
  order?: number;
}
```

> **The spec types `Time` and `RichText` do not exist** in databoard. The FE maps them: `Time → Datetime`, `RichText → LongText`.

**Validation**:
- 400 when the schema name is already used within the same org.
- 400 when two attributes share a name (case-insensitive).
- 404 when `category` does not exist.

```bash
curl -X POST 'http://localhost:3000/api/schemas' \
  -H 'x-organization-id: org_test' -H 'Content-Type: application/json' \
  -d '{
    "name": "Invoice Schema",
    "category": "<cat-id>",
    "accessTeams": ["team-1","team-2"],
    "attributes": [
      {
        "name": "Invoice Number",
        "type": "ShortText",
        "isUniqueIdentifier": true,
        "extractionPrompt": "Extract the invoice number",
        "sampleData": "INV-2026-001"
      },
      {
        "name": "Total Amount",
        "type": "Currency",
        "settings": { "currencyCode": "USD" },
        "sampleData": "1250.00"
      },
      {
        "name": "Line Items",
        "type": "TableInTable",
        "sampleData": "[{\"Qty\":1,\"Item\":\"Dinner Set\",\"Price\":110}]"
      }
    ],
    "agents": ["agent-id-1"],
    "databoards": ["board-id-1"]
  }'
```

### `PUT /api/schemas/:id`

Partial body (same shape as `POST`, but every field optional). Passing `attributes`/`agents`/`databoards` replaces them entirely (no merge).

> ⚠ Not done in Phase 4: changing `attributes` does not yet propagate to the `databoard_ids[]` boards. Changing `databoard_ids` only logs a warning. The FE must call the board APIs itself to sync.

```bash
curl -X PUT 'http://localhost:3000/api/schemas/<id>' \
  -H 'x-organization-id: org_test' -H 'Content-Type: application/json' \
  -d '{"name":"Renamed Schema","accessTeams":["team-3"]}'
```

### `DELETE /api/schemas/:id`

Returns `204`. Field mappings on boards are not cleaned up yet (Phase 4).

```bash
curl -X DELETE 'http://localhost:3000/api/schemas/<id>' \
  -H 'x-organization-id: org_test'
```

---

## Attributes (mutations on a single Schema)

### `PUT /api/schemas/:schemaId/attributes/:attributeId`

Body: `Partial<DocAttribute>`. Updates one attribute.

- 400 when the new `name` collides with another attribute.
- 404 when the schema or attribute does not exist.

```bash
curl -X PUT 'http://localhost:3000/api/schemas/<schemaId>/attributes/<attributeId>' \
  -H 'x-organization-id: org_test' -H 'Content-Type: application/json' \
  -d '{"name":"Invoice No.","extractionPrompt":"Updated prompt"}'
```

### `DELETE /api/schemas/:schemaId/attributes/:attributeId`

Returns `204`. Hard-deletes from `attributes[]`. Field deletion is not propagated to boards yet (Phase 4).

```bash
curl -X DELETE 'http://localhost:3000/api/schemas/<schemaId>/attributes/<attributeId>' \
  -H 'x-organization-id: org_test'
```

---

## AI Extract Attributes

### `POST /api/schemas/_extract-attributes`

Multipart upload — AI extracts `DocAttribute[]` from files so the FE can pre-fill the Schema form. The BE uploads each file to S3 and then delegates to [messagesuggestion `/api/data-board/suggest-field-types-internal`](../../messagesuggestion/server/src/controllers/dataBoardController.ts) (re-using the OCR + vision LLM pipeline). The upstream endpoint is a server-to-server variant: it uses the static `INTERNAL_BOARD_MODEL_SCHEMA` (no live schema fetch) and authenticates with `x-user-id` + `x-organization-id` instead of `x-access-token`.

- **Content-Type**: `multipart/form-data`
- **Field name**: `files` (or `files[]`)
- **Limits** (see [`EXTRACT_ATTRIBUTES_LIMITS`](../src/presentation/schemas/doc-schema.schema.ts)): at most 5 files, each ≤ 10 MB
- **Allowed MIME**: `application/pdf`, `image/jpeg`, `image/png` (strict — CSV/XLSX are rejected with a 400)
- **Env required**: `APP_GATEWAY_HOST` (the gateway URL, routed through `/ai-agent/data-board/suggest-field-types-internal`). No M2M token is needed — the gateway injects `x-user-id` + `x-organization-id` from the caller.

**Response**
```json
{
  "attributes": [
    {
      "id": "<uuid>",
      "name": "Invoice Number",
      "type": "ShortText",
      "description": "Unique invoice number",
      "sampleData": "INV-2026-001",
      "order": 0
    },
    {
      "id": "<uuid>",
      "name": "Line Items",
      "type": "TableInTable",
      "sampleData": "[{\"Qty\":1,\"Item\":\"Dinner Set\",\"Price\":110}]",
      "settings": {
        "columns": [
          { "name": "Qty",   "type": "Number" },
          { "name": "Item",  "type": "ShortText" },
          { "name": "Price", "type": "Currency" }
        ]
      },
      "order": 2
    }
  ]
}
```

- `id` is temporary (a UUID generated server-side). The FE resends it on `POST /api/schemas` when the user saves.
- When the AI returns a `type` outside the `BoardFieldType` enum, it falls back to `ShortText` with an `[Original type: …]` note added to `description`.
- `extractionPrompt` is not set by the extractor — the FE fills it in if needed.

**Errors**
- `400` — 0 or more than 5 files, unsupported MIME, or a file that is too large.
- `401` — missing `x-organization-id` or `x-user-id`.
- `502` — the upstream messagesuggestion call failed (network / AI error).
- `500` — any other error (S3, etc.).

#### Test guide

**Prerequisites**
- The data_board service running at `http://localhost:8866` (`pnpm dev` or `npm run dev`).
- `APP_GATEWAY_HOST` pointing at a gateway whose `/ai-agent/*` route maps to messagesuggestion.
- AWS S3 credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`) — files are uploaded temporarily before the upstream call.
- A sample file (PDF/JPEG/PNG) — for example `./samples/invoice.pdf`.

**Direct (local data_board, bypassing the gateway)** — used in development to simulate gateway-injected headers:

```bash
curl -i -X POST 'http://localhost:8866/api/schemas/_extract-attributes' \
  -H 'x-organization-id: 6512ab34cd56ef7890123456' \
  -H 'x-user-id: 6789ab12cd34ef5678901234' \
  -F 'files=@./samples/invoice.pdf'
```

**Through app-gateway** — the gateway injects `x-user-id` + `x-organization-id` after validating `x-access-token`:

```bash
curl -i -X POST '<APP_GATEWAY_HOST>/data-board/schemas/_extract-attributes' \
  -H 'x-access-token: acc_xxx' \
  -F 'files=@./samples/invoice.pdf' \
  -F 'files=@./samples/receipt.jpg'
```

**Expected success (200)**

```json
{
  "attributes": [
    { "id": "…", "name": "Invoice Number", "type": "ShortText", "description": "Invoice number", "sampleData": "INV-2026-001", "order": 0 }
  ]
}
```

**Reproducing error cases**

```bash
# 401 — missing x-user-id
curl -i -X POST 'http://localhost:8866/api/schemas/_extract-attributes' \
  -H 'x-organization-id: org_test' \
  -F 'files=@./samples/invoice.pdf'

# 400 — file larger than 10 MB
curl -i -X POST 'http://localhost:8866/api/schemas/_extract-attributes' \
  -H 'x-organization-id: org_test' -H 'x-user-id: u1' \
  -F 'files=@./samples/huge.pdf'

# 400 — unsupported MIME (.csv is not pdf/jpeg/png)
curl -i -X POST 'http://localhost:8866/api/schemas/_extract-attributes' \
  -H 'x-organization-id: org_test' -H 'x-user-id: u1' \
  -F 'files=@./samples/data.csv'

# 400 — no file sent
curl -i -X POST 'http://localhost:8866/api/schemas/_extract-attributes' \
  -H 'x-organization-id: org_test' -H 'x-user-id: u1'

# 400 — more than 5 files
curl -i -X POST 'http://localhost:8866/api/schemas/_extract-attributes' \
  -H 'x-organization-id: org_test' -H 'x-user-id: u1' \
  -F 'files=@./samples/1.pdf' -F 'files=@./samples/2.pdf' \
  -F 'files=@./samples/3.pdf' -F 'files=@./samples/4.pdf' \
  -F 'files=@./samples/5.pdf' -F 'files=@./samples/6.pdf'
```

**Debugging — call upstream directly to isolate the failure**

When a `502` occurs, call messagesuggestion directly to tell whether the fault is in data_board or in AI/OCR:

```bash
# Bypass data_board, call messagesuggestion straight through the gateway
curl -i -X POST '<APP_GATEWAY_HOST>/ai-agent/data-board/suggest-field-types-internal' \
  -H 'x-user-id: u1' -H 'x-organization-id: org_test' \
  -H 'Content-Type: application/json' \
  -d '{"file_urls":["https://<bucket>.s3.<region>.amazonaws.com/doc-ai/extract/.../invoice.pdf"]}'
```

`file_urls` must be the public-read S3 URLs that data_board uploaded (data_board logs them in the `messagesuggestion suggest-field-types failed` error context).

**Quick checks when it fails**
| Symptom | Common cause |
|---|---|
| `401 "User ID required"` | The gateway did not inject `x-user-id`, or the header was omitted when testing directly |
| `500 "APP_GATEWAY_HOST not configured"` | The `APP_GATEWAY_HOST` env var is missing |
| `502` with a message containing `403`/`404` | The gateway has no `/ai-agent/*` rule pointing at messagesuggestion |
| `502 "Missing user ID"` (from upstream) | The `x-user-id` header never reached messagesuggestion (stripped by the gateway?) |
| `502 "Failed to fetch file"` | The S3 URL is not public, or the bucket policy blocks it |

---

## E2E test flow

```bash
ORG=org_test
BASE=http://localhost:3000/api

# 1. Create the parent category
CAT1=$(curl -s -X POST $BASE/schema/categories \
  -H "x-organization-id: $ORG" -H 'Content-Type: application/json' \
  -d '{"name":"Finance"}' | jq -r '.data._id')

# 2. Create the child category
CAT2=$(curl -s -X POST $BASE/schema/categories \
  -H "x-organization-id: $ORG" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Invoices\",\"parentId\":\"$CAT1\"}" | jq -r '.data._id')

# 3. Create a schema under the child category
SCHEMA=$(curl -s -X POST $BASE/schemas \
  -H "x-organization-id: $ORG" -H 'Content-Type: application/json' \
  -d "{
    \"name\":\"Invoice Schema\",
    \"category\":\"$CAT2\",
    \"accessTeams\":[\"team-1\"],
    \"attributes\":[
      {\"name\":\"Invoice No\",\"type\":\"ShortText\",\"isUniqueIdentifier\":true},
      {\"name\":\"Amount\",\"type\":\"Currency\",\"settings\":{\"currencyCode\":\"USD\"}}
    ]
  }" | jq -r '.data._id')

# 4. List schemas in the subtree (filtering from the Finance root still finds the schema under Invoices)
curl -s "$BASE/schemas?categoryId=$CAT1" -H "x-organization-id: $ORG" | jq '.count'

# 5. Update an attribute
ATTR=$(curl -s "$BASE/schemas/$SCHEMA" -H "x-organization-id: $ORG" | jq -r '.data.attributes[0].id')
curl -X PUT "$BASE/schemas/$SCHEMA/attributes/$ATTR" \
  -H "x-organization-id: $ORG" -H 'Content-Type: application/json' \
  -d '{"name":"Inv No."}'

# 6. Delete the parent category (children are promoted, schemas get category_id = null)
curl -X DELETE "$BASE/schema/categories/$CAT1" -H "x-organization-id: $ORG"
```

---

## Not done yet (open scope)

- `POST /api/schemas/:id/attributes` — add a single attribute
- `POST /api/schemas/:id/attributes/reorder` — reorder
- `POST /api/schemas/:id/databoards/:boardId` / `DELETE …` — explicit board attach/detach (currently done via `PUT /schemas/:id`)
- `POST /api/schemas/:id/databoards/:boardId/attributes/:attributeId/_resync` — clear the override and re-apply
- `GET /api/schemas/:id/_preview-propagation` — preview the impact
- Sync logic (hybrid: live binding + per-board override) — needs `schemaAttributeId` + `isOverridden` added to `BoardField`
