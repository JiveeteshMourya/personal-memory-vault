# Public API (v1)

This is how any GenAI app connects to a Personal Memory Vault. The API is **platform-agnostic**: there are no app-specific schemas.

- **Writing:** apps write free text, and the vault extracts and classifies memories.
- **Reading:** apps ask in natural language, and get back a short, purpose-specific context they can drop into their own system prompt.

The rich optional fields exist to make that context better.

Who may see what is decided by the [classification model](classification-model.md) and the owner's permissions. An app is never told more than it's allowed.

> **Status:** this is the target contract for the sprint. Each endpoint notes the phase that delivers it. A phase that changes an endpoint updates this file.

## Conventions

- **Base URL (local demo):** `http://localhost:3000/api/v1`
- **Auth:** `Authorization: Bearer pmv_…`. The owner creates the key on `/dashboard/apps`. One key means one app in one owner's vault. Call **server-to-server** only, and never ship the key to a browser.
- **Bodies:** JSON, with camelCase field names. Validation is strict: an **unknown field is a 400**, so typos surface immediately.
- **Times:** ISO 8601 datetimes. **Language:** BCP-47 (`en`, `hi-IN`). **Timezone:** IANA (`Asia/Kolkata`).
- **Categories and tiers:** see [classification-model.md](classification-model.md). `GET /permissions` returns them too.
- **Errors:** `{ "error": { "code": string, "message": string, "details"?: unknown } }`

| Status | `code`              | When                                                      |
| ------ | ------------------- | --------------------------------------------------------- |
| 400    | `validation_error`  | The body doesn't match the schema (`details` shows where) |
| 401    | `unauthorized`      | Missing, malformed, unknown or revoked key                |
| 403    | `write_denied`      | The app holds no write grant at all                       |
| 403    | `read_denied`       | The app holds no read grant or no allowed source          |
| 502    | `processing_failed` | The AI provider or the vector index failed                |
| 500    | `internal_error`    | Anything else                                             |

## `GET /permissions`: what this app may do (Phase 06)

Returns the calling app's own access, so it can shape its requests.

```json
{
  "app": { "id": "…", "name": "Fitness Coach" },
  "write": [{ "category": "activity", "maxSensitivity": "personal" }],
  "read": [{ "category": "sleep", "maxSensitivity": "personal" }],
  "sources": { "ownEntries": true, "thisApp": true, "otherAppsCount": 2 },
  "taxonomy": {
    "categories": [{ "id": "activity", "label": "Activity", "description": "…" }],
    "sensitivities": [{ "id": "shareable", "label": "Shareable", "description": "…" }]
  }
}
```

