import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";

import { ThemeSync } from "@/components/theme-sync";
import { Toaster } from "@/components/ui/toast";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

// next/font has no metrics to build a size-matched fallback for the Atkinson families, so the
// fallback is a plain system stack.
const atkinsonNext = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson-next",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  adjustFontFallback: false,
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Personal Memory Vault",
    template: "%s | Memory Vault",
  },
  description:
    "A privacy-preserving memory vault that shares only authorized context with your AI apps.",
};

// Matches --background. It follows the OS scheme; a manual theme choice can't change it before paint.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf0ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1c1e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The inline script adds `.dark` before React hydrates.
      suppressHydrationWarning
      className={`${atkinsonNext.variable} ${atkinsonMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <ThemeSync />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
