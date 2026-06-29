import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './Dashboard.css';

export const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { tickets, loading, error, refetch } = useTickets();
  const [activities, setActivities] = useState([]);
  const [staff, setStaff] = useState([]);
  const navigate = useNavigate();

  // Fetch staff list for reassignment dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      if (user && ['ADMIN', 'SUPPORT_MANAGER'].includes(user.role)) {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const agentsOnly = res.data.filter(u => ['SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN'].includes(u.role));
          setStaff(agentsOnly);
        } catch (err) {
          console.error("Failed to load staff:", err);
        }
      }
    };
    fetchStaff();
  }, [user]);

  // Manager Actions Override Handlers
  const handleAssign = async (ticketId, agentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${ticketId}`, 
        { assigned_agent_id: agentId === '' ? null : parseInt(agentId) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Reassignment failed.');
    }
  };

  const handleEscalate = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/${ticketId}/escalate`, 
        { level: 1, reason: 'Operations dashboard override' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Escalation override failed.');
    }
  };

  const handleDeescalate = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${ticketId}`, 
        { escalation_level: 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'De-escalation failed.');
    }
  };

  const handleApprove = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/${ticketId}/approval`, 
        { action: 'Approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Approval action failed.');
    }
  };

  const handleReject = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/${ticketId}/approval`, 
        { action: 'Reject' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Rejection action failed.');
    }
  };

  // Stats calculation
  const openTickets = tickets.filter(t => t.status === 'Open');
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress');
  const breachedTickets = tickets.filter(t => t.sla_breached && t.status !== 'Resolved' && t.status !== 'Closed');
  
  // Resolved today calculation
  const resolvedToday = tickets.filter(t => {
    if (t.status !== 'Resolved' && t.status !== 'Closed') return false;
    if (!t.resolved_at) return false;
    const resolvedDate = new Date(t.resolved_at);
    const today = new Date();
    return resolvedDate.toDateString() === today.toDateString();
  });

  // Category counts for the chart
  const categories = ['Website', 'App', 'Software', 'Hosting', 'Bug', 'Change Request'];
  const categoryCounts = categories.reduce((acc, cat) => {
    acc[cat] = tickets.filter(t => t.category === cat).length;
    return acc;
  }, {});
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  // Active SLA breach banner check
  const activeBreaches = tickets.filter(t => t.sla_breached && !['Resolved', 'Closed'].includes(t.status));

  // Immediate Action tickets filter
  const attentionTickets = tickets.filter(t => 
    !['Resolved', 'Closed'].includes(t.status) && (
      t.priority === 'Critical' ||
      t.client_is_vip ||
      t.escalation_level > 0 ||
      t.needs_approval ||
      t.assigned_agent_id === null
    )
  );

  // Connect socket events to the Live Feed
  useEffect(() => {
    if (!socket) return;

    const addActivity = (msg) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setActivities((prev) => [{ time, message: msg }, ...prev].slice(0, 10));
    };

    socket.on('ticket_created', (t) => {
      addActivity(`New ticket #${t.id} ("${t.title}") created by ${t.client_name}`);
      refetch();
    });

    socket.on('ticket_updated', (t) => {
      if (t.deleted) {
        addActivity(`Ticket #${t.id} was deleted by Admin`);
      } else {
        addActivity(`Ticket #${t.id} was updated to status ${t.status}`);
      }
      refetch();
    });

    socket.on('comment_added', (c) => {
      addActivity(`${c.user_name} left a comment on Ticket #${c.ticket_id}`);
      refetch();
    });

    socket.on('sla_breach_alert', (t) => {
      addActivity(`⚠️ Incident #${t.id} breached SLA deadline!`);
      refetch();
    });

    socket.on('ticket_assigned', (data) => {
      addActivity(`Ticket #${data.ticket_id} was assigned to agent`);
      refetch();
    });

    return () => {
      socket.off('ticket_created');
      socket.off('ticket_updated');
      socket.off('comment_added');
      socket.off('sla_breach_alert');
      socket.off('ticket_assigned');
    };
  }, [socket]);

  const getDashboardTitle = () => {
    if (user?.role === 'CLIENT') return 'Client Support Portal';
    if (user?.role === 'SUPPORT_AGENT') return 'Agent Workspace';
    if (user?.role === 'TECH_LEAD') return 'Tech Lead Desk';
    if (user?.role === 'SUPPORT_MANAGER') return 'Support Command';
    return 'Global Ops Control';
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title={getDashboardTitle()} />
        <main className="main-content">
          
          {/* Active SLA Breach Banner */}
          {activeBreaches.length > 0 && (
            <div className="sla-breach-banner-strip fade-up" style={{ animationDelay: '0.05s' }}>
              <span className="banner-alert-icon">🚨</span>
              <p className="banner-alert-text">
                <strong>SLA Breach Alert:</strong> Ticket #{activeBreaches[0].id} ("{activeBreaches[0].title}") has breached its SLA resolution deadline.
              </p>
              <button className="banner-view-btn" onClick={() => navigate(`/tickets/${activeBreaches[0].id}`)}>
                View Incident
              </button>
            </div>
          )}

          {/* Row 1: StatCards Grid */}
          <section className="dashboard-stats-grid">
            <StatCard label="Open Tickets" value={openTickets.length} variant="gold" delay={0.1} />
            <StatCard label="In Progress" value={inProgressTickets.length} delay={0.2} />
            <StatCard label="SLA Breached" value={breachedTickets.length} variant="danger" delay={0.3} />
            <StatCard label="Resolved Today" value={resolvedToday.length} variant="success" delay={0.4} />
          </section>

          {/* Manager Action Center Panel (ACC C) */}
          {['ADMIN', 'SUPPORT_MANAGER'].includes(user?.role) && (
            <section className="dashboard-row-2 mb-6" style={{ marginTop: '1.5rem', gridTemplateColumns: '1fr' }}>
              <div className="dashboard-panel-card fade-up">
                <div className="panel-card-header flex justify-between items-center">
                  <h3>⚠️ Manager Action Center</h3>
                  <span className="text-[10px] bg-red-950/80 border border-red-500/30 text-red-300 px-2 py-0.5 rounded font-bold uppercase">
                    {attentionTickets.length} Actions Required
                  </span>
                </div>
                <div className="panel-card-body">
                  {loading ? (
                    <div className="panel-loading">Syncing workspace metrics...</div>
                  ) : attentionTickets.length === 0 ? (
                    <div className="text-center py-6 text-text-muted text-xs italic">
                      ✅ No incidents require immediate manager overrides or approvals.
                    </div>
                  ) : (
                    <div className="panel-table-wrapper">
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Incident</th>
                            <th>Trigger Reason</th>
                            <th>SLA Deadline</th>
                            <th>Override Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attentionTickets.map((t) => {
                            let trigger = 'Critical Priority';
                            if (t.escalation_level > 0) trigger = `Escalated L${t.escalation_level}`;
                            else if (t.needs_approval) trigger = 'Needs Approval';
                            else if (t.client_is_vip) trigger = 'VIP Customer';
                            else if (!t.assigned_agent_id) trigger = 'Unassigned';

                            return (
                              <tr key={t.id}>
                                <td className="text-gold font-bold">#{t.id}</td>
                                <td>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-xs text-gold-light select-none">{t.title}</span>
                                    <span className="text-[10px] text-text-muted select-none">Client: {t.client_name} ({t.client_company || 'Crownridge'})</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                    t.priority === 'Critical' ? 'bg-red-950/80 border-red-500/30 text-red-300' :
                                    t.escalation_level > 0 ? 'bg-amber-950/80 border-amber-500/30 text-amber-300' :
                                    'bg-neutral-900 border-neutral-800 text-text-secondary'
                                  }`}>
                                    {trigger}
                                  </span>
                                </td>
                                <td>
                                  <span className="font-mono text-xs text-text-secondary">
                                    {new Date(t.sla_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </td>
                                <td>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <select
                                      className="quick-assign-select"
                                      value={t.assigned_agent_id || ''}
                                      onChange={(e) => handleAssign(t.id, e.target.value)}
                                    >
                                      <option value="" disabled>Assign Agent...</option>
                                      {staff.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                      ))}
                                    </select>

                                    {t.needs_approval && (
                                      <>
                                        <button 
                                          className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-green-500/10 text-green-300 border border-green-500/25 hover:bg-green-500 hover:text-black transition-all" 
                                          onClick={() => handleApprove(t.id)}
                                        >
                                          Approve
                                        </button>
                                        <button 
                                          className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500 hover:text-black transition-all" 
                                          onClick={() => handleReject(t.id)}
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}

                                    {t.escalation_level > 0 ? (
                                      <button 
                                        className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-green-950/40 text-green-300 border border-green-800/40 hover:bg-green-700 hover:text-black transition-all" 
                                        onClick={() => handleDeescalate(t.id)}
                                      >
                                        De-escalate
                                      </button>
                                    ) : (
                                      <button 
                                        className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-700 hover:text-black transition-all" 
                                        onClick={() => handleEscalate(t.id)}
                                      >
                                        Escalate
                                      </button>
                                    )}

                                    <button 
                                      className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-neutral-900 border border-neutral-800 text-text-secondary hover:bg-neutral-800" 
                                      onClick={() => navigate(`/tickets/${t.id}`)}
                                    >
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Row 2: Recent Tickets & Category Bar Chart */}
          <section className="dashboard-row-2">
            
            {/* Recent Tickets Table */}
            <div className="dashboard-panel-card fade-up" style={{ animationDelay: '0.5s' }}>
              <div className="panel-card-header">
                <h3>Recent Support Incidents</h3>
                <Link to="/tickets" className="panel-view-all">View All</Link>
              </div>
              <div className="panel-card-body">
                {loading ? (
                  <div className="panel-loading">Loading incidents...</div>
                ) : tickets.length === 0 ? (
                  <div className="panel-empty">No tickets logged in the workspace.</div>
                ) : (
                  <div className="panel-table-wrapper">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Assigned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.slice(0, 5).map((t) => (
                          <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)}>
                            <td className="text-gold">#{t.id}</td>
                            <td className="table-truncate" title={t.title}>{t.title}</td>
                            <td><PriorityBadge priority={t.priority} /></td>
                            <td><StatusBadge status={t.status} /></td>
                            <td>{t.assigned_agent_name || 'Unassigned'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Category Chart */}
            <div className="dashboard-panel-card fade-up" style={{ animationDelay: '0.6s' }}>
              <div className="panel-card-header">
                <h3>Tickets by Category</h3>
              </div>
              <div className="panel-card-body chart-panel-body">
                {categories.map((cat, idx) => {
                  const count = categoryCounts[cat] || 0;
                  const pct = maxCategoryCount > 0 ? (count / maxCategoryCount) * 100 : 0;
                  
                  const barColors = [
                    'var(--gold)',
                    'var(--purple)',
                    'var(--teal)',
                    'var(--red-soft)',
                    'var(--blue-soft)',
                    'var(--yellow-soft)'
                  ];
                  
                  return (
                    <div key={cat} className="bar-chart-row">
                      <span className="bar-chart-label">{cat}</span>
                      <div className="bar-chart-track">
                        <div
                          className="bar-chart-fill"
                          style={{
                            '--target-w': `${pct}%`,
                            backgroundColor: barColors[idx % barColors.length],
                            animation: `barGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards`
                          }}
                        ></div>
                      </div>
                      <span className="bar-chart-val">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Row 3: Live Activity Feed */}
          <section className="dashboard-row-3 fade-up" style={{ animationDelay: '0.7s' }}>
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Live Workspace Feed</h3>
              </div>
              <div className="panel-card-body">
                <div className="live-activity-list-custom">
                  {activities.length === 0 ? (
                    <p className="no-activity-text">Listening for live updates on the workspace...</p>
                  ) : (
                    activities.map((act, index) => (
                      <div key={index} className="live-activity-row-custom slide-right">
                        <span className="activity-pulse-dot"></span>
                        <div className="activity-msg-body">
                          <p className="activity-msg-content">{act.message}</p>
                          <span className="activity-msg-time">{act.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Dashboard;