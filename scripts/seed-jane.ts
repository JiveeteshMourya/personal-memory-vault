// Seeds the demo vault for "Jane" (the objective's working example): about 60 of her own memories,
// covering all 16 topics and all 4 tiers, with tags, importance and provenance. No apps: they're
// registered live during the demo (docs/demo-runbook.md).
//
//   bun run seed:jane [email] [--reset]     (default jane@example.com; sign up first)
//
// Without --reset it only seeds an account that has no memories. With --reset it first deletes the
// account's memories, connected apps (their keys, grants, sources and consent requests go with
// them) and access log, keeping only the account itself. Afterwards, run `bun run reindex`.
//
// The protected and private entries (an asthma diagnosis, debts, a strained relationship) are there
// on purpose: the demo shows that no app sees them without an explicit grant.

import { eq } from "drizzle-orm";
import type { MemoryAnnotations } from "@/server/repository/memory.repository";
import { accessEvents, connectedApps, memories, users } from "@/server/models";
import { encryptField } from "@/server/lib/crypto";
import { db } from "@/server/lib/db";
import {
  MEMORY_CATEGORIES,
  SENSITIVITY_TIERS,
  type MemoryCategory,
  type Provenance,
  type Sensitivity,
} from "@/shared/constants/memory-taxonomy";

type SeedMemory = {
  daysAgo: number;
  hour: number;
  category: MemoryCategory;
  sensitivity: Sensitivity;
  content: string;
  tags: string[];
  /** 1–5, default 3. */
  importance?: number;
  /** Default `user_stated`. Tracker data is `imported`, and trusted a little less. */
  provenance?: Provenance;
  /** A short-lived fact: never shared with an app after this many days from now. */
  expiresInDays?: number;
};

