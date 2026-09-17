import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Pagination from '../components/Pagination';

const SORT_FIELDS = [
  { value: 'check_in_time', label: 'Check-in Time' },
  { value: 'check_out_time', label: 'Check-out Time' },
  { value: 'amount', label: 'Amount' },
  { value: 'license_plate', label: 'License Plate' }
];

export default function History() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [sortBy, setSortBy] = useState('check_in_time');
  const [order, setOrder] = useState('desc');
  const [error, setError] = useState('');

  const [searchPlate, setSearchPlate] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  async function loadHistory(page = 1) {
    setError('');
    try {
      const data = await api.get(
        `/parking/history?page=${page}&limit=${pagination.limit}&sortBy=${sortBy}&order=${order}`
      );
      setRecords(data.records);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadHistory(1);

  }, [sortBy, order]);

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    if (!searchPlate.trim()) return;
    try {
      const data = await api.get(`/parking/search?licensePlate=${encodeURIComponent(searchPlate.trim())}`);
      setSearchResult(data);
    } catch (err) {
      setSearchError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>Parking History</h1>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by license plate..."
          value={searchPlate}
          onChange={(e) => setSearchPlate(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {searchError && <div className="error-banner">{searchError}</div>}
      {searchResult && (
        <div className="search-result-card">
          <dl className="receipt-list">
            <dt>Vehicle</dt><dd>{searchResult.vehicle.licensePlate}</dd>
            <dt>Vehicle Type</dt><dd>{searchResult.vehicle.vehicleType}</dd>
            <dt>Status</dt><dd>{searchResult.status}</dd>
            <dt>Current Spot</dt><dd>{searchResult.currentSpot || '—'}</dd>
            <dt>Floor</dt><dd>{searchResult.floor ?? '—'}</dd>
            <dt>Check-in Time</dt>
            <dd>{searchResult.checkInTime ? new Date(searchResult.checkInTime).toLocaleString() : '—'}</dd>
          </dl>
        </div>
      )}

      <div className="sort-controls">
        <label>
          Sort by
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </label>
        <label>
          Order
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>License Plate</th>
            <th>Type</th>
            <th>Spot</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Duration</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.license_plate}</td>
              <td>{r.vehicle_type}</td>
              <td>{r.spot_number} (F{r.floor})</td>
              <td>{new Date(r.check_in_time).toLocaleString()}</td>
              <td>{r.check_out_time ? new Date(r.check_out_time).toLocaleString() : '—'}</td>
              <td>{r.duration_minutes != null ? `${r.duration_minutes}m` : '—'}</td>
              <td>{r.amount != null ? `₹${r.amount}` : '—'}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={(p) => loadHistory(p)}
      />
    </div>
  );
}
