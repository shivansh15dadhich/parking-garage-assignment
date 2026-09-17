import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import SummaryCard from '../components/SummaryCard';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  async function loadStats() {
    try {
      const data = await api.get('/dashboard');
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;
  if (!stats) return <div className="page">Loading dashboard...</div>;

  return (
    <div className="page">
      <h1>Dashboard</h1>

      <div className="summary-grid">
        <SummaryCard label="Total Spots" value={stats.totalSpots} />
        <SummaryCard label="Occupied Spots" value={stats.occupiedSpots} accent="warning" />
        <SummaryCard label="Available Spots" value={stats.availableSpots} accent="success" />
        <SummaryCard
          label="EV Spots Available"
          value={`${stats.evSpots.available} / ${stats.evSpots.total}`}
          accent="ev"
        />
        <SummaryCard label="Active Vehicles" value={stats.activeVehicles} />
        <SummaryCard label="Today's Revenue" value={`₹${stats.todayRevenue}`} accent="success" />
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-buttons">
          <Link to="/check-in" className="btn btn-primary">Check In</Link>
          <Link to="/active" className="btn btn-secondary">Check Out</Link>
          <Link to="/history" className="btn btn-secondary">Search Vehicle</Link>
        </div>
      </div>
    </div>
  );
}
