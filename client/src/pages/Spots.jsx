import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Spots() {
  const [spots, setSpots] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/spots')
      .then((data) => setSpots(data.spots))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;

  const byFloor = spots.reduce((acc, spot) => {
    acc[spot.floor] = acc[spot.floor] || [];
    acc[spot.floor].push(spot);
    return acc;
  }, {});

  return (
    <div className="page">
      <h1>Parking Spots</h1>
      {Object.entries(byFloor).map(([floor, floorSpots]) => (
        <div key={floor} className="floor-section">
          <h2>Floor {floor}</h2>
          <div className="spot-grid">
            {floorSpots.map((spot) => (
              <div
                key={spot.id}
                className={`spot-tile spot-${spot.spot_type.toLowerCase()} ${spot.is_occupied ? 'occupied' : 'free'}`}
              >
                <div className="spot-number">{spot.spot_number}</div>
                <div className="spot-type">{spot.spot_type}</div>
                <div className="spot-status">{spot.is_occupied ? 'Occupied' : 'Free'}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
