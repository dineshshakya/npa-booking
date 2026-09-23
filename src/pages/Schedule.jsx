import { useEffect, useState } from 'react';
import { supabase, backendConfigured } from '../lib/supabase.js';
import {
  bookableDates, slotStarts, fmtLabel, fmtLongDate,
  availabilityForDay, ptParts,
} from '../lib/schedule.js';

function dayParts(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const dow = dt.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' });
  const mon = dt.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short' });
  return { dow, dnum: d, mon };
}

export default function Schedule({ onPick, onBack, backLabel }) {
  const dates = bookableDates();
  const [selDate, setSelDate] = useState(dates[0]);
  const [booked, setBooked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selSlot, setSelSlot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr('');
      setSelSlot(null);
      if (!backendConfigured) { setLoading(false); return; }
      try {
        const { data, error } = await supabase.rpc('booked_starts', { p_day: selDate });
        if (error) throw error;
        if (!cancelled) setBooked((data || []).map((r) => r.start_at));
      } catch (e) {
        if (!cancelled) setErr('Could not load availability. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selDate]);

  if (!backendConfigured) {
    return (
      <main id="main" className="narrow page-pad">
        <div className="notice">
          <h2>Scheduler not connected yet</h2>
          <p>The clinic is still connecting its booking calendar. Please call <a href="tel:+16192946616">(619) 294-6616</a> to schedule your visit.</p>
          <p style={{ marginTop: 12 }}><button className="btn btn-ghost" onClick={onBack}>{backLabel}</button></p>
        </div>
      </main>
    );
  }

  const avail = availabilityForDay(selDate, booked);
  const starts = slotStarts();

  return (
    <main id="main" className="narrow" style={{ paddingBottom: 120 }}>
      <div className="page-pad" style={{ paddingBottom: 0 }}>
        <div className="page-head">
          <h1>Pick a date &amp; time</h1>
          <p>Choose a day, then tap a green time slot.</p>
          <span className="hours-note">Open for booking: 8:00 AM – 5:00 PM</span>
        </div>

        <div className="date-strip" role="listbox" aria-label="Choose a day">
          {dates.map((dk) => {
            const p = dayParts(dk);
            const selected = dk === selDate;
            return (
              <button
                key={dk}
                type="button"
                className="date-card"
                role="option"
                aria-selected={selected}
                onClick={() => setSelDate(dk)}
              >
                <span className="dow">{p.dow}</span>
                <span className="dnum">{p.dnum}</span>
                <span className="dmon">{p.mon}</span>
              </button>
            );
          })}
        </div>

        <div className="legend" aria-hidden="true">
          <span><i className="dot avail"></i> Available</span>
          <span><i className="dot booked"></i> Booked</span>
          <span><i className="dot sel"></i> Your pick</span>
        </div>

        <h2 className="day-title">{fmtLongDate(selDate)}</h2>

        {loading && <p className="loading-note" role="status">Loading times…</p>}
        {err && <p className="form-error show" role="alert">{err}</p>}

        {!loading && !err && (
          <div className="slot-grid" role="group" aria-label="Available times">
            {starts.map((t) => {
              const ok = avail[t];
              const selected = selSlot === t;
              return (
                <button
                  key={t}
                  type="button"
                  className={'slot' + (ok ? '' : ' booked') + (selected ? ' selected' : '')}
                  disabled={!ok}
                  aria-label={`${fmtLabel(t)} (${ok ? 'available' : 'unavailable'})`}
                  onClick={() => setSelSlot(t)}
                >
                  {fmtLabel(t)}
                </button>
              );
            })}
          </div>
        )}

        <p className="alt-path">
          <button onClick={onBack}>&larr; {backLabel}</button>
        </p>
      </div>

      <div className="bottom-bar">
        <div className="bottom-inner">
          <p className="pick-summary" aria-live="polite">
            {selSlot
              ? <>Your pick: <strong>{fmtLongDate(selDate)} at {fmtLabel(selSlot)}</strong></>
              : 'No time selected yet'}
          </p>
          <button
            className="btn"
            disabled={!selSlot}
            onClick={() => onPick({
              date: selDate,
              time: selSlot,
              dateLabel: fmtLongDate(selDate),
              timeLabel: fmtLabel(selSlot),
            })}
          >
            Next
          </button>
        </div>
      </div>
    </main>
  );
}
