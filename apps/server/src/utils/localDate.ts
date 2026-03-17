/**
 * buildTimestamp(dateStr)
 *
 * Combines the operator's chosen date ("YYYY-MM-DD") with the server's
 * current LOCAL wall-clock time to produce a precise, sortable DateTime.
 *
 * WHY NOT use toISOString() time component:
 *   new Date(`${dto.date}T${new Date().toISOString().split("T")[1]}`)
 *   appends e.g. "23:34:00Z" (UTC) to "2026-03-15" → stored as
 *   2026-03-15T23:34Z which in IST (+5:30) reads as 2026-03-16T05:04 — wrong day!
 *
 * WHY local time works:
 *   new Date("2026-03-15T05:04:23.123") — no trailing Z — is parsed as LOCAL time
 *   by Node.js when TZ is set, so it stores the correct UTC offset automatically.
 */
export function buildTimestamp(dateStr: string): Date {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    // No 'Z' → parsed as local time by Node.js
    return new Date(`${dateStr}T${hh}:${mm}:${ss}.${ms}`);
}

/**
 * All date helpers use the LOCAL timezone of the Node.js process.
 * Set TZ=<timezone> in your .env (e.g. TZ=Asia/Kolkata) so the server
 * operates in the same timezone as the operators.
 *
 * This means every "today" boundary, every date-string extraction, and
 * every day-range query uses the same calendar day the operator sees,
 * eliminating UTC-vs-local skew bugs.
 */

/**
 * Returns "YYYY-MM-DD" for the given Date (or now) in LOCAL time.
 * Equivalent to what the frontend sends via toLocaleDateString("en-CA").
 */
export function localDateStr(date: Date = new Date()): string {
    return date.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local timezone
}

/**
 * Returns a Date set to local midnight (00:00:00.000) for the given
 * date string "YYYY-MM-DD".
 * Without the trailing "Z", `new Date(...)` parses in LOCAL time.
 */
export function localDayStart(dateStr: string): Date {
    return new Date(`${dateStr}T00:00:00`);
}

/**
 * Returns a Date set to local end-of-day (23:59:59.999) for the given
 * date string "YYYY-MM-DD".
 */
export function localDayEnd(dateStr: string): Date {
    return new Date(`${dateStr}T23:59:59.999`);
}

/**
 * Returns the day-after local midnight for the given date string.
 * Useful for exclusive upper-bound range queries: date < nextDayStart
 */
export function localNextDayStart(dateStr: string): Date {
    const d = localDayStart(dateStr);
    d.setDate(d.getDate() + 1);
    return d;
}
