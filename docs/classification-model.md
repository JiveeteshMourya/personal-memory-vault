# Classification Model

Every memory in the vault carries labels that decide who may ever see it. This is the vault's core idea. Apps write free text and ask free-form questions, and the vault classifies, filters and projects. The owner controls the result from the dashboard.

The labels live in `src/lib/memory-taxonomy.ts` (Phase 06), and the access rules live in the policy engine `src/lib/policy/evaluate-access.ts`.

## The labels on every memory

| Label           | Values                                                                                | Set by                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Source**      | the owner ("Your entries", `source_type = 'user'`) or the connected app that wrote it | the vault, from the API key. Never from the request body, so an app can't forge it                       |
| **Category**    | 16 topics (below)                                                                     | the AI at extraction (with the app's `categoryHints`); the owner can relabel                             |
| **Sensitivity** | 4 ordered tiers (below)                                                               | the AI, conservatively; the app's `sensitivityFloor` can raise it, never lower it; the owner can relabel |
| **Visibility**  | `shared` (default) · `app_private`                                                    | the writing app                                                                                          |
| **Expiry**      | optional `expiresAt`                                                                  | the writing app, or the AI for short-lived facts                                                         |

## Categories

The categories are platform-agnostic: they cover any kind of GenAI app (coaching, coding, travel, shopping, learning, health), not only wellbeing.

| Category        | Covers                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| `identity`      | name, age, background, languages, pronouns, where they're from             |
| `preferences`   | likes, dislikes, styles, constraints (vegetarian, prefers concise answers) |
| `goals`         | what they're working towards, short and long term                          |
| `interests`     | hobbies, media, topics they follow                                         |
| `activity`      | exercise, workouts, steps, physical activity                               |
| `sleep`         | sleep times, duration, quality                                             |
| `diet`          | meals, eating habits, allergies, nutrition                                 |
| `health`        | symptoms, conditions, medication, appointments                             |
| `mood`          | emotions, stress, energy, mental wellbeing                                 |
| `work`          | job, projects, colleagues, career                                          |
| `education`     | studies, courses, skills being learned                                     |
| `social`        | friends, events, community                                                 |
| `relationships` | partner, family, close relationships                                       |
| `finance`       | income, spending, debts, accounts                                          |
| `travel`        | trips, places, commutes, whereabouts                                       |
| `other`         | anything that fits nowhere else                                            |

## Sensitivity tiers

Tiers are ordered by **the harm if leaked**. A grant caps access at a tier: a cap of `personal` allows `shareable` and `personal`.

| Tier        | Harm if leaked                                       | Examples                                                                                                                                                                               |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shareable` | none: fine for any app to know                       | tastes, interests, skills, languages, general goals, first name                                                                                                                        |
| `personal`  | profiling or targeting                               | routines, workouts, meals, sleep, schedule, work or study details, city-level whereabouts                                                                                              |
| `private`   | emotional or social harm                             | moods, feelings, relationships, family matters, private conversations, personal struggles                                                                                              |
| `protected` | concrete harm: medical, financial, legal or physical | diagnoses, medication, mental-health conditions, sexuality, religion, political views, income, debts, accounts, legal matters, exact address or live location, anything about children |

- `protected` matches the GDPR Article 9 "special categories" (health, sexuality, beliefs, political opinions), plus money, identity documents, legal matters and precise location.
- **Conservative by default:** when the AI is unsure between two tiers, it picks the higher one.
- **Redaction:** passwords, API keys and full card, account or government ID numbers are removed at extraction and are **never stored** at any tier.
- **Category and tier are independent.** A `health` memory can be `personal` ("walked 8k steps") or `protected` ("diagnosed with asthma"). Grants combine both.

## Access rules

### Write

An app **W** may store memory **M** only if W holds a **write grant** for M's category with a cap ≥ M's tier, judged after classification and the floor. Anything else is **withheld**: never stored, and reported back to W only as `{ category, reason }`.

An app with no write grants at all gets `403 write_denied` **before** its text reaches the LLM.

### Read

An app **R** may receive memory **M** only if **all four** hold:

1. **Category and tier:** R holds a read grant for M's category with a cap ≥ M's tier.
2. **Source:** the owner has allowed R to read **M's source**. Sources are **denied by default**, including "Your entries" and R's own writes. A newly connected app's data flows to no one until the owner ticks it.
3. **Visibility:** M is `shared`, or R wrote it.
4. **Freshness:** M hasn't expired.

Memories left behind by a deleted app (source app null) are never shared with any app.

The decision happens **before retrieval**. The vector search is filtered to the allowed categories, tiers and sources, and every fetched row is checked again. **The AI never makes an authorization decision.** It only sees memories that already passed these rules.

### Retract

An app may delete memories **it wrote itself**, and nothing else. No grant is needed, since retracting only ever reduces data.

## What the owner controls (dashboard)

Per connected app, on `/dashboard/permissions`:

- **Read** and **write** toggles per category, each with a tier cap
- **"Reads data from"** toggles: Your entries, each connected app, and this app's own writes
- **Revoke all**, which removes every grant and source permission at once
- consent requests from apps, approved or denied (Phase 09)

On `/dashboard/memories` the owner can relabel any memory's category or tier, or delete it. On `/dashboard/access-log` they see every write, retract and context request, including which memories were disclosed.

## What a reading app learns about the vault

- It gets **only the projected context text**, plus coverage counts, and optionally the category, tier and date of each source memory.
- It **never learns other apps' names.** Its own permission summary reports only a count of other allowed sources.
- `withheldCategories` lists only categories **the app itself named** in `categories` and isn't granted. So the response never reveals whether data exists in a category the app didn't ask about.
