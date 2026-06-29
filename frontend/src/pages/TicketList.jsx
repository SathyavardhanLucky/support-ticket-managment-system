import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import SLATimer from '../components/SLATimer';
import GoldButton from '../components/GoldButton';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './TicketList.css';

export const TicketList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter form states
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');
  const [agentId, setAgentId] = useState('');
  const [search, setSearch] = useState('');

  // Fetch tickets with active filters
  const filters = {
    status,
    priority,
    category,
    agent_id: agentId
  };

  const { tickets, loading, error, refetch } = useTickets(filters);
  const [staff, setStaff] = useState([]);

  // Fetch agents list for filter dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      if (!user || !['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD'].includes(user.role)) return;
      try {
        const response = await axios.get('http://localhost:5000/api/users');
        const staffList = response.data.filter(u => ['SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN'].includes(u.role));
        setStaff(staffList);
      } catch (err) {
        console.error('Failed to load agents list:', err);
      }
    };
    fetchStaff();
  }, [user]);


  const handleClearFilters = () => {
    setStatus('');
    setPriority('');
    setCategory('');
    setAgentId('');
    setSearch('');
  };

  // Local filtering for search query (Title scan)
  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    return t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toString() === search;
  });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasActiveFilters = status || priority || category || agentId || search;

  // Render dismissible filter chips
  const renderFilterChips = () => {
    if (!hasActiveFilters) return null;

    return (
      <div className="active-filter-chips fade-in">
        {status && (
          <span className="filter-chip">
            Status: {status} <button onClick={() => setStatus('')}>&times;</button>
          </span>
        )}
        {priority && (
          <span className="filter-chip">
            Priority: {priority} <button onClick={() => setPriority('')}>&times;</button>
          </span>
        )}
        {category && (
          <span className="filter-chip">
            Category: {category} <button onClick={() => setCategory('')}>&times;</button>
          </span>
        )}
        {agentId && (
          <span className="filter-chip">
            Agent: {staff.find(s => s.id === parseInt(agentId))?.name || agentId} <button onClick={() => setAgentId('')}>&times;</button>
          </span>
        )}
        {search && (
          <span className="filter-chip">
            Search: {search} <button onClick={() => setSearch('')}>&times;</button>
          </span>
        )}
        <button className="clear-filters-link" onClick={handleClearFilters}>
          Clear All
        </button>
      </div>
    );
  };

  // Topbar CTA Actions Button
  const topbarActions = (
    <GoldButton variant="primary" onClick={() => navigate('/new-ticket')}>
      <span>New Ticket</span>
    </GoldButton>
  );

  const getListTitle = () => {
    if (user?.role === 'CLIENT') return 'My Tickets Database';
    if (user?.role === 'SUPPORT_AGENT') return 'My Assigned Queue';
    if (user?.role === 'TECH_LEAD') return 'Engineering Backlog';
    if (user?.role === 'SUPPORT_MANAGER') return 'Master Queue Database';
    return 'Global Incidents Repository';
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title={getListTitle()} actions={topbarActions} />
        <main className="main-content">

          {/* Search & Filters Block */}
          <section className="filter-bar-card fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="search-bar-inline">
              <input
                type="text"
                className="dark-input"
                placeholder="Search by Title or Ticket ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-dropdowns-row">
              <select className="dark-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <select className="dark-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              <select className="dark-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                <option value="Website">Website</option>
                <option value="App">App</option>
                <option value="Software">Software</option>
                <option value="Hosting">Hosting</option>
                <option value="Bug">Bug</option>
                <option value="Change Request">Change Request</option>
              </select>

              {['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD'].includes(user?.role) && (
                <select className="dark-input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">All Agents</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          </section>

          {/* Active Filter Chips */}
          {renderFilterChips()}

          {/* Incidents Table */}
          {loading ? (
            <div className="loading-container">Loading tickets repository...</div>
          ) : error ? (
            <div className="error-alert">{error}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state-list fade-up" style={{ animationDelay: '0.1s' }}>
              <div className="empty-icon">📂</div>
              <h3>No tickets found</h3>
              <p>Try modifying your active filter values or clear all active filters.</p>
              {hasActiveFilters && (
                <GoldButton variant="ghost" onClick={handleClearFilters}>
                  Clear Active Filters
                </GoldButton>
              )}
            </div>
          ) : (
            <div className="table-responsive-custom fade-up" style={{ animationDelay: '0.15s' }}>
              <table className="tickets-custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Agent</th>
                    <th>SLA Timer</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t, idx) => (
                    <tr
                      key={t.id}
                      className={`clickable-row ${t.sla_breached ? 'row-sla-breached' : ''}`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      <td className="text-gold font-bold">#{t.id}</td>
                      <td className="title-cell-link">
                        {t.title}
                      </td>
                      <td className="text-secondary">{t.category}</td>
                      <td>
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>{t.assigned_agent_name || 'Unassigned'}</td>
                      <td className="sla-timer-cell">
                        {t.status === 'Resolved' || t.status === 'Closed' ? (
                          <span className="badge badge-resolved">Done</span>
                        ) : (
                          <SLATimer deadline={t.sla_deadline} />
                        )}
                      </td>
                      <td className="text-muted text-nowrap">{formatDate(t.created_at)}</td>
                      <td>
                        <div className="action-btns-row">
                          <button className="icon-action-btn" title="View Detail">
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default TicketList;
