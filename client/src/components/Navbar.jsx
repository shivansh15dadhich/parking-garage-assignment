import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) => 'nav-link' + (isActive ? ' active' : '');

  return (
    <nav className="navbar">
      <div className="navbar-brand">🅿️ Parking Garage</div>
      <div className="navbar-links">
        <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/check-in" className={linkClass}>Check In</NavLink>
        <NavLink to="/active" className={linkClass}>Active</NavLink>
        <NavLink to="/history" className={linkClass}>History</NavLink>
        <NavLink to="/spots" className={linkClass}>Spots</NavLink>
        <NavLink to="/rates" className={linkClass}>Rates</NavLink>
        <NavLink to="/clock" className={linkClass}>Clock</NavLink>
      </div>
      <div className="navbar-user">
        <span>{user.name}</span>
        <button onClick={handleLogout} className="btn btn-small">Logout</button>
      </div>
    </nav>
  );
}
