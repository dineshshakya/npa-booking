import { useEffect, useState } from 'react';
import { supabase, backendConfigured } from '../lib/supabase.js';
import { fmtLabel } from '../lib/schedule.js';
import { CLINIC } from '../App.jsx';

function fmtDay(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function Admin({ onHome }) {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [photos, setPhotos] = useState({}); // bookingId -> {front?: url, back?: url}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!backendConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setListError('');
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: false })
        .order('start_at', { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (e) {
      setListError('Could not load bookings: ' + (e.message || 'unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session) loadBookings(); }, [session]);

  const signIn = async (e) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (err) {
      setAuthError(err.message || 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBookings([]);
    setPhotos({});
  };

  const viewPhoto = async (b, side) => {
    const path = side === 'front' ? b.ins_front_path : b.ins_back_path;
    if (!path) return;
    try {
      const { data, error } = await supabase.storage.from('insurance-cards').createSignedUrl(path, 300);
      if (error) throw error;
      setPhotos((p) => ({ ...p, [b.id]: { ...(p[b.id] || {}), [side]: data.signedUrl } }));
    } catch (e) {
      alert('Could not load photo: ' + (e.message || 'unknown error'));
    }
  };

  const del = async (b) => {
    if (!window.confirm(`Delete the booking for ${b.name} (${fmtDay(b.date)} ${fmtLabel(b.start_at.slice(11, 16))})?`)) return;
    try {
      const { error } = await supabase.from('bookings').delete().eq('id', b.id);
      if (error) throw error;
      const paths = [b.ins_front_path, b.ins_back_path].filter(Boolean);
      if (paths.length) await supabase.storage.from('insurance-cards').remove(paths);
      setBookings((bs) => bs.filter((x) => x.id !== b.id));
    } catch (e) {
      alert('Could not delete: ' + (e.message || 'unknown error'));
    }
  };

  if (!backendConfigured) {
    return (
      <main id="main" className="narrow page-pad">
        <div className="notice">
          <h2>Clinic login unavailable</h2>
          <p>The booking backend is not connected yet.</p>
          <p style={{ marginTop: 12 }}><button className="btn btn-ghost" onClick={onHome}>Back to home</button></p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main id="main" className="narrow page-pad">
        <div className="page-head"><h1>Clinic login</h1><p>Staff only.</p></div>
        <form className="form-card signin" onSubmit={signIn}>
          <div className="field">
            <label htmlFor="adminEmail">Email</label>
            <input type="email" id="adminEmail" autoComplete="username" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="adminPass">Password</label>
            <input type="password" id="adminPass" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <p className={'form-error' + (authError ? ' show' : '')} role="alert">{authError}</p>
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main id="main" className="page-pad">
      <div className="page-head">
        <h1>Bookings</h1>
        <p>{bookings.length} request{bookings.length === 1 ? '' : 's'} · signed in as {session.user.email}</p>
      </div>
      <div className="btn-row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-small" onClick={loadBookings} disabled={loading}>Refresh</button>
        <button className="btn btn-ghost btn-small" onClick={signOut}>Sign out</button>
      </div>
      {loading && <p className="loading-note">Loading…</p>}
      {listError && <p className="form-error show" role="alert">{listError}</p>}
      <div className="admin-list">
        {bookings.map((b) => (
          <article className="booking-card" key={b.id}>
            <h3>{b.name} — {fmtDay(b.date)} at {fmtLabel(b.start_at.slice(11, 16))}</h3>
            <p className="meta">
              {b.patient_type === 'returning' ? 'Returning' : 'New'} patient · {b.reason}
              <br />{b.phone} · {b.email}
              <br />DOB {b.dob} · {b.street}, {b.city}, {b.state} {b.zip}
              {b.notes && <><br />Notes: {b.notes}</>}
            </p>
            <div className="row">
              {b.ins_front_path && <button className="btn btn-ghost btn-small" onClick={() => viewPhoto(b, 'front')}>View card (front)</button>}
              {b.ins_back_path && <button className="btn btn-ghost btn-small" onClick={() => viewPhoto(b, 'back')}>View card (back)</button>}
              <button className="btn btn-danger btn-small" onClick={() => del(b)}>Delete</button>
            </div>
            {photos[b.id]?.front && (
              <div className="photo-view">
                <img src={photos[b.id].front} alt={`Insurance card front for ${b.name}`} />
              </div>
            )}
            {photos[b.id]?.back && (
              <div className="photo-view">
                <img src={photos[b.id].back} alt={`Insurance card back for ${b.name}`} />
              </div>
            )}
          </article>
        ))}
      </div>
      {!loading && bookings.length === 0 && !listError && (
        <p className="loading-note">No bookings yet.</p>
      )}
    </main>
  );
}
