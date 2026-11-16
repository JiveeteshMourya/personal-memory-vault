import { z } from "zod";

// Field validators shared by the `/api/v1` request bodies (docs/public-api.md, Conventions).

/** An ISO 8601 datetime, with a `Z` or an offset, kept as a string. */
export const datetime = z.iso.datetime({ offset: true });

/** An ISO 8601 datetime, parsed into a `Date`. */
export const instant = datetime.transform(value => new Date(value));

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isLanguageTag(value: string) {
  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

/** An IANA timezone, like `Asia/Kolkata`. */
export const timeZone = z.string().max(64).refine(isTimeZone, { error: "Use an IANA timezone" });

/** A BCP-47 language tag, like `en` or `hi-IN`. */
export const languageTag = z
  .string()
  .max(35)
  .refine(isLanguageTag, { error: "Use a BCP-47 language tag" });
