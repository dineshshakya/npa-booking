import { useState } from 'react';
import Landing from './pages/Landing.jsx';
import Schedule from './pages/Schedule.jsx';
import Book from './pages/Book.jsx';
import Admin from './pages/Admin.jsx';

export const CLINIC = {
  name: 'North Park Acupuncture',
  phone: '(619) 294-6616',
  phoneHref: 'tel:+16192946616',
  address: '3080 North Park Way, San Diego, CA 92104',
};

const EMPTY_DRAFT = {
  fullName: '', dob: '', phone: '', email: '',
  street: '', city: '', state: 'CA', zip: '',
  patientType: 'New patient', reason: '', notes: '',
  frontFile: null, backFile: null,
};

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3C10 9 6 15 6 21a10 10 0 0 0 20 0c0-6-4-12-10-18z" fill="#5f7f63" />
      <path d="M16 8v18M10 14l6-4 6 4" stroke="#faf8f1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function App() {
  // view: 'landing' | 'schedule' | 'book' | 'admin'
  const [view, setView] = useState('landing');
  const [bookStep, setBookStep] = useState(1);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [slot, setSlot] = useState(null); // {date, time, dateLabel, timeLabel}

  const goLanding = () => { setView('landing'); };
  const goBook = (step = 1) => { setBookStep(step); setView('book'); };
  const goSchedule = () => setView('schedule');
  const goAdmin = () => setView('admin');

  const pickSlot = (s) => {
    setSlot(s);
    setBookStep(2);
    setView('book');
  };

  const resetBooking = () => {
    setDraft(EMPTY_DRAFT);
    setSlot(null);
    setBookStep(1);
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="site">
        <div className="nav-wrap">
          <button className="brand" onClick={goLanding} aria-label="North Park Acupuncture home">
            <Logo /> North Park Acupuncture
          </button>
          <nav className="nav-links" aria-label="Primary">
            <button className="linklike" onClick={goSchedule}>Pick a time</button>
            <button className="linklike" onClick={goAdmin}>Clinic login</button>
            <button className="btn" style={{ minHeight: 0, padding: '10px 22px' }} onClick={() => goBook(1)}>
              Book Now
            </button>
          </nav>
        </div>
      </header>

      {view === 'landing' && <Landing onBook={() => goBook(1)} />}
      {view === 'schedule' && (
        <Schedule
          onPick={pickSlot}
          onBack={() => (slot || draft.fullName ? goBook(1) : goLanding())}
          backLabel={slot || draft.fullName ? 'Back to details' : 'Back to home'}
        />
      )}
      {view === 'book' && (
        <Book
          step={bookStep}
          setStep={setBookStep}
          draft={draft}
          setDraft={setDraft}
          slot={slot}
          setSlot={setSlot}
          onPickTime={goSchedule}
          onDone={resetBooking}
          onHome={goLanding}
        />
      )}
      {view === 'admin' && <Admin onHome={goLanding} />}

      <footer className="site">
        &copy; 2026 North Park Acupuncture · {CLINIC.address} ·{' '}
        <button onClick={goAdmin} aria-label="Clinic login">Clinic login</button>
      </footer>
    </>
  );
}
