import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { estimateFee, formatDuration } from '../utils/feeEstimate';

const VEHICLE_TYPES = ['COMPACT', 'STANDARD', 'EV'];

export default function ActiveVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [loading, setLoading] = useState(false);

  const [transferTarget, setTransferTarget] = useState(null);
  const [toLicensePlate, setToLicensePlate] = useState('');
  const [toVehicleType, setToVehicleType] = useState('STANDARD');
  const [transferError, setTransferError] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  async function loadActive() {
    try {
      const data = await api.get('/parking/active');
      setVehicles(data.vehicles);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadActive();

    const interval = setInterval(() => setVehicles((v) => [...v]), 30000);
    return () => clearInterval(interval);
  }, []);

  async function handleCheckOut(licensePlate) {
    setCheckoutError('');
    setLoading(true);
    try {
      const data = await api.post('/parking/check-out', { licensePlate });
      setReceipt(data.receipt);
      setSelected(null);
      loadActive();
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openTransfer(vehicle) {
    setTransferTarget(vehicle);
    setToLicensePlate('');
    setToVehicleType(vehicle.vehicle_type);
    setTransferError('');
  }

  async function handleTransfer(e) {
    e.preventDefault();
    setTransferError('');
    setTransferLoading(true);
    try {
      await api.post('/parking/transfer', {
        fromLicensePlate: transferTarget.license_plate,
        toLicensePlate,
        toVehicleType
      });
      setTransferTarget(null);
      loadActive();
    } catch (err) {
      setTransferError(err.message);
    } finally {
      setTransferLoading(false);
    }
  }

  return (
    <div className="page">
      <h1>Active Vehicles</h1>
      {error && <div className="error-banner">{error}</div>}

      {receipt && (
        <div className="success-card">
          <h2>Vehicle checked out successfully</h2>
          <dl className="receipt-list">
            <dt>License Plate</dt><dd>{receipt.license_plate}</dd>
            <dt>Vehicle Type</dt><dd>{receipt.vehicle_type}</dd>
            <dt>Spot</dt><dd>{receipt.spot_number} (Floor {receipt.floor})</dd>
            <dt>Check-in</dt><dd>{new Date(receipt.check_in_time).toLocaleString()}</dd>
            <dt>Check-out</dt><dd>{new Date(receipt.check_out_time).toLocaleString()}</dd>
            <dt>Duration</dt><dd>{formatDuration(receipt.duration_minutes)}</dd>
            <dt>Amount Charged</dt><dd>₹{receipt.amount}</dd>
          </dl>
          <button className="btn btn-small" onClick={() => setReceipt(null)}>Dismiss</button>
        </div>
      )}

      {vehicles.length === 0 ? (
        <p>No vehicles are currently parked.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>License Plate</th>
              <th>Type</th>
              <th>Spot</th>
              <th>Floor</th>
              <th>Check-in Time</th>
              <th>Duration</th>
              <th>Est. Fee</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const { fee, durationMinutes } = estimateFee(v.check_in_time, v.vehicle_type);
              return (
                <tr key={v.id}>
                  <td>{v.license_plate}</td>
                  <td>{v.vehicle_type}</td>
                  <td>{v.spot_number}</td>
                  <td>{v.floor}</td>
                  <td>{new Date(v.check_in_time).toLocaleString()}</td>
                  <td>{formatDuration(durationMinutes)}</td>
                  <td>₹{fee}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => openTransfer(v)}
                    >
                      Transfer
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => setSelected(v)}
                    >
                      Check Out
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Checkout</h2>
            {checkoutError && <div className="error-banner">{checkoutError}</div>}
            <p>Check out <strong>{selected.license_plate}</strong> from spot {selected.spot_number}?</p>
            <p>Estimated fee: ₹{estimateFee(selected.check_in_time, selected.vehicle_type).fee}</p>
            <div className="modal-actions">
              <button className="btn btn-small" onClick={() => setSelected(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={loading}
                onClick={() => handleCheckOut(selected.license_plate)}
              >
                {loading ? 'Processing...' : 'Confirm Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferTarget && (
        <div className="modal-backdrop" onClick={() => setTransferTarget(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleTransfer}>
            <h2>Valet Hand-off</h2>
            {transferError && <div className="error-banner">{transferError}</div>}
            <p>
              Move <strong>{transferTarget.license_plate}</strong>'s open session (spot{' '}
              {transferTarget.spot_number}, checked in {new Date(transferTarget.check_in_time).toLocaleString()})
              to a different plate. The spot and entry time carry over unchanged.
            </p>
            <label>
              New License Plate
              <input
                type="text"
                value={toLicensePlate}
                onChange={(e) => setToLicensePlate(e.target.value)}
                placeholder="e.g. MH02NEW001"
                required
              />
            </label>
            <label>
              Vehicle Type (used only if this plate is new)
              <select value={toVehicleType} onChange={(e) => setToVehicleType(e.target.value)}>
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <div className="modal-actions">
              <button type="button" className="btn btn-small" onClick={() => setTransferTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={transferLoading}>
                {transferLoading ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
