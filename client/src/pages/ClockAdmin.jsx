import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function ClockAdmin() {
  const [clock, setClock] = useState(null);
  const [advanceHours, setAdvanceHours] = useState(25);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadClock() {
    try {
      const data = await api.get('/clock');
      setClock(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadClock();
  }, []);

  async function runClock(body) {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post('/clock', body);
      setResult(data);
      loadClock();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Virtual Clock &amp; Nightly Job</h1>
      <p>
        The nightly job auto-closes and bills any session parked over 24h, freeing its spot. This
        page fast-forwards the server's clock instead of waiting real hours, so you can see it run.
      </p>
      {error && <div className="error-banner">{error}</div>}

      {clock && (
        <div className="success-card">
          <dl className="receipt-list">
            <dt>Current server time</dt><dd>{new Date(clock.now).toLocaleString()}</dd>
            <dt>Virtual clock active</dt><dd>{clock.isVirtual ? 'Yes' : 'No (real time)'}</dd>
          </dl>
        </div>
      )}

      <div className="card-form" style={{ maxWidth: '480px' }}>
        <label>
          Advance clock by (hours)
          <input
            type="number"
            value={advanceHours}
            onChange={(e) => setAdvanceHours(e.target.value)}
            min="1"
          />
        </label>
        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={() => runClock({ advanceHours: Number(advanceHours) })}
        >
          {loading ? 'Running...' : 'Advance Clock & Run Nightly Job'}
        </button>
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => runClock({ reset: true })}
        >
          Reset to Real Time
        </button>
      </div>

      {result && (
        <div className="success-card">
          <h2>{result.message}</h2>
          <p>Server time is now: {new Date(result.time).toLocaleString()}</p>
          {result.autoClosed.length === 0 ? (
            <p>No sessions were over 24h — nothing auto-closed.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>License Plate</th>
                  <th>Duration</th>
                  <th>Amount Billed</th>
                </tr>
              </thead>
              <tbody>
                {result.autoClosed.map((s) => (
                  <tr key={s.sessionId}>
                    <td>{s.licensePlate}</td>
                    <td>{(s.durationMinutes / 60).toFixed(1)}h</td>
                    <td>₹{s.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
