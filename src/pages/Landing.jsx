import { CLINIC } from '../App.jsx';

const TILES = [
  { name: 'Acupuncture', svg: <path d="M12 2v20M5 8l7-4 7 4" /> },
  { name: 'Pain Management', svg: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></> },
  { name: 'Stress & Anxiety', svg: <><path d="M12 3a9 9 0 1 0 9 9" /><path d="M12 8v4l2.5 2.5" /></> },
  { name: 'Sleep Support', svg: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" /> },
  { name: "Women's Health", svg: <path d="M12 21s-7-4.5-7-11a7 7 0 0 1 14 0c0 6.5-7 11-7 11z" /> },
  { name: 'Headaches & Migraines', svg: <path d="M4 12h4l2-7 4 14 2-7h4" /> },
  { name: 'Orthopedic Care', svg: <><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></> },
  { name: 'Healthy Aging', svg: <path d="M12 22c5-3 8-7 8-12V4l-8-2-8 2v6c0 5 3 9 8 12z" /> },
];

const CONDITIONS = [
  'Back pain', 'Neck & shoulder pain', 'Sciatica', 'Arthritis', 'Insomnia',
  'Anxiety', 'Digestive issues', 'Fertility support', 'Post-injury recovery',
];

export default function Landing({ onBook }) {
  return (
    <main id="main">
      <div className="hero">
        <h1>Helping you achieve optimal wellbeing.</h1>
        <p>Personalized acupuncture care in the heart of North Park, San Diego — for pain, stress, sleep, and whole-body balance.</p>
        <button className="btn" onClick={onBook}>Book an Appointment</button>
      </div>

      <div className="trust" aria-label="Highlights">
        <span>20+ years of experience</span>
        <span>★ 4.9 · 22 reviews</span>
        <span>CityBeat Best Acupuncture winner</span>
      </div>

      <section className="block" id="services" aria-labelledby="services-h">
        <h2 id="services-h">Services</h2>
        <div className="tiles">
          {TILES.map((t) => (
            <div className="tile" key={t.name}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#5f7f63" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {t.svg}
              </svg>
              <h3>{t.name}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="block" aria-labelledby="conditions-h">
        <h2 id="conditions-h">Conditions we support</h2>
        <div className="pills">
          {CONDITIONS.map((c) => <span key={c}>{c}</span>)}
        </div>
      </section>

      <section className="block" aria-labelledby="visit-h">
        <h2 id="visit-h">Your first visit</h2>
        <div className="steps3">
          <div className="step-card"><span className="n" aria-hidden="true">1</span><h3>Listen</h3><p>We start with a thorough conversation about your health history, symptoms, and goals.</p></div>
          <div className="step-card"><span className="n" aria-hidden="true">2</span><h3>Plan</h3><p>You get a personalized treatment plan — acupuncture, heat therapy, and manual therapy as needed.</p></div>
          <div className="step-card"><span className="n" aria-hidden="true">3</span><h3>Treat</h3><p>Relax during your session in a calm, private treatment room. Most visits last about an hour.</p></div>
        </div>
      </section>

      <section className="block" aria-labelledby="info-h">
        <h2 id="info-h" style={{ position: 'absolute', left: -9999 }}>About, reviews and contact</h2>
        <div className="cards">
          <div className="card" id="about">
            <h3>About Us</h3>
            <p><strong>Namrata Sakya</strong> · Licensed Acupuncturist · San Diego, CA</p>
            <p style={{ marginTop: 8 }}>20+ years across research, clinical practice, and education. Specialties: acupuncture, heat therapy, and manual therapy.</p>
            <p style={{ marginTop: 8 }}>Voted San Diego's <strong>Best Place to Get Acupuncture</strong> by CityBeat readers.</p>
          </div>
          <div className="card">
            <h3>Reviews</h3>
            <p><span className="stars" role="img" aria-label="4.9 out of 5 stars">★★★★★</span> <strong>4.9</strong> · 22 Birdeye reviews</p>
            <blockquote>"Best acupuncture experience I've ever had."<footer>— Anonymous patient</footer></blockquote>
            <blockquote>"I walked in with my mind going a mile a minute and left feeling so relaxed."<footer>— Anonymous patient</footer></blockquote>
          </div>
          <div className="card" id="contact">
            <h3>Contact</h3>
            <p>{CLINIC.address.split(', San Diego')[0]}<br />San Diego, CA 92104</p>
            <p style={{ marginTop: 8 }}><a href={CLINIC.phoneHref} style={{ color: 'var(--sage-dark)', fontWeight: 700 }}>{CLINIC.phone}</a></p>
            <p style={{ marginTop: 8 }}>Open for booking: 8:00 AM – 5:00 PM</p>
          </div>
          <div className="card">
            <h3>Book Now</h3>
            <p>Request your visit online in about two minutes. We'll call to verify your insurance and confirm your time.</p>
            <p style={{ marginTop: 12 }}><button className="btn" onClick={onBook}>Start Booking</button></p>
          </div>
        </div>
      </section>

      <div className="book-banner">
        <h2>Ready when you are.</h2>
        <p>Same-week appointments often available. Most insurance plans accepted.</p>
        <button className="btn" onClick={onBook}>Book an Appointment</button>
      </div>
    </main>
  );
}