- `write` and `read` list each granted category with its tier cap, in taxonomy order. An empty list means no access for that operation: a newly connected app gets `[]` for both.
- Reading also needs an allowed source: `ownEntries` (the owner's own entries), `thisApp` (your own writes) or another app. Every source starts off.
- `sources` never names other apps, because which apps the owner uses is private too.

## `POST /memories`: write (Phase 07)

Send anything the user told your app, or anything your app observed. The vault splits it into atomic memories, then classifies each one's category and tier. It **stores only what your write grants allow**.

| Field              | Type                                                                                                    | What it improves                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `content`          | string, ≤ 8000                                                                                          | Free text: a note, journal entry, summary or observation. **Exactly one of `content` / `messages` is required.**           |
| `messages`         | `{ role: "user"\|"assistant"\|"system"\|"tool", content: string ≤ 4000, timestamp?: datetime }[]`, ≤ 50 | A conversation transcript. Facts the user stated are trusted; the assistant's own claims are kept only with low confidence |
| `contentType`      | `note`\|`conversation`\|`journal`\|`event`\|`observation`\|`document`\|`summary`\|`profile`             | Picks the extraction strategy                                                                                              |
| `mode`             | `extract` (default) \| `verbatim`                                                                       | Split into atomic facts, or store `content` as one memory (still classified and redacted; ≤ 2000 chars)                    |
| `provenance`       | `user_stated`\|`user_confirmed`\|`app_observed`\|`app_inferred`\|`imported`                             | Trust. Inferred facts get capped confidence and are hedged when projected                                                  |
| `confidence`       | number 0–1                                                                                              | Your certainty about the input                                                                                             |
| `importance`       | integer 1–5                                                                                             | Ranks the memory higher at read time                                                                                       |
| `occurredAt`       | datetime (default: now)                                                                                 | When it happened. Anchors relative dates such as "yesterday"                                                               |
| `timezone`         | IANA                                                                                                    | Resolves relative times and time-of-day patterns                                                                           |
| `expiresAt`        | datetime                                                                                                | A short-lived fact ("traveling this week") stops being shared after this                                                   |
| `language`         | BCP-47                                                                                                  | The input's language. Memories are stored in English, so retrieval works the same across apps                              |
| `domain`           | string, ≤ 40                                                                                            | Your app's domain (`fitness`, `healthcare`, `coding` …), a classification hint                                             |
| `categoryHints`    | category[]                                                                                              | Suggested categories. The AI decides, and your grants still apply                                                          |
| `sensitivityFloor` | tier                                                                                                    | Minimum tier for everything in this request. A medical app sends `protected`                                               |
| `tags`             | string[], ≤ 20, each ≤ 40                                                                               | Keywords stored (encrypted) with each memory and embedded with it to boost recall                                          |
| `entities`         | `{ name: string, type: "person"\|"place"\|"organization"\|"product"\|"condition"\|"other" }[]`, ≤ 20    | Known people, places and things, for linking                                                                               |
| `sessionId`        | string, ≤ 100                                                                                           | Groups memories from one conversation; used by the access log and by retract                                               |
| `externalId`       | string, ≤ 100                                                                                           | Your own id for this input. Re-sending the same `externalId` never creates duplicates                                      |
| `visibility`       | `shared` (default) \| `app_private`                                                                     | `app_private` memories can only ever be read back by your app                                                              |
| `dryRun`           | boolean                                                                                                 | Returns what would be stored and withheld, without storing anything                                                        |

```json
{
  "messages": [
    { "role": "user", "content": "Did a 5k this morning, knee felt a bit sore after." },
    { "role": "assistant", "content": "Nice! Ice it tonight." }
  ],
  "contentType": "conversation",
  "provenance": "user_stated",
  "occurredAt": "2026-11-16T07:30:00+05:30",
  "timezone": "Asia/Kolkata",
  "domain": "fitness",
  "sessionId": "chat_8812",
  "externalId": "msg_8812_14"
}
```

**201 Created**

```json
{
  "requestId": "…",
  "stored": [
    {
      "id": "…",
      "content": "The user ran 5 km on the morning of 2026-11-16.",
      "category": "activity",
      "sensitivity": "personal",
      "occurredAt": "2026-11-16T07:30:00+05:30",
      "expiresAt": null,
      "importance": 3
    }
  ],
  "withheld": [{ "category": "health", "reason": "no_write_grant" }],
  "duplicates": 0,
  "dryRun": false
}
```

- `requestId` is the id of this write's entry in the owner's access log.
- `stored` echoes only memories **your app** just wrote. With `dryRun`, each `id` is `null` and nothing is stored.
- `withheld` gives a category and reason, never content. Here, the sore knee was classified as `health`, which this app can't write. `reason` is `no_write_grant` (no grant for that category) or `sensitivity_above_cap` (a grant exists, but the memory's tier is above its cap).
- `duplicates` is `1` when your app already wrote memories with this `externalId`: nothing is extracted or stored again.
- With no write grants at all, the request fails with `403 write_denied` **before** your text reaches any AI model.
- If the AI provider or the index fails, the request fails with `502 processing_failed` and nothing is stored, so it's safe to retry.
- Memories are stored in English, with relative dates resolved, credentials and card, account or ID numbers redacted, and confidence capped by `provenance` (`app_inferred` at most 0.6, `app_observed` and `imported` at most 0.9).

## `DELETE /memories`: retract (Phase 07)

Removes memories **your app wrote**, for example after the user deletes something in your app. No grant is needed.

| Field         | Type            | Notes                                         |
| ------------- | --------------- | --------------------------------------------- |
| `ids`         | uuid[], ≤ 100   | Memory ids returned by `POST /memories`       |
| `externalIds` | string[], ≤ 100 | Every memory written with these `externalId`s |
| `sessionId`   | string          | Every memory written in this session          |

At least one non-empty field is required; a memory matching any of them is deleted. **200** `{ "deleted": 3 }`. Ids that aren't yours count as not found and are silently skipped.

## `POST /context`: read (Phase 08)

Ask for what you need to know about the user. The vault does the rest:

1. checks your grants and allowed sources **first**
2. searches only that slice by meaning
3. ranks what it finds
4. returns a **projection of at most 100 words**, written for your purpose

Put `context` straight into your system prompt.

