import { useState } from 'react';
import { supabase, backendConfigured } from '../lib/supabase.js';
import { ptToISO, fmtLabel } from '../lib/schedule.js';
import {
  errName, errDob, errPhone, errEmail, errRequired, errZip, errReason,
  errImageFile, downscaleImage,
} from '../lib/validate.js';
import { CLINIC } from '../App.jsx';

const REASONS = [
  'Pain management', 'Stress & anxiety', 'Sleep support', "Women's health",
  'Headaches & migraines', 'Orthopedic concerns', 'Fertility support',
  'Healthy aging', 'Something else',
];

function Field({ id, label, required, error, children, hint }) {
  return (
    <div className={'field' + (error ? ' invalid' : '')} data-field={id}>
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
      <p className="error" role="alert">{error || ''}</p>
    </div>
  );
}

export default function Book({ step, setStep, draft, setDraft, slot, setSlot, onPickTime, onDone, onHome }) {
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [done, setDone] = useState(null); // {name, when, phone}

  const set = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validateStep1 = () => {
    const e = {
      fullName: errName(draft.fullName),
      dob: errDob(draft.dob),
      phone: errPhone(draft.phone),
      email: errEmail(draft.email),
      street: errRequired(draft.street, 'street address'),
      city: errRequired(draft.city, 'city'),
      state: errRequired(draft.state, 'state'),
      zip: errZip(draft.zip),
      frontFile: errImageFile(draft.frontFile, true),
      backFile: errImageFile(draft.backFile, false),
    };
    Object.keys(e).forEach((k) => { if (!e[k]) delete e[k]; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    const r = errReason(draft.reason);
    if (r) e.reason = r;
    if (!slot) e.slot = 'Please pick a date and time.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goStep = (n) => {
    setSendError('');
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    setSendError('');
    if (!validateStep1()) { goStep(1); return; }
    if (!validateStep2()) { goStep(2); return; }
    if (!backendConfigured) {
      setSendError('Online booking is still being connected, so this request was not sent. Please call us at (619) 294-6616.');
      return;
    }
    setSending(true);
    try {
      const id = crypto.randomUUID();
      const frontBlob = await downscaleImage(draft.frontFile);
      const frontPath = `${id}/front.jpg`;
      const up1 = await supabase.storage.from('insurance-cards').upload(frontPath, frontBlob, { contentType: 'image/jpeg' });
      if (up1.error) throw new Error('Could not upload your insurance photo. Please try again.');

      let backPath = null;
      if (draft.backFile) {
        const backBlob = await downscaleImage(draft.backFile);
        backPath = `${id}/back.jpg`;
        const up2 = await supabase.storage.from('insurance-cards').upload(backPath, backBlob, { contentType: 'image/jpeg' });
        if (up2.error) backPath = null; // front is what matters; back is optional
      }

      const row = {
        id,
        name: draft.fullName.trim(),
        dob: draft.dob,
        phone: draft.phone.trim(),
        email: draft.email.trim(),
        street: draft.street.trim(),
        city: draft.city.trim(),
        state: draft.state.trim(),
        zip: draft.zip.trim(),
        patient_type: draft.patientType === 'Returning patient' ? 'returning' : 'new',
        reason: draft.reason,
        notes: (draft.notes || '').trim().slice(0, 2000),
        date: slot.date,
        start_at: ptToISO(slot.date, slot.time),
        ins_front_path: frontPath,
        ins_back_path: backPath,
      };

      const { error } = await supabase.from('bookings').insert([row]);
      if (error) {
        // Best-effort cleanup of the orphaned uploads (may fail for anon; harmless).
        try { await supabase.storage.from('insurance-cards').remove([frontPath, ...(backPath ? [backPath] : [])]); } catch (_) {}
        if (error.code === '23P01' || /exclusion|overlap/i.test(error.message || '')) {
          throw new Error('That time was just taken. Please pick another slot.');
        }
        throw new Error(error.message || 'The clinic did not accept the request.');
      }

      const firstName = row.name.split(' ')[0] || 'there';
      setDone({
        name: firstName,
        when: `${slot.dateLabel} at ${slot.timeLabel}`,
        phone: row.phone,
      });
      onDone();
    } catch (e) {
      setSendError(`Couldn't send your request (${e.message || 'network error'}). Please call us at ${CLINIC.phone}.`);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <main id="main" className="narrow page-pad">
        <div className="form-card">
          <div className="success">
            <span className="check" aria-hidden="true">✓</span>
            <h2>Request sent!</h2>
            <p>Thanks {done.name} — your request for {done.when} was sent to the clinic. We&rsquo;ll call you at {done.phone} to confirm.</p>
            <p>Questions in the meantime? Call us at <a href={CLINIC.phoneHref} style={{ color: 'var(--sage-dark)', fontWeight: 700 }}>{CLINIC.phone}</a>.</p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={onHome}>Back to home</button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <main id="main" className="narrow page-pad">
      <div className="page-head">
        <h1>Book an Appointment</h1>
        <p>Tell us about yourself — it takes about two minutes.</p>
      </div>

      <ol className="progress" aria-label="Booking progress">
        {[1, 2, 3].map((i) => (
          <li key={i} data-n={i} className={i === step ? 'active' : i < step ? 'done' : ''}>
            {['Your details', 'Visit details', 'Review'][i - 1]}
          </li>
        ))}
      </ol>

      <div className="form-card">
        {step === 1 && (
          <div role="group" aria-labelledby="s1h">
            <h2 id="s1h">Your details</h2>
            <p className="step-sub">Step 1 of 3 — we use this to verify your insurance and reach you.</p>

            <Field id="fullName" label="Full name" required error={errors.fullName}>
              <input type="text" id="fullName" autoComplete="name" value={draft.fullName}
                onChange={(e) => set('fullName', e.target.value)} />
            </Field>

            <div className="field-row two">
              <Field id="dob" label="Date of birth" required error={errors.dob}>
                <input type="date" id="dob" max={today} value={draft.dob}
                  onChange={(e) => set('dob', e.target.value)} />
              </Field>
              <Field id="phone" label="Contact number" required error={errors.phone}>
                <input type="tel" id="phone" autoComplete="tel" placeholder="(619) 555-0100" value={draft.phone}
                  onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>

            <Field id="email" label="Email address" required error={errors.email}>
              <input type="email" id="email" autoComplete="email" placeholder="you@example.com" value={draft.email}
                onChange={(e) => set('email', e.target.value)} />
            </Field>

            <Field id="street" label="Street address" required error={errors.street}>
              <input type="text" id="street" autoComplete="street-address" value={draft.street}
                onChange={(e) => set('street', e.target.value)} />
            </Field>
            <div className="field-row three">
              <Field id="city" label="City" required error={errors.city}>
                <input type="text" id="city" autoComplete="address-level2" value={draft.city}
                  onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field id="state" label="State" required error={errors.state}>
                <input type="text" id="state" autoComplete="address-level1" value={draft.state}
                  onChange={(e) => set('state', e.target.value)} />
              </Field>
              <Field id="zip" label="ZIP" required error={errors.zip}>
                <input type="text" id="zip" autoComplete="postal-code" inputMode="numeric" value={draft.zip}
                  onChange={(e) => set('zip', e.target.value)} />
              </Field>
            </div>

            <div className={'field' + (errors.frontFile ? ' invalid' : '')}>
              <label id="insLabel">Insurance card<span className="req" aria-hidden="true"> *</span></label>
              <label className="upload-box" htmlFor="insFront" aria-labelledby="insLabel">
                <input type="file" id="insFront" accept="image/*" capture="environment"
                  aria-describedby="insHint"
                  onChange={(e) => set('frontFile', e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                <strong>Tap to photograph your insurance card (front)</strong>
                <small id="insHint">Uses your camera on mobile, or choose a photo file. JPG/PNG.</small>
                <span className={'file-name' + (draft.frontFile ? ' show' : '')}>
                  {draft.frontFile ? `✓ ${draft.frontFile.name}` : ''}
                </span>
              </label>
              <p className="error" role="alert">{errors.frontFile || ''}</p>
            </div>
            <div className={'field' + (errors.backFile ? ' invalid' : '')}>
              <label className="upload-box" htmlFor="insBack">
                <input type="file" id="insBack" accept="image/*" capture="environment"
                  aria-describedby="insBackHint"
                  onChange={(e) => set('backFile', e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                <strong>Insurance card (back) — optional</strong>
                <small id="insBackHint">Helps us verify benefits faster.</small>
                <span className={'file-name' + (draft.backFile ? ' show' : '')}>
                  {draft.backFile ? `✓ ${draft.backFile.name}` : ''}
                </span>
              </label>
              <p className="error" role="alert">{errors.backFile || ''}</p>
            </div>

            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => { if (validateStep1()) onPickTime(); }}>
                Pick a time
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div role="group" aria-labelledby="s2h">
            <h2 id="s2h">Visit details</h2>
            <p className="step-sub">Step 2 of 3 — tell us what brings you in.</p>

            <div className="field">
              <label id="ptypeLabel">Are you a new or returning patient?</label>
              <div className="radio-row" role="radiogroup" aria-labelledby="ptypeLabel">
                {['New patient', 'Returning patient'].map((t) => (
                  <label className="radio-pill" key={t}>
                    <input type="radio" name="patientType" value={t}
                      checked={draft.patientType === t}
                      onChange={() => set('patientType', t)} />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <Field id="reason" label="Reason for visit" required error={errors.reason}>
              <select id="reason" value={draft.reason} onChange={(e) => set('reason', e.target.value)}>
                <option value="">Choose one…</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>

            <div className={'field' + (errors.slot ? ' invalid' : '')}>
              <label>Your time</label>
              <div className="review-box">
                {slot ? (
                  <p><strong>{slot.dateLabel}</strong> at <strong>{slot.timeLabel}</strong> (Pacific)</p>
                ) : (
                  <p>No time picked yet.</p>
                )}
              </div>
              <p className="error" role="alert">{errors.slot || ''}</p>
              <button type="button" className="btn btn-ghost btn-small" onClick={onPickTime} style={{ marginTop: 8 }}>
                {slot ? 'Change time' : 'Pick a time'}
              </button>
            </div>

            <div className="field">
              <label htmlFor="notes">Anything we should know? <span style={{ fontWeight: 400, color: '#8a937f' }}>(optional)</span></label>
              <textarea id="notes" placeholder="Symptoms, injuries, questions…" value={draft.notes}
                onChange={(e) => set('notes', e.target.value)} />
            </div>

            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => goStep(1)}>Back</button>
              <button type="button" className="btn btn-primary" onClick={() => { if (validateStep2()) goStep(3); }}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div role="group" aria-labelledby="s3h">
            <h2 id="s3h">Review &amp; confirm</h2>
            <p className="step-sub">Step 3 of 3 — check everything looks right.</p>
            <div className="review-box">
              <dl>
                <dt>Name</dt><dd>{draft.fullName}</dd>
                <dt>Date of birth</dt><dd>{draft.dob}</dd>
                <dt>Contact number</dt><dd>{draft.phone}</dd>
                <dt>Email</dt><dd>{draft.email}</dd>
                <dt>Address</dt><dd>{draft.street}, {draft.city}, {draft.state} {draft.zip}</dd>
                <dt>Insurance card</dt><dd>{draft.frontFile ? draft.frontFile.name : '—'}{draft.backFile ? ` (+ back: ${draft.backFile.name})` : ''}</dd>
                <dt>Patient type</dt><dd>{draft.patientType}</dd>
                <dt>Reason for visit</dt><dd>{draft.reason}</dd>
                <dt>Preferred time</dt><dd>{slot ? `${slot.dateLabel} at ${slot.timeLabel} (Pacific)` : '—'}</dd>
                {draft.notes.trim() && <><dt>Notes</dt><dd>{draft.notes.trim()}</dd></>}
              </dl>
            </div>
            <p className={'form-error' + (sendError ? ' show' : '')} role="alert">{sendError}</p>
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" onClick={() => goStep(2)} disabled={sending}>Back</button>
              <button type="button" className="btn btn-primary" onClick={submit} disabled={sending}>
                {sending ? 'Sending…' : 'Confirm Request'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="privacy">Your details are used only to arrange your visit and verify insurance. We never share your information.</p>
    </main>
  );
}
