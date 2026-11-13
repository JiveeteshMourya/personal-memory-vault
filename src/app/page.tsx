import Link from "next/link";

import { HowItWorks } from "@/app/_components/how-it-works";
import { VaultLens } from "@/app/_components/vault-lens";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const promises = [
  {
    term: "Connecting isn’t reading",
    detail: "A new app can save memories but can’t read any until you allow it.",
  },
  {
    term: "Nothing leaves without your rule",
    detail:
      "Every request is checked against your permissions before a single memory is looked up.",
  },
  {
    term: "Encrypted inside the vault",
    detail:
      "Memory content is encrypted by the vault itself, on top of the database’s own encryption.",
  },
  {
    term: "You can take access back",
    detail:
      "Revoke an app and its access ends at once. The access log shows everything it received.",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button render={<Link href="/dashboard" />} nativeButton={false} variant="outline">
            Open dashboard
          </Button>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-20">
          <div className="flex flex-col items-start gap-6">
            <h1 className="max-w-[16ch] text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              Your AI apps share one memory. You decide what each one sees.
            </h1>
            <p className="max-w-[52ch] text-lg text-muted-foreground">
              Memory Vault keeps what your apps learn about you in one encrypted place. Apps can
              save to it, but reading is a separate permission you grant, and each request gets only
              what its stated purpose needs.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button render={<Link href="/dashboard" />} nativeButton={false} size="lg">
                Open dashboard
              </Button>
              <Button
                render={<a href="#how-it-works" />}
                nativeButton={false}
                variant="ghost"
                size="lg"
              >
                See how it works
              </Button>
            </div>
          </div>
          <VaultLens />
        </section>

        <section
          id="how-it-works"
          aria-labelledby="how-it-works-title"
          className="scroll-mt-8 border-t bg-muted/40"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 id="how-it-works-title" className="text-3xl font-bold sm:text-4xl">
                How it works
              </h2>
              <p className="text-lg text-muted-foreground">
                The vault sits between your apps. None of them reads another’s data directly, and
                none of them reads yours without a rule you set.
              </p>
            </div>
            <HowItWorks />
          </div>
        </section>

        <section aria-labelledby="promises-title" className="border-t">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <h2 id="promises-title" className="text-3xl font-bold sm:text-4xl">
              What the vault promises
            </h2>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {promises.map(({ term, detail }) => (
                <div key={term} className="flex flex-col gap-1.5">
                  <dt className="font-heading text-lg font-bold">{term}</dt>
                  <dd className="text-muted-foreground">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">
            A prototype for private, user-controlled AI memory.
          </p>
        </div>
      </footer>
    </>
  );
}
