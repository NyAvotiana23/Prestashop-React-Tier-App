/**
 * @file date-utils.jsx
 * @description A comprehensive set of date utility functions for formatting,
 *              validating, and parsing dates in various formats.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FORMAT TOKENS (used in format strings)
 * ─────────────────────────────────────────────────────────────────────────────
 *   YYYY  →  4-digit year          (e.g. 2026)
 *   MM    →  2-digit month         (e.g. 05)
 *   DD    →  2-digit day           (e.g. 17)
 *   HH    →  2-digit hours (24h)   (e.g. 14)
 *   mm    →  2-digit minutes       (e.g. 30)
 *   SS    →  2-digit seconds       (e.g. 09)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPORTED FUNCTIONS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  getDateTimeString(date?)
 *    @param  {Date}   [date=new Date()]  — JS Date object (defaults to now)
 *    @returns {string}                   — Formatted as "YYYY-MM-DD HH:mm:SS"
 *    @example  getDateTimeString()             → "2026-05-17 14:30:09"
 *    @example  getDateTimeString(new Date(0))  → "1970-01-01 00:00:00"
 *
 *  getDateString(date?)
 *    @param  {Date}   [date=new Date()]  — JS Date object (defaults to now)
 *    @returns {string}                   — Formatted as "YYYY-MM-DD" (UTC-based)
 *    @example  getDateString()                 → "2026-05-17"
 *
 *  formatDate(date, format)
 *    @param  {Date}   date    — JS Date object
 *    @param  {string} format  — Format string using tokens: YYYY MM DD HH mm SS
 *    @returns {string}        — Date formatted according to the given pattern
 *    @example  formatDate(new Date(), 'DD/MM/YYYY')          → "17/05/2026"
 *    @example  formatDate(new Date(), 'YYYY-MM-DD HH:mm:SS') → "2026-05-17 14:30:09"
 *    @example  formatDate(new Date(), 'DD-MM-YYYY HH:mm')    → "17-05-2026 14:30"
 *
 *  isValidDate(dateString, format)
 *    Checks whether a string matches the given format AND represents a real date.
 *    @param  {string} dateString  — The string to validate (e.g. "17/05/2026")
 *    @param  {string} format      — Expected format using tokens: YYYY MM DD HH mm SS
 *    @returns {boolean}           — true if the string is a valid date for that format
 *    @example  isValidDate('17/05/2026', 'DD/MM/YYYY')          → true
 *    @example  isValidDate('2026-05-17', 'YYYY-MM-DD')          → true
 *    @example  isValidDate('32/01/2026', 'DD/MM/YYYY')          → false  (invalid day)
 *    @example  isValidDate('17-05-2026', 'DD/MM/YYYY')          → false  (wrong separator)
 *    @example  isValidDate('17/05/2026 14:30:00', 'DD/MM/YYYY') → false  (extra content)
 *
 *  parseDate(dateString, format)
 *    Parses a formatted date string into a JS Date object.
 *    Uses local time (not UTC). Returns null if the string is invalid.
 *    @param  {string} dateString  — The string to parse (e.g. "17/05/2026")
 *    @param  {string} format      — Format the string follows: YYYY MM DD HH mm SS
 *    @returns {Date|null}         — JS Date object, or null if invalid
 *    @example  parseDate('17/05/2026', 'DD/MM/YYYY')             → Date(2026, 4, 17)
 *    @example  parseDate('2026-05-17 14:30:09', 'YYYY-MM-DD HH:mm:SS') → Date object
 *    @example  parseDate('99/99/9999', 'DD/MM/YYYY')             → null
 *
 *  parseDateToString(dateString, fromFormat, toFormat?)
 *    Parses a date string from one format and re-formats it into another.
 *    Useful for converting "DD/MM/YYYY" → "YYYY-MM-DD HH:mm:SS", etc.
 *    @param  {string} dateString          — Input date string
 *    @param  {string} fromFormat          — Format the input follows
 *    @param  {string} [toFormat]          — Target format (defaults to "YYYY-MM-DD HH:mm:SS")
 *    @returns {string|null}               — Reformatted string, or null if parsing failed
 *    @example  parseDateToString('17/05/2026', 'DD/MM/YYYY')
 *              → "2026-05-17 00:00:00"
 *    @example  parseDateToString('17/05/2026', 'DD/MM/YYYY', 'YYYY-MM-DD')
 *              → "2026-05-17"
 *    @example  parseDateToString('2026-05-17', 'YYYY-MM-DD', 'DD/MM/YYYY')
 *              → "17/05/2026"
 * ─────────────────────────────────────────────────────────────────────────────
 */


// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Zero-pads a number to 2 digits. */
const pad = (n) => String(n).padStart(2, '0');

/**
 * Maps each format token to a regex capture group and an extractor function.
 * Order matters: longer tokens (YYYY) must be listed before shorter ones (MM).
 */
