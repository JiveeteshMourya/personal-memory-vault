import { CheckIcon, DumbbellIcon, NotebookPenIcon, SaladIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AppId = "journal" | "fitness" | "food";

const apps: { id: AppId; label: string; icon: React.ComponentType; purpose: string }[] = [
  {
    id: "journal",
    label: "Journal",
    icon: NotebookPenIcon,
    purpose: "Is Jane’s activity or eating affecting her mood?",
  },
  {
    id: "fitness",
    label: "Fitness",
    icon: DumbbellIcon,
    purpose: "Plan next week’s training load.",
  },
  { id: "food", label: "Food", icon: SaladIcon, purpose: "Suggest meals for next week." },
];

// Jane's vault (sample data). `shares` holds what each app receives for its purpose: a short
// projection of the memory, never the memory itself. Apps not listed receive nothing.
const memories: {
  id: string;
  topic: string;
  source: string;
  barWidth: string;
  shares: Partial<Record<AppId, string>>;
}[] = [
  {
    id: "run",
    topic: "Activity",
    source: "Fitness",
    barWidth: "78%",
    shares: {
      journal: "Active on 3 of the last 7 days",
      fitness: "Ran 5 km on Tuesday at an easy pace",
      food: "Trains about 3 times a week",
    },
  },
  {
    id: "sleep",
    topic: "Sleep",
    source: "Fitness",
    barWidth: "64%",
    shares: {
      journal: "Sleeping about 6 hours a night",
      fitness: "Averaging 6 h 10 min of sleep this week",
    },
  },
  {
    id: "meals",
    topic: "Eating",
    source: "Food",
    barWidth: "86%",
    shares: {
      journal: "Meals have been irregular this week",
      food: "Often skips lunch on weekdays",
    },
  },
  {
    id: "diet",
    topic: "Diet",
    source: "Food",
    barWidth: "58%",
    shares: { food: "Vegetarian, allergic to peanuts" },
  },
  {
    id: "mood",
    topic: "Mood",
    source: "Journal",
    barWidth: "70%",
    shares: { journal: "Felt anxious before Thursday’s review" },
  },
  { id: "money", topic: "Finances", source: "Journal", barWidth: "82%", shares: {} },
  { id: "family", topic: "Relationships", source: "Journal", barWidth: "52%", shares: {} },
];

export function VaultLens() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-bold">What each app receives</CardTitle>
        <CardDescription>
          Jane’s vault holds {memories.length} memories. Pick an app to see what its request gets
          back.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="journal">
          <TabsList className="w-full">
            {apps.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {apps.map(app => (
            <TabsContent key={app.id} value={app.id} className="pt-3">
              <LensPanel app={app.id} purpose={app.purpose} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 py-3 text-muted-foreground">
        Apps get a short summary for their purpose, never the original memory.
      </CardFooter>
    </Card>
  );
}

function LensPanel({ app, purpose }: { app: AppId; purpose: string }) {
  const released = memories.filter(memory => memory.shares[app]).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">Asks:</span> &ldquo;{purpose}&rdquo;
      </p>
      <ul className="flex flex-col divide-y">
        {memories.map((memory, index) => {
          const shared = memory.shares[app];
          return (
            <li key={memory.id} className="flex min-h-14 items-center gap-3 py-2">
              {shared ? (
                <>
                  <CheckIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-foreground">{shared}</span>
                    <span className="text-xs text-muted-foreground">From {memory.source}</span>
                  </div>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="size-4 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span
                      aria-hidden="true"
                      className="block h-2.5 origin-left rounded-sm bg-withheld motion-safe:animate-redact"
                      style={{ width: memory.barWidth, animationDelay: `${index * 45}ms` }}
                    />
                    <span className="text-xs text-muted-foreground">{memory.topic} withheld</span>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm font-medium tabular-nums">
        {released} of {memories.length} memories shared for this purpose.
      </p>
    </div>
  );
}
