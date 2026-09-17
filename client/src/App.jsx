import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import ActiveVehicles from './pages/ActiveVehicles';
import History from './pages/History';
import Spots from './pages/Spots';
import Rates from './pages/Rates';
import ClockAdmin from './pages/ClockAdmin';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/check-in" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
        <Route path="/active" element={<ProtectedRoute><ActiveVehicles /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/spots" element={<ProtectedRoute><Spots /></ProtectedRoute>} />
        <Route path="/rates" element={<ProtectedRoute><Rates /></ProtectedRoute>} />
        <Route path="/clock" element={<ProtectedRoute><ClockAdmin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
