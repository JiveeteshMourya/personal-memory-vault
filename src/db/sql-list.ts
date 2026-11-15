import { sql } from "drizzle-orm";

/**
 * A fixed list of our own constants as a SQL value list (`'a', 'b'`), for check constraints.
 * Never pass user input: the values are inlined, not parameterized.
 */
export const sqlList = (values: readonly string[]) => sql.raw(values.map(v => `'${v}'`).join(", "));
