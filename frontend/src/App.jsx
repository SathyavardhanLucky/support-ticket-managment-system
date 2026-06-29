import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import NotificationToast from './components/NotificationToast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import NewTicket from './pages/NewTicket';
import AdminPanel from './pages/AdminPanel';
import Reports from './pages/Reports';
import KanbanBoard from './pages/KanbanBoard';
import EscalationCenter from './pages/EscalationCenter';


const ProtectedLayout = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container-guard">
        <div className="guard-spinner">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
        <p>Validating user credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {children}
      <NotificationToast />
    </>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/tickets" element={<ProtectedLayout><TicketList /></ProtectedLayout>} />
            <Route path="/tickets/:id" element={<ProtectedLayout><TicketDetail /></ProtectedLayout>} />
            <Route path="/new-ticket" element={<ProtectedLayout><NewTicket /></ProtectedLayout>} />
            <Route path="/admin" element={<ProtectedLayout><AdminPanel /></ProtectedLayout>} />
            <Route path="/reports" element={<ProtectedLayout><Reports /></ProtectedLayout>} />
            <Route path="/kanban" element={<ProtectedLayout><KanbanBoard /></ProtectedLayout>} />
            <Route path="/escalations" element={<ProtectedLayout><EscalationCenter /></ProtectedLayout>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
