import { useState } from 'react';
import { api } from '../services/api';

const VEHICLE_TYPES = ['COMPACT', 'STANDARD', 'EV'];

export default function CheckIn() {
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('STANDARD');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await api.post('/parking/check-in', { licensePlate, vehicleType });
      setResult(data.session);
      setLicensePlate('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Check In</h1>

      <form className="card-form" onSubmit={handleSubmit}>
        <label>
          License Plate
          <input
            type="text"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="e.g. RJ14AB1234"
            required
          />
        </label>
        <label>
          Vehicle Type
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
            {VEHICLE_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Checking in...' : 'Check In'}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <div className="success-card">
          <h2>Vehicle checked in successfully</h2>
          <dl className="receipt-list">
            <dt>License Plate</dt><dd>{result.license_plate}</dd>
            <dt>Vehicle Type</dt><dd>{result.vehicle_type}</dd>
            <dt>Assigned Spot</dt><dd>{result.spot_number}</dd>
            <dt>Floor</dt><dd>{result.floor}</dd>
            <dt>Check-in Time</dt><dd>{new Date(result.check_in_time).toLocaleString()}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