const JANE: SeedMemory[] = [
  // Identity
  {
    daysAgo: 60,
    hour: 9,
    category: "identity",
    sensitivity: "shareable",
    content: "I'm Jane; close friends call me Jay.",
    tags: ["name"],
  },
  {
    daysAgo: 60,
    hour: 9,
    category: "identity",
    sensitivity: "shareable",
    content: "I'm 29 and speak English and Portuguese.",
    tags: ["age", "languages"],
  },
  {
    daysAgo: 60,
    hour: 9,
    category: "identity",
    sensitivity: "personal",
    content: "Grew up in Lisbon and moved to Bristol six years ago.",
    tags: ["hometown", "bristol"],
  },
  // Preferences
  {
    daysAgo: 45,
    hour: 12,
    category: "preferences",
    sensitivity: "shareable",
    content: "Vegetarian for three years: I eat eggs, but no meat or fish.",
    tags: ["vegetarian"],
    importance: 5,
  },
  {
    daysAgo: 30,
    hour: 10,
    category: "preferences",
    sensitivity: "shareable",
    content: "I prefer short, direct answers to long explanations.",
    tags: ["communication"],
    importance: 4,
  },
  {
    daysAgo: 30,
    hour: 10,
    category: "preferences",
    sensitivity: "personal",
    content: "I like to work out in the morning, before 8am.",
    tags: ["workout", "morning"],
  },
  {
    daysAgo: 25,
    hour: 18,
    category: "preferences",
    sensitivity: "shareable",
    content: "I dislike crowded gyms; I'd rather run outdoors or do yoga at home.",
    tags: ["gym", "running", "yoga"],
  },
  // Goals
  {
    daysAgo: 20,
    hour: 8,
    category: "goals",
    sensitivity: "shareable",
    content: "Training for my first half marathon, on 15 March.",
    tags: ["half marathon", "running"],
    importance: 5,
  },
  {
    daysAgo: 18,
    hour: 20,
    category: "goals",
    sensitivity: "personal",
    content: "Saving £3,000 for a trip to Japan next autumn.",
    tags: ["savings", "japan", "travel"],
    importance: 4,
  },
  {
    daysAgo: 9,
    hour: 23,
    category: "goals",
    sensitivity: "personal",
    content: "I want to be in bed before 11pm on weeknights.",
    tags: ["sleep", "habit"],
  },
  // Interests
  {
    daysAgo: 15,
    hour: 21,
    category: "interests",
    sensitivity: "shareable",
    content: "I read science fiction; halfway through a Le Guin novel right now.",
    tags: ["books", "sci-fi"],
  },
  {
    daysAgo: 12,
    hour: 22,
    category: "interests",
    sensitivity: "shareable",
    content: "I play chess online most evenings.",
    tags: ["chess"],
  },
  {
    daysAgo: 28,
    hour: 19,
    category: "interests",
    sensitivity: "shareable",
    content: "Love indie folk and small gigs.",
    tags: ["music", "gigs"],
    importance: 2,
  },
  // Activity
  {
    daysAgo: 1,
    hour: 7,
    category: "activity",
    sensitivity: "personal",
    content: "Ran 5 km along the river in 27 minutes. Legs felt fresh.",
    tags: ["running", "5k"],
  },
  {
    daysAgo: 3,
    hour: 18,
    category: "activity",
    sensitivity: "personal",
    content: "45-minute yoga class after work, mostly hip openers.",
    tags: ["yoga"],
  },
  {
    daysAgo: 4,
    hour: 12,
    category: "activity",
    sensitivity: "personal",
    content: "Walked 11,200 steps, most of them on a lunchtime loop of the park.",
    tags: ["steps", "walking"],
    provenance: "imported",
    importance: 2,
  },
  {
    daysAgo: 6,
    hour: 7,
    category: "activity",
    sensitivity: "personal",
    content: "30-minute strength session: squats, rows and push-ups.",
    tags: ["strength"],
  },
  {
    daysAgo: 8,
    hour: 9,
    category: "activity",
    sensitivity: "personal",
    content: "Cycled 22 km to the lake and back.",
    tags: ["cycling"],
  },
  {
    daysAgo: 10,
    hour: 19,
    category: "activity",
    sensitivity: "personal",
    content: "Skipped the evening run because my knee felt stiff.",
    tags: ["running", "knee"],
    importance: 4,
  },
  {
    daysAgo: 13,
    hour: 8,
    category: "activity",
    sensitivity: "personal",
    content: "Easy 12 km long run, the furthest in a month.",
    tags: ["running", "long run"],
    importance: 4,
  },
  // Sleep
  {
    daysAgo: 1,
    hour: 6,
    category: "sleep",
    sensitivity: "personal",
    content: "Slept 7h40m and woke up once around 3am.",
    tags: ["sleep"],
    provenance: "imported",
  },
  {
    daysAgo: 2,
    hour: 7,
    category: "sleep",
    sensitivity: "personal",
    content: "Only 5h50m of sleep after scrolling on my phone until 1am.",
    tags: ["sleep", "screen time"],
    importance: 4,
  },
  {
    daysAgo: 5,
    hour: 7,
    category: "sleep",
    sensitivity: "personal",
    content: "Fell asleep quickly after yoga and slept 8h10m.",
    tags: ["sleep", "yoga"],
    provenance: "imported",
  },
  {
    daysAgo: 7,
    hour: 6,
    category: "sleep",
    sensitivity: "personal",
    content: "Restless night, about 6 hours. Kept thinking about Monday's presentation.",
    tags: ["sleep", "stress"],
  },
  {
    daysAgo: 12,
    hour: 7,
    category: "sleep",
    sensitivity: "personal",
    content: "Slept 7 hours but woke up groggy after a late espresso.",
    tags: ["sleep", "caffeine"],
  },
  // Diet
  {
    daysAgo: 1,
    hour: 8,
    category: "diet",
    sensitivity: "personal",
    content: "Breakfast: oatmeal with blueberries and a spoon of peanut butter.",
    tags: ["breakfast"],
    importance: 2,
  },
  {
    daysAgo: 2,
    hour: 13,
    category: "diet",
    sensitivity: "personal",
    content: "Chickpea salad for lunch, and no afternoon snack.",
    tags: ["lunch"],
    importance: 2,
  },
  {
    daysAgo: 3,
    hour: 20,
    category: "diet",
    sensitivity: "personal",
    content: "Pizza for dinner, two slices more than I planned.",
    tags: ["dinner"],
  },
  {
    daysAgo: 5,
    hour: 16,
    category: "diet",
    sensitivity: "personal",
    content: "Drank about 2.5 litres of water, my best day this week.",
    tags: ["hydration"],
    importance: 2,
  },
  {
    daysAgo: 11,
    hour: 15,
    category: "diet",
    sensitivity: "personal",
    content: "Cutting back on sugar: five days in a row without dessert.",
    tags: ["sugar"],
    importance: 4,
  },
  {
    daysAgo: 40,
    hour: 13,
    category: "diet",
    sensitivity: "personal",
    content: "Lactose intolerant: milk upsets my stomach, but yoghurt is fine.",
    tags: ["lactose", "intolerance"],
    provenance: "user_confirmed",
    importance: 5,
  },
  // Health
  {
    daysAgo: 40,
    hour: 11,
    category: "health",
    sensitivity: "protected",
    content: "Diagnosed with mild asthma; I use an inhaler before hard runs.",
    tags: ["asthma", "inhaler"],
    importance: 5,
  },
  {
    daysAgo: 10,
    hour: 10,
    category: "health",
    sensitivity: "protected",
    content: "Physio says the knee pain is mild tendinitis: ice and rest for a week.",
    tags: ["knee", "tendinitis", "physio"],
    importance: 4,
  },
  {
    daysAgo: 6,
    hour: 16,
    category: "health",
    sensitivity: "personal",
    content: "Headache most of the afternoon, probably from not drinking enough.",
    tags: ["headache"],
    importance: 2,
  },
  {
    daysAgo: 2,
    hour: 11,
    category: "health",
    sensitivity: "personal",
    content: "Eye test booked for next Tuesday morning.",
    tags: ["appointment"],
    importance: 2,
  },
  // Mood
  {
    daysAgo: 1,
    hour: 21,
    category: "mood",
    sensitivity: "private",
    content: "Calm and proud after the morning run. Good energy all day.",
    tags: ["energy"],
  },
  {
    daysAgo: 2,
    hour: 22,
    category: "mood",
    sensitivity: "private",
    content: "Irritable and foggy today, probably from the short night.",
    tags: ["irritable"],
  },
  {
    daysAgo: 4,
    hour: 21,
    category: "mood",
    sensitivity: "private",
    content: "Anxious about the work presentation. Journaling helped a little.",
    tags: ["anxiety", "journaling"],
    importance: 4,
  },
  {
    daysAgo: 6,
    hour: 20,
    category: "mood",
    sensitivity: "private",
    content: "Really happy after a long call with my sister.",
    tags: ["family"],
  },
  {
    daysAgo: 9,
    hour: 22,
    category: "mood",
    sensitivity: "private",
    content: "Felt low and unmotivated most of the afternoon.",
    tags: ["low mood"],
  },
  {
    daysAgo: 12,
    hour: 21,
    category: "mood",
    sensitivity: "private",
    content: "I'm noticeably more upbeat on days I exercise.",
    tags: ["exercise", "pattern"],
    importance: 4,
  },
  // Work
  {
    daysAgo: 30,
    hour: 9,
    category: "work",
    sensitivity: "personal",
    content: "I'm a product designer at a small fintech start-up, mostly on the mobile app.",
    tags: ["job", "design"],
    importance: 4,
  },
  {
    daysAgo: 7,
    hour: 10,
    category: "work",
    sensitivity: "personal",
    content: "Presenting the new onboarding flow to leadership on Monday.",
    tags: ["presentation"],
    importance: 4,
  },
  {
    daysAgo: 3,
    hour: 17,
    category: "work",
    sensitivity: "personal",
    content: "My manager praised the onboarding redesign in the team retro.",
    tags: ["feedback"],
  },
  // Education
  {
    daysAgo: 35,
    hour: 19,
    category: "education",
    sensitivity: "shareable",
    content: "Learning Spanish with a weekly tutor; around A2 level.",
    tags: ["spanish"],
  },
  {
    daysAgo: 21,
    hour: 19,
    category: "education",
    sensitivity: "personal",
    content: "Taking an evening course in data visualisation on Thursdays.",
    tags: ["course", "dataviz"],
  },
  // Social
  {
    daysAgo: 8,
    hour: 21,
    category: "social",
    sensitivity: "personal",
    content: "Dinner with friends; I had two glasses of wine.",
    tags: ["friends", "wine"],
  },
  {
    daysAgo: 20,
    hour: 11,
    category: "social",
    sensitivity: "personal",
    content: "My book club meets on the first Sunday of every month.",
    tags: ["book club"],
  },
  {
    daysAgo: 2,
    hour: 19,
    category: "social",
    sensitivity: "personal",
    content: "Organising a picnic for Priya's birthday next Saturday.",
    tags: ["birthday", "friends"],
  },
  // Relationships
  {
    daysAgo: 4,
    hour: 22,
    category: "relationships",
    sensitivity: "private",
    content: "Tense conversation with Alex about moving in together.",
    tags: ["alex", "partner"],
    importance: 4,
  },
  {
    daysAgo: 8,
    hour: 23,
    category: "relationships",
    sensitivity: "private",
    content: "Feeling distant from Alex lately. Not sure we want the same things.",
    tags: ["alex", "partner"],
    importance: 4,
  },
  {
    daysAgo: 13,
    hour: 20,
    category: "relationships",
    sensitivity: "private",
    content: "Dinner with Mum went well; we finally talked about Dad's health.",
    tags: ["family", "mum"],
  },
  // Finance
  {
    daysAgo: 3,
    hour: 10,
    category: "finance",
    sensitivity: "protected",
    content: "Paid off the last £1,200 of my credit card balance.",
    tags: ["credit card", "debt"],
  },
  {
    daysAgo: 25,
    hour: 20,
    category: "finance",
    sensitivity: "protected",
    content: "Still owe about £14,000 on my student loan.",
    tags: ["student loan", "debt"],
    importance: 4,
  },
  {
    daysAgo: 7,
    hour: 18,
    category: "finance",
    sensitivity: "protected",
    content: "Rent goes up to £1,450 a month from January.",
    tags: ["rent"],
  },
  {
    daysAgo: 11,
    hour: 9,
    category: "finance",
    sensitivity: "protected",
    content: "Moved £300 into the Japan savings pot.",
    tags: ["savings", "japan"],
    importance: 2,
  },
  // Travel
  {
    daysAgo: 0,
    hour: 9,
    category: "travel",
    sensitivity: "personal",
    content: "Visiting my sister in Lisbon this weekend, back on Monday.",
    tags: ["lisbon", "family"],
    expiresInDays: 5,
  },
  {
    daysAgo: 14,
    hour: 8,
    category: "travel",
    sensitivity: "personal",
    content: "I cycle 4 km to the office on Tuesdays and Thursdays.",
    tags: ["commute", "cycling"],
    importance: 2,
  },
  // Other
  {
    daysAgo: 50,
    hour: 18,
    category: "other",
    sensitivity: "shareable",
    content: "I have a cat called Miso.",
    tags: ["pet", "cat"],
    importance: 2,
  },
];

