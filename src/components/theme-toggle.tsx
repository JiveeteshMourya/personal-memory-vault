"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { readStoredTheme, setTheme, themes, type Theme } from "@/lib/theme";

const options = {
  light: { label: "Light", icon: SunIcon },
  dark: { label: "Dark", icon: MoonIcon },
  system: { label: "System", icon: MonitorIcon },
} satisfies Record<Theme, { label: string; icon: React.ComponentType }>;

export function ThemeToggle() {
  // The menu only renders when opened, so reading storage here can't cause a hydration mismatch.
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "system" : readStoredTheme()
  );

  function handleChange(value: Theme) {
    setThemeState(value);
    setTheme(value);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-lg" aria-label="Theme" />}>
        <SunIcon className="dark:hidden" />
        <MoonIcon className="hidden dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={handleChange}>
            {themes.map(value => {
              const { label, icon: Icon } = options[value];
              return (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
