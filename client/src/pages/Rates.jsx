import { useEffect, useState } from 'react';
import { api } from '../services/api';

const SAMPLE_MESSY_CSV = `Spot Type, First Hour, Extra Hour, Daily Cap
compact , $50.00 , $30.00 ,250
STANDARD,₹60, ₹35 ,280
ev,$80,$45,350
unknown,10,10,10`;

export default function Rates() {
  const [rates, setRates] = useState(null);
  const [error, setError] = useState('');
  const [csv, setCsv] = useState(SAMPLE_MESSY_CSV);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadRates() {
    try {
      const data = await api.get('/rates');
      setRates(data.rates);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadRates();
  }, []);

  async function handleImport(e) {
    e.preventDefault();
    setImportError('');
    setImportResult(null);
    setLoading(true);
    try {
      const data = await api.post('/rates/import', { csv });
      setImportResult(data);
      setRates(data.rates);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Rate Card</h1>
      {error && <div className="error-banner">{error}</div>}

      <h2>Current effective rates</h2>
      {rates && (
        <table className="data-table" style={{ marginBottom: '2rem' }}>
          <thead>
            <tr>
              <th>Spot Type</th>
              <th>First Hour</th>
              <th>Extra Hour</th>
              <th>Daily Cap</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(rates).map(([type, r]) => (
              <tr key={type}>
                <td>{type}</td>
                <td>₹{r.firstHourRate}</td>
                <td>₹{r.additionalHourRate}</td>
                <td>₹{r.dailyMax}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Import a rate card</h2>
      <p>
        Paste a per-spot-type rate card below (columns: spot type, first hour, extra hour, daily cap).
        Messy input is handled automatically — currency symbols, extra whitespace, mixed case, and
        spot-type synonyms (e.g. "std", "electric") are cleaned before pricing is applied. Unrecognized
        or invalid rows are skipped and reported rather than guessed at.
      </p>
      <form className="card-form" style={{ maxWidth: '600px' }} onSubmit={handleImport}>
        <label>
          Raw rate card (CSV)
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={8}
            style={{ fontFamily: 'monospace', padding: '0.55rem 0.7rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Importing...' : 'Import Rate Card'}
        </button>
      </form>

      {importError && <div className="error-banner">{importError}</div>}

      {importResult && (
        <div className="success-card">
          <h2>Rate card imported</h2>
          <p>Cleaned and applied rates for: {importResult.imported.join(', ') || 'none'}</p>
          {importResult.skipped.length > 0 && (
            <>
              <p>Skipped {importResult.skipped.length} junk row(s):</p>
              <ul>
                {importResult.skipped.map((s, i) => (
                  <li key={i}>
                    Line {s.line}: {s.reason} — <code>{s.raw}</code>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