| Field               | Type                                                                                   | What it improves                                                                              |
| ------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `query`             | string, ≤ 2000, **required**                                                           | What you need to know ("What should I consider when planning this user's workouts?")          |
| `purpose`           | string, ≤ 200                                                                          | Why you're asking. Shown to the owner in their access log                                     |
| `task`              | `personalize`\|`answer`\|`recommend`\|`plan`\|`summarize_profile`\|`check_constraints` | Shapes the projection. `check_constraints` surfaces allergies, limits and dislikes first      |
| `conversation`      | `{ role, content ≤ 4000 }[]`, ≤ 20                                                     | Recent turns. The vault rewrites them into a standalone search, so "what about dinner?" works |
| `knownFacts`        | string[], ≤ 20                                                                         | What you already know, so the vault doesn't spend words repeating it                          |
| `keywords`          | string[], ≤ 20                                                                         | Extra search terms                                                                            |
| `entities`          | string[], ≤ 20                                                                         | People, places or things to focus on                                                          |
| `categories`        | category[]                                                                             | Only these categories (intersected with your grants)                                          |
| `excludeCategories` | category[]                                                                             | Never these, even if granted                                                                  |
| `origin`            | `any` (default) \| `other_apps` \| `this_app`                                          | `other_apps` returns **only what the user hasn't already told your app**                      |
| `timeRange`         | `{ from?: datetime, to?: datetime }`                                                   | Only memories that occurred in this window                                                    |
| `recency`           | `recent`\|`balanced` (default)\|`all_time`                                             | How much newer memories are favoured                                                          |
| `depth`             | `quick`\|`standard` (default)\|`deep`                                                  | How many memories to consider (≈ 8 / 20 / 40). Speed vs coverage                              |
| `minConfidence`     | number 0–1                                                                             | Ignores uncertain memories                                                                    |
| `maxWords`          | integer 20–100 (default 100)                                                           | Length budget for `context`                                                                   |
| `format`            | `paragraph` (default) \| `bullets`                                                     | Output shape                                                                                  |
| `perspective`       | `third_person` (default) \| `second_person`                                            | "The user…" for system prompts, or "You…" for showing to the user                             |
| `language`          | BCP-47 (default `en`)                                                                  | Output language                                                                               |
| `timezone`          | IANA                                                                                   | Relative times ("2 days ago") are rendered for this zone                                      |
| `includeSources`    | boolean                                                                                | Adds `sources`: category, tier and date of each memory used, with no content and no app names |
| `sessionId`         | string, ≤ 100                                                                          | Ties requests together in the access log                                                      |

```json
{
  "query": "Plan a light workout for today. Anything I should be careful about?",
  "purpose": "Daily workout plan",
  "task": "plan",
  "origin": "other_apps",
  "categories": ["activity", "sleep", "health", "finance"],
  "recency": "recent",
  "knownFacts": ["Runs 5 km most mornings"],
  "maxWords": 80,
  "timezone": "Asia/Kolkata",
  "includeSources": true
}
```

**200 OK**

```json
{
  "requestId": "…",
  "context": "The user slept under six hours on three of the last four nights and reported feeling drained yesterday. They mentioned mild knee soreness after Sunday's run…",
  "wordCount": 41,
  "coverage": {
    "memoriesUsed": 4,
    "categories": ["sleep", "mood", "health"],
    "timeSpan": { "from": "2026-11-12T00:00:00Z", "to": "2026-11-16T00:00:00Z" }
  },
  "withheldCategories": ["finance"],
  "sources": [
    { "category": "sleep", "sensitivity": "personal", "occurredAt": "2026-11-15T23:40:00Z" }
  ],
  "generatedAt": "…"
}
```

- `withheldCategories` lists only categories **you named** and aren't granted. It never reveals whether data exists elsewhere.
- When nothing relevant is allowed, `context` is `""` and `memoriesUsed` is `0`. No AI call is made.
- With no read grant or no allowed source at all, the request fails with `403 read_denied`.

## `POST /consent-requests`: ask for access (Phase 09)

Ask the owner for access you don't have. They approve or deny it on their dashboard, and may narrow it.

| Field            | Type                            | Notes                                          |
| ---------------- | ------------------------------- | ---------------------------------------------- |
| `operation`      | `read` \| `write`, **required** |                                                |
| `categories`     | category[], 1–16, **required**  |                                                |
| `maxSensitivity` | tier                            | The cap you're asking for (default `personal`) |
| `reason`         | string, ≤ 300, **required**     | Shown to the owner. Say what the user gains    |

**201** `{ "id": "…", "status": "pending" }`. Check `GET /permissions` later to see what was granted.

## `GET /health`

No auth. Reports whether the vault and its database are up.
