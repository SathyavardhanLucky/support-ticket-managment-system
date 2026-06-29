import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import GoldButton from '../components/GoldButton';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminPanel.css';

export const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Redirect non-admins to dashboard
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);


  // Add User Drawer/Slide-over states
  const [showDrawer, setShowDrawer] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('SUPPORT_AGENT');
  const [creatingUser, setCreatingUser] = useState(false);
  const [drawerError, setDrawerError] = useState('');

  // SLA config states (stored locally/mocked)
  const [slaCritical, setSlaCritical] = useState('2');
  const [slaHigh, setSlaHigh] = useState('8');
  const [slaMedium, setSlaMedium] = useState('24');
  const [slaLow, setSlaLow] = useState('72');
  const [savingSLA, setSavingSLA] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setDrawerError('');

    try {
      await axios.post('http://localhost:5000/api/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      
      // Reset form & drawer
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('SUPPORT_AGENT');
      setShowDrawer(false);
      
      // Refresh list
      fetchUsers();
    } catch (err) {
      setDrawerError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveSLA = (e) => {
    e.preventDefault();
    setSavingSLA(true);
    setTimeout(() => {
      setSavingSLA(false);
      alert('SLA Configuration thresholds saved successfully!');
    }, 800);
  };

  // Get color tags for roles
  const getRoleClass = (role) => {
    switch (role) {
      case 'ADMIN': return 'role-admin';
      case 'SUPPORT_MANAGER': return 'role-manager';
      case 'TECH_LEAD': return 'role-tech';
      case 'SUPPORT_AGENT': return 'role-agent';
      default: return 'role-client';
    }
  };

  const topbarActions = activeTab === 'users' && (
    <GoldButton variant="primary" onClick={() => setShowDrawer(true)}>
      Add User
    </GoldButton>
  );

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title="Admin Center" actions={topbarActions} />
        <main className="main-content">

          {/* Inner Tabs Row */}
          <div className="admin-tabs-row fade-up" style={{ animationDelay: '0.05s' }}>
            <button
              className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              User Management
            </button>
            <button
              className={`admin-tab-btn ${activeTab === 'sla' ? 'active' : ''}`}
              onClick={() => setActiveTab('sla')}
            >
              SLA Thresholds
            </button>
            <button
              className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Incident Categories
            </button>
            <button
              className={`admin-tab-btn ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              System Operations
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="admin-tab-content fade-up" style={{ animationDelay: '0.1s' }}>
            
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="users-tab-panel">
                {loadingUsers ? (
                  <div className="admin-tab-loading">Retrieving user records...</div>
                ) : (
                  <div className="table-responsive-custom">
                    <table className="admin-users-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email Address</th>
                          <th>Role Authorization</th>
                          <th>Status</th>
                          <th>ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="text-white font-bold">{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`admin-role-pill ${getRoleClass(u.role)}`}>
                                {u.role.replace('SUPPORT_', '')}
                              </span>
                            </td>
                            <td>
                              <span className="active-user-bullet"></span> Active
                            </td>
                            <td className="text-muted">#{u.id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* SLA Config Tab */}
            {activeTab === 'sla' && (
              <div className="sla-tab-panel">
                <form onSubmit={handleSaveSLA} className="admin-sla-form">
                  <h3 className="tab-section-title">SLA Incident Resolution Targets</h3>
                  <p className="tab-section-subtitle">Define maximum resolution time limits (hours) for support tickets based on classification priority levels.</p>

                  <div className="sla-config-rows">
                    <div className="sla-config-row">
                      <label className="dark-label">Critical Priority SLA</label>
                      <div className="sla-input-wrapper">
                        <input
                          type="number"
                          className="dark-input"
                          value={slaCritical}
                          onChange={(e) => setSlaCritical(e.target.value)}
                          required
                        />
                        <span>hours</span>
                      </div>
                    </div>

                    <div className="sla-config-row">
                      <label className="dark-label">High Priority SLA</label>
                      <div className="sla-input-wrapper">
                        <input
                          type="number"
                          className="dark-input"
                          value={slaHigh}
                          onChange={(e) => setSlaHigh(e.target.value)}
                          required
                        />
                        <span>hours</span>
                      </div>
                    </div>

                    <div className="sla-config-row">
                      <label className="dark-label">Medium Priority SLA</label>
                      <div className="sla-input-wrapper">
                        <input
                          type="number"
                          className="dark-input"
                          value={slaMedium}
                          onChange={(e) => setSlaMedium(e.target.value)}
                          required
                        />
                        <span>hours</span>
                      </div>
                    </div>

                    <div className="sla-config-row">
                      <label className="dark-label">Low Priority SLA</label>
                      <div className="sla-input-wrapper">
                        <input
                          type="number"
                          className="dark-input"
                          value={slaLow}
                          onChange={(e) => setSlaLow(e.target.value)}
                          required
                        />
                        <span>hours</span>
                      </div>
                    </div>
                  </div>

                  <div className="sla-save-btn-row">
                    <GoldButton type="submit" loading={savingSLA}>
                      Save SLA Thresholds
                    </GoldButton>
                  </div>
                </form>
              </div>
            )}

            {/* Mock tabs for Categories & System */}
            {activeTab === 'categories' && (
              <div className="mock-tab-panel">
                <h3 className="tab-section-title">Incident Category Settings</h3>
                <div className="mock-grid-categories">
                  {['Website', 'App', 'Software', 'Hosting', 'Bug', 'Change Request'].map(c => (
                    <div key={c} className="category-meta-card">
                      <span className="category-card-name">{c}</span>
                      <span className="category-card-status">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="mock-tab-panel">
                <h3 className="tab-section-title">System Status Overview</h3>
                <div className="system-health-grid">
                  <div className="health-card">
                    <span className="health-lbl">SQLite Database</span>
                    <span className="health-val text-green">Online</span>
                  </div>
                  <div className="health-card">
                    <span className="health-lbl">Socket.IO Broker</span>
                    <span className="health-val text-green">Online</span>
                  </div>
                  <div className="health-card">
                    <span className="health-lbl">Claude API Engine</span>
                    <span className="health-val text-green">Online</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Add User Slide-over Drawer Panel */}
          {showDrawer && (
            <div className="drawer-overlay-backdrop" onClick={() => setShowDrawer(false)}>
              <div className="drawer-panel-right" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header-custom">
                  <h4>Create User Account</h4>
                  <button className="drawer-close-btn" onClick={() => setShowDrawer(false)}>
                    &times;
                  </button>
                </div>
                
                <form className="drawer-form" onSubmit={handleAddUser}>
                  
                  {drawerError && (
                    <div className="drawer-error-alert">{drawerError}</div>
                  )}

                  <div className="form-group-custom">
                    <label className="dark-label">Name *</label>
                    <input
                      type="text"
                      className="dark-input"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="dark-label">Email Address *</label>
                    <input
                      type="email"
                      className="dark-input"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="johndoe@crownridge.com"
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="dark-label">Password *</label>
                    <input
                      type="password"
                      className="dark-input"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="form-group-custom">
                    <label className="dark-label">Role Authorization *</label>
                    <select
                      className="dark-input"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="CLIENT">Client</option>
                      <option value="SUPPORT_AGENT">Support Agent</option>
                      <option value="SUPPORT_MANAGER">Support Manager</option>
                      <option value="ADMIN">System Admin</option>
                    </select>
                  </div>

                  <div className="drawer-submit-btn-row">
                    <GoldButton type="submit" loading={creatingUser} className="full-w-btn">
                      Log Account
                    </GoldButton>
                  </div>

                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