const TOKEN_MAP = [
    { token: 'YYYY', regex: '(\\d{4})', extract: (v) => ({ year:   parseInt(v, 10) }) },
    { token: 'MM',   regex: '(\\d{2})', extract: (v) => ({ month:  parseInt(v, 10) }) },
    { token: 'DD',   regex: '(\\d{2})', extract: (v) => ({ day:    parseInt(v, 10) }) },
    { token: 'HH',   regex: '(\\d{2})', extract: (v) => ({ hour:   parseInt(v, 10) }) },
    { token: 'mm',   regex: '(\\d{2})', extract: (v) => ({ minute: parseInt(v, 10) }) },
    { token: 'SS',   regex: '(\\d{2})', extract: (v) => ({ second: parseInt(v, 10) }) },
];

/**
 * Builds a full regex and an ordered list of extractors from a format string.
 * Non-token characters (separators like / - : space) are escaped and matched literally.
 *
 * @param   {string} format
 * @returns {{ regex: RegExp, extractors: Function[] }}
 */
function buildFormatParser(format) {
    let regexStr = '';
    let remaining = format;
    const extractors = [];

    while (remaining.length > 0) {
        const match = TOKEN_MAP.find(({ token }) => remaining.startsWith(token));
        if (match) {
            regexStr  += match.regex;
            extractors.push(match.extract);
            remaining  = remaining.slice(match.token.length);
        } else {
            // Escape the literal character (e.g. '/', '-', ':', ' ')
            regexStr += remaining[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            remaining = remaining.slice(1);
        }
    }

    return { regex: new RegExp(`^${regexStr}$`), extractors };
}

/**
 * Checks whether the extracted date parts represent a real calendar date/time.
 *
 * @param {{ year?, month?, day?, hour?, minute?, second? }} parts
 * @returns {boolean}
 */
function isRealDate({ year = 2000, month = 1, day = 1, hour = 0, minute = 0, second = 0 }) {
    if (month  < 1  || month  > 12) return false;
    if (hour   < 0  || hour   > 23) return false;
    if (minute < 0  || minute > 59) return false;
    if (second < 0  || second > 59) return false;

    // Use Date to validate day (handles leap years, month lengths, etc.)
    const d = new Date(year, month - 1, day);
    return (
        d.getFullYear() === year &&
        d.getMonth()    === month - 1 &&
        d.getDate()     === day
    );
}


// ─── Exported functions ───────────────────────────────────────────────────────

/**
 * Returns the current (or given) date as "YYYY-MM-DD HH:mm:SS" using local time.
 *
 * @param   {Date} [date=new Date()]
 * @returns {string}
 */
export function getDateTimeString(date = new Date()) {
    const YYYY = date.getFullYear();
    const MM   = pad(date.getMonth() + 1);
    const DD   = pad(date.getDate());
    const HH   = pad(date.getHours());
    const mm   = pad(date.getMinutes());
    const SS   = pad(date.getSeconds());

    return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${SS}`;
}

/**
 * Returns the current (or given) date as "YYYY-MM-DD" using UTC time.
 * Simple and reliable for date-only use cases with no timezone concerns.
 *
 * @param   {Date} [date=new Date()]
 * @returns {string}
 */
export function getDateString(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

/**
 * Formats a Date object using a custom format string.
 * Supported tokens: YYYY  MM  DD  HH  mm  SS
 *
 * @param   {Date}   date
 * @param   {string} format
 * @returns {string}
 */
export function formatDate(date, format) {
    return format
        .replace('YYYY', date.getFullYear())
        .replace('MM',   pad(date.getMonth() + 1))
        .replace('DD',   pad(date.getDate()))
        .replace('HH',   pad(date.getHours()))
        .replace('mm',   pad(date.getMinutes()))
        .replace('SS',   pad(date.getSeconds()));
}

/**
 * Validates that a string strictly matches the given format AND is a real date.
 *
 * @param   {string} dateString
 * @param   {string} format
 * @returns {boolean}
 */
export function isValidDate(dateString, format) {
    const { regex, extractors } = buildFormatParser(format);
    const match = dateString.match(regex);
    if (!match) return false;

    // match[0] is the full match; captured groups start at index 1
    const parts = extractors.reduce((acc, extract, i) => {
        return { ...acc, ...extract(match[i + 1]) };
    }, {});

    return isRealDate(parts);
}

/**
 * Parses a formatted date string into a JS Date object (local time).
 * Returns null if the string is invalid or does not match the format.
 *
 * @param   {string}    dateString
 * @param   {string}    format
 * @returns {Date|null}
 */
export function parseDate(dateString, format) {
    if (!isValidDate(dateString, format)) return null;

    const { regex, extractors } = buildFormatParser(format);
    const match = dateString.match(regex);

    const parts = extractors.reduce((acc, extract, i) => {
        return { ...acc, ...extract(match[i + 1]) };
    }, {});

    const { year = 2000, month = 1, day = 1, hour = 0, minute = 0, second = 0 } = parts;
    return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * Parses a date string from one format and re-formats it into another.
 * Returns null if the input is invalid.
 *
 * @param   {string}  dateString
 * @param   {string}  fromFormat
 * @param   {string}  [toFormat='YYYY-MM-DD HH:mm:SS']
 * @returns {string|null}
 */
export function parseDateToString(dateString, fromFormat, toFormat = 'YYYY-MM-DD HH:mm:SS') {
    const date = parseDate(dateString, fromFormat);
    if (!date) return null;
    return formatDate(date, toFormat);
}