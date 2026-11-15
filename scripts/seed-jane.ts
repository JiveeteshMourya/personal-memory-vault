// Seeds about 30 realistic memories for "Jane" (the objective's working example) into an existing,
// empty account. Run with `bun run seed:jane [email]` (default jane@example.com); sign up first.
// The health, finance and relationships entries are private/protected on purpose: later phases use
// them to test that apps never see them without an explicit grant.

import { eq } from "drizzle-orm";
import { memories, users } from "@/db/schema";
import { encryptField } from "@/lib/crypto";
import { db } from "@/lib/db";
import type { MemoryCategory, Sensitivity } from "@/lib/memory-taxonomy";

type SeedMemory = [daysAgo: number, hour: number, MemoryCategory, Sensitivity, content: string];

const JANE: SeedMemory[] = [
  // Activity (her fitness app)
  [1, 7, "activity", "personal", "Ran 5 km along the river in 27 minutes. Legs felt fresh."],
  [3, 18, "activity", "personal", "45-minute yoga class after work, mostly hip openers."],
  [
    4,
    12,
    "activity",
    "personal",
    "Walked 11,200 steps, most of them on a lunchtime loop of the park.",
  ],
  [6, 7, "activity", "personal", "30-minute strength session: squats, rows and push-ups."],
  [8, 9, "activity", "personal", "Cycled 22 km to the lake and back."],
  [10, 19, "activity", "personal", "Skipped the evening run because my knee felt stiff."],
  [13, 8, "activity", "personal", "Easy 12 km long run, the furthest in a month."],
  // Sleep
  [1, 6, "sleep", "personal", "Slept 7h40m and woke up once around 3am."],
  [2, 7, "sleep", "personal", "Only 5h50m of sleep after scrolling on my phone until 1am."],
  [5, 7, "sleep", "personal", "Fell asleep quickly after yoga and slept 8h10m."],
  [7, 6, "sleep", "personal", "Restless night, about 6 hours. Kept thinking about Monday's talk."],
  [9, 14, "sleep", "personal", "20-minute nap after lunch; felt sharper all afternoon."],
  [12, 7, "sleep", "personal", "Slept 7 hours but woke up groggy after a late espresso."],
  // Diet (her food tracking app)
  [1, 8, "diet", "personal", "Breakfast: oatmeal with blueberries and a spoon of peanut butter."],
  [2, 13, "diet", "personal", "Chickpea salad for lunch, and no afternoon snack."],
  [3, 20, "diet", "personal", "Pizza for dinner, two slices more than I planned."],
  [5, 16, "diet", "personal", "Drank about 2.5 litres of water, my best day this week."],
  [8, 21, "diet", "personal", "Two glasses of wine at dinner with friends."],
  [11, 15, "diet", "personal", "Cutting back on sugar: five days in a row without dessert."],
  // Mood (her journal app)
  [1, 21, "mood", "private", "Calm and proud after the morning run. Good energy all day."],
  [2, 22, "mood", "private", "Irritable and foggy today, probably from the short night."],
  [4, 21, "mood", "private", "Anxious about the work presentation. Journaling helped a little."],
  [6, 20, "mood", "private", "Really happy after a long call with my sister."],
  [9, 22, "mood", "private", "Felt low and unmotivated most of the afternoon."],
  [12, 21, "mood", "private", "Grateful for a quiet weekend. I'm more upbeat on days I exercise."],
  // Health
  [
    10,
    10,
    "health",
    "protected",
    "Physio says the knee pain is mild tendinitis: ice and rest for a week.",
  ],
  // Finance and relationships: never relevant to the fitness, food or journal apps.
  [3, 10, "finance", "protected", "Paid off the last $1,200 of my credit card balance."],
  [7, 18, "finance", "protected", "Rent goes up to $1,450 a month from January."],
  [11, 9, "finance", "protected", "Moved $300 into the holiday savings pot."],
  [4, 22, "relationships", "private", "Tense conversation with Alex about moving in together."],
  [
    8,
    23,
    "relationships",
    "private",
    "Feeling distant from Alex lately. Not sure we want the same things.",
  ],
  [
    13,
    20,
    "relationships",
    "private",
    "Dinner with Mum went well; we finally talked about Dad's health.",
  ],
];

function daysAgoAt(daysAgo: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function seed(email: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    console.error(`No account for ${email}. Sign up as ${email} first, then rerun.`);
    return 1;
  }

  const [existing] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(eq(memories.userId, user.id))
    .limit(1);
  if (existing) {
    console.error(`${email} already has memories. Seed only a fresh account.`);
    return 1;
  }

  // Writes the rows itself: the memories DAL imports the session helpers, which need Next.js.
  // Apps don't exist until Phase 05, so everything is stored as written by the owner.
  await db.insert(memories).values(
    JANE.map(([daysAgo, hour, category, sensitivity, content]) => ({
      userId: user.id,
      contentEncrypted: encryptField(content),
      category,
      sensitivity,
      sourceType: "user" as const,
      occurredAt: daysAgoAt(daysAgo, hour),
    }))
  );
  console.log(`Seeded ${JANE.length} memories for ${email}.`);
  return 0;
}

// Better Auth stores emails lowercased.
const email = (process.argv[2] ?? "jane@example.com").trim().toLowerCase();
try {
  process.exitCode = await seed(email);
} finally {
  await db.$client.end();
}
