import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };


  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/',
      roles: ['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT', 'CLIENT'],
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      )
    },
    {
      id: 'tickets',
      label: 'Repository',
      path: '/tickets',
      roles: ['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT', 'CLIENT'],
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    },
    {
      id: 'kanban',
      label: 'Kanban Board',
      path: '/kanban',
      roles: ['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'],
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="3" x2="8" y2="21" />
          <line x1="16" y1="3" x2="16" y2="21" />
          <line x1="3" y1="9" x2="21" y2="9" />
        </svg>
      )
    },
    {
      id: 'reports',
      label: 'Reports & Stats',
      path: '/reports',
      roles: ['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'],
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    },
    {
      id: 'escalations',
      label: 'Escalations',
      path: '/escalations',
      roles: ['ADMIN', 'SUPPORT_MANAGER'],
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      path: '/admin',
      roles: ['ADMIN'],
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    }
  ];

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  const getLabel = (item) => {
    if (item.id === 'tickets') {
      if (user.role === 'CLIENT') return 'My Tickets';
      if (user.role === 'SUPPORT_AGENT') return 'My Queue';
      if (user.role === 'TECH_LEAD') return 'Engineering';
      return 'Master Queue';
    }
    if (item.id === 'dashboard') {
      if (user.role === 'CLIENT') return 'Support Hub';
      if (user.role === 'SUPPORT_AGENT') return 'Agent Desk';
      if (user.role === 'TECH_LEAD') return 'Lead Panel';
      return 'Ops Overview';
    }
    return item.label;
  };

  return (
    <aside className="sidebar-container">
      {/* Brand Icon top */}
      <div className="sidebar-brand">
        <svg className="brand-premium-logo" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4l3 12h14l3-12-5 6-4-6-4 6-5-6z" fill="var(--gold-glow)" />
          <path d="M3 20h18" />
        </svg>
      </div>

      {/* Nav Links */}
      <nav className="sidebar-nav">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <div
              key={item.id}
              className="sidebar-nav-wrapper"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link to={item.path} className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                {item.icon}
              </Link>
              {hoveredItem === item.id && (
                <div className="sidebar-tooltip">
                  {getLabel(item)}
                </div>
              )}
            </div>
          );
        })}
      </nav>


      {/* Settings Bottom */}
      <div
        className="sidebar-bottom-wrapper"
        onMouseEnter={() => setHoveredItem('settings')}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <button className="sidebar-nav-item" type="button" onClick={() => setShowMenu(!showMenu)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        {hoveredItem === 'settings' && !showMenu && (
          <div className="sidebar-tooltip">
            Settings
          </div>
        )}
        {showMenu && (
          <div className="sidebar-settings-menu fade-in">
            <div className="menu-profile-section">
              <span className="profile-name">{user.name}</span>
              <span className="profile-role">{user.role.replace('SUPPORT_', '').replace('_', ' ')}</span>
            </div>
            <button className="menu-logout-btn" type="button" onClick={handleLogoutClick}>
              Log Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
