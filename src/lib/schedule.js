// Schedule math for NPA Booking. Everything is America/Los_Angeles.
// Rules (mirrored from the booking policy):
//  - 14-day booking window starting today (Pacific)
//  - 30-minute slot starts, 8:00 AM – 4:00 PM (last start 4:00 PM)
//  - every appointment is 60 minutes; a start is unavailable when its
//    60-minute window overlaps any booked appointment
//  - same-day slots must start at least 15 minutes in the future

export const TZ = 'America/Los_Angeles';
export const OPEN_START_MIN = 8 * 60;
export const LAST_START_MIN = 16 * 60;
export const SLOT_MIN = 30;
export const APPT_MIN = 60;
export const DAYS = 14;
export const SAME_DAY_BUFFER_MIN = 15;

const pad = (n) => String(n).padStart(2, '0');

function partsFormatter() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** Wall-clock parts of an instant in Pacific time. */
export function ptParts(d = new Date()) {
  const p = {};
  for (const x of partsFormatter().formatToParts(d)) p[x.type] = x.value;
  return { y: +p.year, m: +p.month, d: +p.day, hh: (+p.hour) % 24, mm: +p.minute };
}

/** "YYYY-MM-DD" for an instant, in Pacific time. */
export function ptDateKey(d = new Date()) {
  const p = ptParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** Minutes that Pacific time is offset from UTC at noon on a given date (e.g. -420 for PDT). */
export function ptOffsetMinutes(y, m, day) {
  const guess = Date.UTC(y, m - 1, day, 12, 0, 0);
  const p = {};
  for (const x of partsFormatter().formatToParts(new Date(guess))) p[x.type] = x.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
  return Math.round((asUTC - guess) / 60000);
}

/**
 * ISO-8601 string with the correct Pacific offset for a Pacific wall time,
 * e.g. ptToISO('2026-10-05', '09:30') -> '2026-10-05T09:30:00-07:00'.
 * Stored by Supabase as timestamptz.
 */
export function ptToISO(dateKey, hhmm) {
  const [y, m, dd] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const off = ptOffsetMinutes(y, m, dd);
  const sign = off <= 0 ? '-' : '+';
  const a = Math.abs(off);
  return `${dateKey}T${pad(hh)}:${pad(mm)}:00${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

/** The 14 bookable dates ("YYYY-MM-DD", Pacific), today first. */
export function bookableDates() {
  const p = ptParts(new Date());
  const out = [];
  for (let i = 0; i < DAYS; i++) {
    out.push(ptDateKey(new Date(Date.UTC(p.y, p.m - 1, p.d + i, 12))));
  }
  return out;
}

/** All slot starts ("HH:MM", 24h): 08:00 … 16:00. */
export function slotStarts() {
  const out = [];
  for (let m = OPEN_START_MIN; m <= LAST_START_MIN; m += SLOT_MIN) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

/** "09:30" -> "9:30 AM". */
export function fmtLabel(hhmm) {
  const h = +hhmm.slice(0, 2);
  const m = hhmm.slice(3);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m} ${ap}`;
}

/** "2026-10-05" -> "Monday, October 5". */
export function fmtLongDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric',
  });
}

/** "2026-10-05" -> "Mon Oct 5". */
export function fmtShortDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric',
  });
}

const toMin = (hhmm) => (+hhmm.slice(0, 2)) * 60 + (+hhmm.slice(3));

/**
 * Compute per-start availability for a day.
 * bookedISOs: array of booked start_at ISO strings (timestamptz from Supabase).
 * Returns { "HH:MM": true/false }.
 */
export function availabilityForDay(dateKey, bookedISOs, now = new Date()) {
  const bookedMins = bookedISOs.map((iso) => {
    const p = ptParts(new Date(iso));
    return p.hh * 60 + p.mm;
  });
  const isToday = dateKey === ptDateKey(now);
  const np = ptParts(now);
  const nowMin = np.hh * 60 + np.mm;
  const avail = {};
  for (const s of slotStarts()) {
    const t = toMin(s);
    let blocked = bookedMins.some((b) => b < t + APPT_MIN && t < b + APPT_MIN);
    if (!blocked && isToday && t <= nowMin + SAME_DAY_BUFFER_MIN) blocked = true;
    avail[s] = !blocked;
  }
  return avail;
}