// Tracker imports are a little less certain than what Jane typed herself.
const CONFIDENCE: Partial<Record<Provenance, number>> = { imported: 0.9 };

function daysFromNow(days: number, hour?: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  if (hour !== undefined) date.setHours(hour, 0, 0, 0);
  return date;
}

/** Fails loudly if an edit to JANE stops covering every topic and tier. */
function assertCoverage() {
  const missing = [
    ...MEMORY_CATEGORIES.filter(category => !JANE.some(m => m.category === category)),
    ...SENSITIVITY_TIERS.filter(tier => !JANE.some(m => m.sensitivity === tier)),
  ];
  if (missing.length > 0) throw new Error(`The seed doesn't cover: ${missing.join(", ")}`);
}

async function seed(email: string, reset: boolean) {
  assertCoverage();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    console.error(`No account for ${email}. Sign up as ${email} first, then rerun.`);
    return 1;
  }

  const rows = JANE.map(memory => {
    const provenance = memory.provenance ?? "user_stated";
    const annotations: MemoryAnnotations = {
      tags: memory.tags,
      entities: [],
      contentType: null,
      domain: null,
    };
    return {
      userId: user.id,
      contentEncrypted: encryptField(memory.content),
      annotationsEncrypted: encryptField(JSON.stringify(annotations)),
      category: memory.category,
      sensitivity: memory.sensitivity,
      sourceType: "user" as const,
      provenance,
      confidence: CONFIDENCE[provenance] ?? 1,
      importance: memory.importance ?? 3,
      expiresAt: memory.expiresInDays ? daysFromNow(memory.expiresInDays) : null,
      occurredAt: daysFromNow(-memory.daysAgo, memory.hour),
    };
  });

  const seeded = await db.transaction(async tx => {
    if (reset) {
      await tx.delete(memories).where(eq(memories.userId, user.id));
      // Keys, grants, sources and consent requests cascade with their apps.
      await tx.delete(connectedApps).where(eq(connectedApps.userId, user.id));
      await tx.delete(accessEvents).where(eq(accessEvents.userId, user.id));
    } else {
      const [existing] = await tx
        .select({ id: memories.id })
        .from(memories)
        .where(eq(memories.userId, user.id))
        .limit(1);
      if (existing) return false;
    }
    await tx.insert(memories).values(rows);
    return true;
  });

  if (!seeded) {
    console.error(`${email} already has memories. Rerun with --reset to start over.`);
    return 1;
  }
  if (reset) console.log(`Cleared ${email}'s memories, apps and access log.`);
  console.log(`Seeded ${JANE.length} memories for ${email}.`);
  console.log("Now run `bun run reindex` to make them searchable by connected apps.");
  return 0;
}

const args = process.argv.slice(2);
// Better Auth stores emails lowercased.
const email = (args.find(arg => !arg.startsWith("--")) ?? "jane@example.com").trim().toLowerCase();
try {
  process.exitCode = await seed(email, args.includes("--reset"));
} finally {
  await db.$client.end();
}
