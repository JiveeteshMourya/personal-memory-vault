"use client";

import { useSyncExternalStore } from "react";

const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };
const utcFormat = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });

const subscribe = () => () => {};

// The server doesn't know the viewer's timezone (and runs in UTC when deployed), so it renders
// UTC; the browser swaps in its local time on hydration. useSyncExternalStore's server snapshot
// makes that swap without a hydration mismatch.
export function LocalDateTime({ value }: { value: Date }) {
  const text = useSyncExternalStore(
    subscribe,
    () => value.toLocaleString(undefined, options),
    () => `${utcFormat.format(value)} UTC`
  );
  return <time dateTime={value.toISOString()}>{text}</time>;
}
