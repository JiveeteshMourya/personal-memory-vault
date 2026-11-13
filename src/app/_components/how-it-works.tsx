import {
  ArrowRightIcon,
  DumbbellIcon,
  NotebookPenIcon,
  SaladIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { LogoMark } from "@/components/logo";

const apps = [
  { label: "Fitness", icon: DumbbellIcon },
  { label: "Food", icon: SaladIcon },
  { label: "Journal", icon: NotebookPenIcon },
];

const steps = [
  {
    title: "Apps save what they learn",
    body: "Your fitness, food and journal apps send memories to the vault as they happen. Saving never grants reading.",
  },
  {
    title: "The vault seals and sorts them",
    body: "Each memory is encrypted and tagged by topic and sensitivity, so your rules can refer to it.",
  },
  {
    title: "An app asks, with a purpose",
    body: "When an app needs context, it says why. The vault checks your rules before it looks anything up.",
  },
  {
    title: "Only the answer leaves",
    body: "The app gets a short summary of what you allowed, not your memories. Every request is logged for you.",
  },
];

export function HowItWorks() {
  return (
    <div className="flex flex-col gap-12">
      <figure className="grid items-center gap-6 rounded-xl border bg-card p-6 sm:grid-cols-[1fr_auto_1fr] sm:p-8">
        <ul className="flex flex-col gap-2">
          {apps.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2.5 font-medium [&_svg]:size-4 [&_svg]:text-muted-foreground"
            >
              <Icon aria-hidden="true" />
              {label} app
            </li>
          ))}
        </ul>

        <div aria-hidden="true" className="flex flex-col gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <ArrowRightIcon className="size-4 rotate-90 sm:rotate-0" />
            Saves memories
          </span>
          <span className="flex items-center gap-2">
            <ArrowRightIcon className="size-4 -rotate-90 sm:rotate-180" />
            Asks, with a purpose
          </span>
        </div>

        <div className="flex items-center gap-4 rounded-lg border-2 border-primary bg-background p-4">
          <LogoMark className="size-10" />
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold">Your vault</span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheckIcon aria-hidden="true" className="size-4 text-primary" />
              Checks your rules first
            </span>
          </div>
        </div>

        <figcaption className="sr-only">
          Apps save memories into your vault and ask it for context. The vault checks your rules
          before it answers.
        </figcaption>
      </figure>

      <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-2 border-t-2 border-primary/40 pt-4">
            <span aria-hidden="true" className="text-sm font-bold text-primary tabular-nums">
              {index + 1}
            </span>
            <h3 className="text-lg font-bold">{step.title}</h3>
            <p className="text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
