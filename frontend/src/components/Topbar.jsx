import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import './Topbar.css';

export const Topbar = ({ title, actions }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [searchVal, setSearchVal] = useState('');
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 'welcome', message: 'Welcome to Crownridge Ops Portal. Systems Online.', time: 'Just now', read: false, path: '/' }
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (t) => {
      setNotifications(prev => [
        {
          id: `created-${t.id}-${Date.now()}`,
          message: `New Incident #${t.id} ("${t.title}") logged by ${t.client_name}`,
          time: 'Just now',
          read: false,
          path: `/tickets/${t.id}`
        },
        ...prev
      ]);
    };

    const handleTicketUpdated = (t) => {
      setNotifications(prev => [
        {
          id: `updated-${t.id}-${Date.now()}`,
          message: `Ticket #${t.id} properties updated by staff`,
          time: 'Just now',
          read: false,
          path: `/tickets/${t.id}`
        },
        ...prev
      ]);
    };

    const handleCommentAdded = (c) => {
      setNotifications(prev => [
        {
          id: `comment-${c.id}-${Date.now()}`,
          message: `New response on Ticket #${c.ticket_id} by ${c.user_name}`,
          time: 'Just now',
          read: false,
          path: `/tickets/${c.ticket_id}`
        },
        ...prev
      ]);
    };

    const handleSlaBreach = (t) => {
      setNotifications(prev => [
        {
          id: `sla-${t.id}-${Date.now()}`,
          message: `⚠️ SLA Breach Alert on Ticket #${t.id}`,
          time: 'Just now',
          read: false,
          path: `/tickets/${t.id}`
        },
        ...prev
      ]);
    };

    socket.on('ticket_created', handleTicketCreated);
    socket.on('ticket_updated', handleTicketUpdated);
    socket.on('comment_added', handleCommentAdded);
    socket.on('sla_breach_alert', handleSlaBreach);

    return () => {
      socket.off('ticket_created', handleTicketCreated);
      socket.off('ticket_updated', handleTicketUpdated);
      socket.off('comment_added', handleCommentAdded);
      socket.off('sla_breach_alert', handleSlaBreach);
    };
  }, [socket]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const q = searchVal.trim();
      if (q) {
        navigate(`/tickets?search=${encodeURIComponent(q)}`);
      }
    }
  };

  const handleNotifClick = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setShowNotifPanel(false);
    navigate(notif.path);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="topbar-container">
      {/* Left Title */}
      <div className="topbar-left">
        <h2 className="topbar-page-title">{title}</h2>
      </div>

      {/* Center Search */}
      <div className="topbar-center">
        <div className="topbar-search-wrapper">
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search tickets by ID, client, company..."
            className="topbar-search-input"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="topbar-right">
        {actions ? (
          <div className="topbar-custom-actions">{actions}</div>
        ) : (
          user?.role === 'CLIENT' && (
            <Link to="/new-ticket" className="topbar-cta-btn">
              <span>New Ticket</span>
            </Link>
          )
        )}

        {/* Bell Icon with unread count */}
        <div className="topbar-notification-wrapper">
          <button
            className="topbar-icon-btn notification-btn"
            onClick={() => setShowNotifPanel(!showNotifPanel)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="notif-badge-count">{unreadCount}</span>
            )}
          </button>

          {showNotifPanel && (
            <div className="topbar-notif-panel fade-in">
              <div className="notif-panel-header">
                <h4>System Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    className="mark-all-read-btn"
                    onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="notif-panel-list">
                {notifications.length === 0 ? (
                  <div className="empty-notifs">No new notifications.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item-row ${n.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotifClick(n)}
                    >
                      <p className="notif-message">{n.message}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar circle */}
        <div className="topbar-avatar" title={`${user?.name} (${user?.role})`}>
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
