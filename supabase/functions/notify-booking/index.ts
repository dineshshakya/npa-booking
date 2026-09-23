// Supabase Edge Function: email the clinic when a new booking is inserted.
//
// Trigger: Supabase Database Webhook on public.bookings INSERT → POST to this
// function. (Dashboard → Database → Webhooks → Create webhook.)
// Because it runs as a webhook AFTER the insert, email can never fail or
// slow down the booking itself.
//
// Secrets (set with: supabase secrets set RESEND_API_KEY=... NOTIFY_TO=...):
//   RESEND_API_KEY  Resend API key (https://resend.com) — optional
//   NOTIFY_TO       clinic email address, e.g. npacupuncturetest@gmail.com
//   NOTIFY_FROM     sender, e.g. "NPA Booking <bookings@yourdomain.com>"
//                   (defaults to "NPA Booking <onboarding@resend.dev>")
//
// If RESEND_API_KEY or NOTIFY_TO is missing, the function logs and exits
// cleanly — the booking is unaffected.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fmtWhen(rec) {
  // rec.date is YYYY-MM-DD; rec.start_at is an ISO timestamptz.
  let time = '';
  try {
    time = new Date(rec.start_at).toLocaleTimeString('en-US', {
      timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit',
    });
  } catch (_) { /* keep empty */ }
  return `${rec.date} at ${time} (Pacific)`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const payload = await req.json();
    const rec = (payload && payload.record) || {};

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const to = Deno.env.get('NOTIFY_TO');
    const from = Deno.env.get('NOTIFY_FROM') || 'NPA Booking <onboarding@resend.dev>';
    if (!apiKey || !to) {
      console.log('notify-booking: RESEND_API_KEY or NOTIFY_TO not set; skipping email.');
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const subject = `New booking: ${rec.name} — ${rec.date}`;
    const body = [
      'A new appointment request was submitted:',
      '',
      `Patient: ${rec.name}`,
      `When: ${fmtWhen(rec)}`,
      `Phone: ${rec.phone}`,
      `Email: ${rec.email}`,
      `DOB: ${rec.dob}`,
      `Address: ${rec.street}, ${rec.city}, ${rec.state} ${rec.zip}`,
      `Patient type: ${rec.patient_type === 'returning' ? 'Returning patient' : 'New patient'}`,
      `Reason: ${rec.reason}`,
      `Notes: ${rec.notes || '—'}`,
      `Insurance card: attached (see the clinic admin page)`,
      '',
      'Submitted via the NPA website booking form.',
    ].join('\n');

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, text: body }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('notify-booking: Resend error', resp.status, t);
    } else {
      console.log('notify-booking: email sent for booking', rec.id);
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Never fail the webhook loudly; the booking already succeeded.
    console.error('notify-booking error:', e);
    return new Response(JSON.stringify({ ok: true, error: String(e) }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
