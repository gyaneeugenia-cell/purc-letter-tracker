import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import Login from './pages/Login.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Letters from './pages/Letters.jsx';
import LetterDetails from './pages/LetterDetails.jsx';
import Timeline from './pages/Timeline.jsx';
import Analytics from './pages/Analytics.jsx';
import Notifications from './pages/Notifications.jsx';
import Settings from './pages/Settings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Search from './pages/Search.jsx';
import AuditLogs from './pages/AuditLogs.jsx';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="incoming" element={<Letters type="INCOMING" />} />
        <Route path="outgoing" element={<Letters type="OUTGOING" />} />
        <Route path="letters/:id" element={<LetterDetails />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="search" element={<Search />} />
        <Route path="audit" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}
