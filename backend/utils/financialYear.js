// Indian financial year: 1 April to 31 March, in IST (UTC+05:30).
// A financial year is identified by the calendar year it starts in,
// e.g. 2025 means 1 Apr 2025 - 31 Mar 2026 ("2025-26").
const IST_OFFSET_MS = 330 * 60 * 1000;

// Start year of the financial year that contains `date`.
function fyStartYearOf(date = new Date()) {
    const ist = new Date(date.getTime() + IST_OFFSET_MS);
    const year = ist.getUTCFullYear();
    return ist.getUTCMonth() >= 3 ? year : year - 1;
}

// [start, end) of a financial year as UTC Dates (midnight IST on 1 April).
function fyRange(startYear) {
    return {
        start: new Date(Date.UTC(startYear, 3, 1) - IST_OFFSET_MS),
        end: new Date(Date.UTC(startYear + 1, 3, 1) - IST_OFFSET_MS)
    };
}

function fyLabel(startYear) {
    return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// Parse a ?fy= value. Missing -> fallback; invalid or in the future -> null.
function parseFy(value, fallback, current = fyStartYearOf()) {
    if (value === undefined || value === null || value === '') return fallback;
    if (!/^\d{4}$/.test(String(value))) return null;
    const year = Number(value);
    return year >= 2000 && year <= current ? year : null;
}

module.exports = { fyStartYearOf, fyRange, fyLabel, parseFy };
