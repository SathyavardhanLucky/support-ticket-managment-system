import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';
import './EscalationCenter.css';

// Live countdown timer component for tracking SLA breach
const CountdownTimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateTimer = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) {
        setTimeLeft('BREACHED');
        return;
      }
      const mins = Math.floor((diff / 1000 / 60) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${mins}m ${secs}s`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (timeLeft === 'BREACHED') {
    return <span className="text-red font-mono font-bold text-xs uppercase">Breached</span>;
  }
  return <span className="text-yellow-soft font-mono font-bold text-xs">{timeLeft}</span>;
};

export const EscalationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [escalatedTickets, setEscalatedTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [noteContent, setNoteContent] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const [ticketsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/tickets`, config),
        axios.get(`${API_URL}/users`, config).catch(() => ({ data: [] }))
      ]);

      // Filter tickets that are escalated and not closed/resolved
      const escalated = ticketsRes.data.filter(t => t.escalation_level > 0 && !['Resolved', 'Closed'].includes(t.status));
      setEscalatedTickets(escalated);
      
      // Filter out support agents/staff
      const staffList = usersRes.data.filter(u => ['SUPPORT_AGENT', 'SUPPORT_MANAGER', 'ADMIN'].includes(u.role));
      setAgents(staffList);
      
      // Keep selected ticket refreshed
      if (selectedTicket) {
        const refreshed = escalated.find(t => t.id === selectedTicket.id);
        setSelectedTicket(refreshed || null);
      }
    } catch (err) {
      console.error("Error loading escalation center data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransferAgent = async (ticketId, agentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${ticketId}`, { assigned_agent_id: agentId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      console.error("Transfer agent error:", err);
    }
  };

  const handleDeescalate = async (ticketId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${ticketId}`, { escalation_level: 0 }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      console.error("De-escalation error:", err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim() || !selectedTicket) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/${selectedTicket.id}/comments`, {
        content: noteContent,
        is_internal: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNoteContent('');
      fetchData();
    } catch (err) {
      console.error("Error adding internal note:", err);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-layout">
          <Topbar title="Escalation Command Center" />
          <main className="main-content flex items-center justify-center h-screen">
            <div className="loading-spinner"></div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title="Escalation Command Center" />
        
        <main className="main-content grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Active Escalated Incidents</h3>
              </div>
              <div className="panel-card-body">
                {escalatedTickets.length === 0 ? (
                  <div className="text-center py-10 text-text-muted text-xs">
                    🛡️ No support incidents are currently escalated in the workspace.
                  </div>
                ) : (
                  <div className="panel-table-wrapper">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Incident Details</th>
                          <th>Level</th>
                          <th>Countdown</th>
                          <th>Assignee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {escalatedTickets.map(t => (
                          <tr
                            key={t.id}
                            className={`hover:bg-bg-card-hover/20 ${selectedTicket?.id === t.id ? 'active-row-highlight' : ''}`}
                            onClick={() => setSelectedTicket(t)}
                          >
                            <td className="text-gold font-bold">#{t.id}</td>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-semibold text-xs text-gold-light">{t.title}</span>
                                <span className="text-[10px] text-text-muted">Reason: {t.escalation_reason || 'SLA breached'}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`escalation-level-badge level-${t.escalation_level}`}>
                                L{t.escalation_level}
                              </span>
                            </td>
                            <td>
                              <CountdownTimer deadline={t.sla_deadline} />
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <select
                                className="quick-assign-select"
                                value={t.assigned_agent_id || ''}
                                onChange={(e) => handleTransferAgent(t.id, e.target.value)}
                              >
                                <option value="" disabled>Transfer...</option>
                                {agents.map(a => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="dashboard-panel-card h-full">
              <div className="panel-card-header">
                <h3>Escalation Desk</h3>
              </div>
              <div className="panel-card-body flex-1 flex flex-col justify-between">
                {selectedTicket ? (
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-gold font-bold">Incident #{selectedTicket.id}</h4>
                        <span className={`escalation-level-badge level-${selectedTicket.escalation_level}`}>
                          Level {selectedTicket.escalation_level}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-[9px] uppercase text-text-muted block">Title</span>
                        <p className="text-xs text-gold-light font-semibold">{selectedTicket.title}</p>
                      </div>

                      <div className="mb-4">
                        <span className="text-[9px] uppercase text-text-muted block">Description</span>
                        <p className="text-xs text-text-secondary leading-relaxed bg-black/40 p-2.5 rounded border border-neutral-900">
                          {selectedTicket.description}
                        </p>
                      </div>

                      <div className="mb-4 flex gap-4">
                        <div>
                          <span className="text-[9px] uppercase text-text-muted block">Priority</span>
                          <PriorityBadge priority={selectedTicket.priority} />
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-text-muted block">Status</span>
                          <StatusBadge status={selectedTicket.status} />
                        </div>
                      </div>

                      <div className="mb-4">
                        <span className="text-[9px] uppercase text-text-muted block mb-1">Internal Manager Notes</span>
                        <div className="internal-notes-log max-h-[140px] overflow-y-auto bg-black/30 border border-neutral-800/80 rounded p-2 flex flex-col gap-2">
                          {selectedTicket.comments?.filter(c => c.is_internal).length === 0 ? (
                            <span className="text-[10px] text-text-muted italic">No internal manager notes recorded.</span>
                          ) : (
                            selectedTicket.comments?.filter(c => c.is_internal).map(c => (
                              <div key={c.id} className="note-comment-item">
                                <div className="flex justify-between text-[8px] text-text-muted mb-0.5 font-bold">
                                  <span>{c.user_name}</span>
                                  <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-[10.5px] text-yellow-soft leading-tight">{c.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <form onSubmit={handleAddNote} className="mb-3 flex flex-col gap-1.5">
                        <textarea
                          className="internal-note-input"
                          placeholder="Type internal manager note..."
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          rows={2}
                        />
                        <button type="submit" className="add-note-btn">Append Note</button>
                      </form>

                      <div className="flex gap-2 pt-2 border-t border-neutral-900">
                        <button
                          className="deescalate-action-btn flex-1"
                          onClick={() => handleDeescalate(selectedTicket.id)}
                        >
                          Resolve Escalation
                        </button>
                        <button
                          className="view-ticket-action-btn"
                          onClick={() => navigate(`/tickets/${selectedTicket.id}`)}
                        >
                          Open Detail
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-text-muted text-xs italic py-10">
                    👈 Select an incident from the queue to view full escalation details, manager notes, and action overrides.
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default EscalationCenter;
