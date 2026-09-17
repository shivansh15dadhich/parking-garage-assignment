import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <h1>🅿️ Parking Garage Management System</h1>
        <p className="landing-tagline">
          Fast, reliable check-in and checkout for busy multi-level city-centre garages.
        </p>
        <div className="landing-cta">
          <Link to="/login" className="btn btn-primary">Login</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </header>

      <section className="landing-section">
        <h2>What it does</h2>
        <p>
          This system helps a parking attendant manage the full lifecycle of a vehicle's
          visit — from check-in, to automatic spot assignment, to checkout and fee
          calculation — while keeping an accurate, searchable record of every session.
        </p>
      </section>

      <section className="landing-section">
        <h2>Key Features</h2>
        <ul className="landing-features">
          <li>Check a vehicle in and automatically assign a suitable, available spot</li>
          <li>Tiered hourly pricing with a daily maximum, part-hours rounded up</li>
          <li>Instant license-plate search for any vehicle</li>
          <li>Live view of active vehicles and available spots, including EV spots</li>
          <li>Full parking history with pagination and sorting</li>
          <li>Hard guarantees against double-parking and duplicate check-ins</li>
        </ul>
      </section>

      <section className="landing-section">
        <h2>Who it's for</h2>
        <p>
          Parking attendants and garage administrators who need a simple, dependable
          tool to run day-to-day operations in a multi-level city-centre garage without
          juggling paper logs or spreadsheets.
        </p>
      </section>

      <section className="landing-section">
        <h2>How it helps</h2>
        <p>
          It removes manual guesswork — the system enforces spot compatibility rules
          (like EV vehicles only using EV spots), prevents double-booking a spot, and
          calculates fees consistently every time, so attendants can focus on the
          vehicles in front of them.
        </p>
      </section>

      <section className="landing-section">
        <h2>Coming Next</h2>
        <ul className="landing-features">
          <li>Reserved / pre-booked spots for regular customers</li>
          <li>Automated email or SMS receipts on checkout</li>
          <li>Analytics dashboard showing occupancy trends over time</li>
        </ul>
      </section>
    </div>
  );
}
