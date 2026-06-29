import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PriorityBadge from '../components/PriorityBadge';
import StatusBadge from '../components/StatusBadge';
import SLATimer from '../components/SLATimer';
import AIAssistantPanel from '../components/AIAssistantPanel';
import TicketTimeline from '../components/TicketTimeline';
import GoldButton from '../components/GoldButton';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './TicketDetail.css';

export const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Comment states
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Assign/action states
  const [staff, setStaff] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [showReassign, setShowReassign] = useState(false);

  // Related tickets
  const [relatedTickets, setRelatedTickets] = useState([]);

  // Fetch ticket details
  const fetchTicketDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const response = await axios.get(`${API_URL}/tickets/${id}`, config);
      setTicket(response.data);
      if (response.data.assigned_agent_id) {
        setSelectedAgentId(response.data.assigned_agent_id);
      }
      setError('');
      
      // Fetch all tickets to calculate related incidents
      const allTicketsRes = await axios.get(`${API_URL}/tickets`, config);
      const related = allTicketsRes.data.filter(t => 
        t.id !== parseInt(id) && 
        (t.client_id === response.data.client_id || t.category === response.data.category) &&
        !['Resolved', 'Closed'].includes(t.status)
      ).slice(0, 3);
      setRelatedTickets(related);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch agents list
  const fetchStaffList = async () => {
    if (!user || !['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'].includes(user.role)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const staffList = response.data.filter(u => ['SUPPORT_AGENT', 'TECH_LEAD', 'SUPPORT_MANAGER', 'ADMIN'].includes(u.role));
      setStaff(staffList);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchStaffList();
  }, [id, user]);

  // Connect socket listeners for real-time ticket detail sync
  useEffect(() => {
    if (!socket) return;

    const handleTicketUpdate = (updatedTicket) => {
      if (updatedTicket.id === parseInt(id)) {
        if (updatedTicket.deleted) {
          alert('This ticket was deleted by Admin.');
          navigate('/tickets');
        } else {
          fetchTicketDetails();
        }
      }
    };

    const handleCommentAdded = (comment) => {
      if (comment.ticket_id === parseInt(id)) {
        fetchTicketDetails();
      }
    };

    socket.on('ticket_updated', handleTicketUpdate);
    socket.on('comment_added', handleCommentAdded);

    return () => {
      socket.off('ticket_updated', handleTicketUpdate);
      socket.off('comment_added', handleCommentAdded);
    };
  }, [socket, id]);

  // Add Comment Submit
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/tickets/${id}/comments`, {
        content: commentText,
        is_internal: isInternal
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommentText('');
      setIsInternal(false);
      fetchTicketDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Resolve Ticket Action
  const handleMarkResolved = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${id}`, {
        status: 'Resolved'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTicketDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve ticket.');
    }
  };

  // Close Ticket Action
  const handleCloseTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${id}`, {
        status: 'Closed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTicketDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close ticket.');
    }
  };

  // Reassign Agent Action
  const handleReassign = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${id}`, {
        assigned_agent_id: selectedAgentId === '' ? null : parseInt(selectedAgentId)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowReassign(false);
      fetchTicketDetails();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign agent.');
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-layout">
          <Topbar title="Incident Detail" />
          <main className="main-content">
            <div className="detail-loading">Loading support incident...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-layout">
          <Topbar title="Incident Detail" />
          <main className="main-content">
            <div className="detail-error">{error || 'Incident not found.'}</div>
          </main>
        </div>
      </div>
    );
  }

  const openDate = new Date(ticket.created_at).toLocaleDateString();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title={`Incident #${ticket.id}`} />
        
        <main className="main-content grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Left Column (2 grid cells wide in xl) */}
          <div className="xl:col-span-2 flex flex-col gap-6">
            
            {/* Title card */}
            <div className="dashboard-panel-card">
              <div className="panel-card-header flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gold font-bold text-sm">Incident #{ticket.id}</span>
                  {ticket.client_is_vip && <span className="badge-vip-tag">VIP CLIENT</span>}
                  {ticket.escalation_level > 0 && (
                    <span className={`escalation-level-badge level-${ticket.escalation_level}`}>
                      Level {ticket.escalation_level} Escalation
                    </span>
                  )}
                </div>
                <StatusBadge status={ticket.status} />
              </div>
              <div className="panel-card-body pt-3">
                <h1 className="text-lg font-bold text-gold-light mb-3 leading-tight">{ticket.title}</h1>
                
                <div className="flex gap-4 mb-4">
                  <div>
                    <span className="text-[9px] uppercase text-text-muted block">Priority</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase text-text-muted block">Category</span>
                    <span className="badge-category-tag bg-neutral-900 border border-neutral-800 text-[10px] text-text-secondary px-2 py-0.5 rounded">
                      {ticket.category}
                    </span>
                  </div>
                </div>

                <div className="bg-black/30 border border-neutral-900 rounded p-4">
                  <h4 className="text-[10px] uppercase text-text-muted mb-2 font-bold">Incident Description</h4>
                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                </div>
              </div>
            </div>

            {/* Conversation Log & Chat Streams */}
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Incident Activity &amp; Communication Stream</h3>
              </div>
              <div className="panel-card-body flex flex-col gap-4">
                <div className="comments-list-wrapper max-h-[350px] overflow-y-auto bg-black/20 border border-neutral-900/60 rounded p-3 flex flex-col gap-3">
                  {ticket.comments?.length === 0 ? (
                    <p className="text-center py-6 text-text-muted text-xs italic">No comments logged. Submit a response below to update the case.</p>
                  ) : (
                    ticket.comments.map((c) => {
                      const isAgent = ['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'].includes(c.user_role);
                      const isClient = c.user_role === 'CLIENT';
                      
                      let bubbleClass = 'comment-agent bg-purple-dim/15 border-purple/20'; 
                      if (isClient) bubbleClass = 'comment-client bg-gold-glow border-gold-border'; 
                      if (c.is_internal) bubbleClass = 'comment-internal bg-red-800/10 border-red-soft/20 text-yellow-soft'; 

                      return (
                        <div key={c.id} className={`p-3 rounded border ${bubbleClass} flex flex-col gap-1`}>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-gold-light">
                              {c.user_name} ({c.user_role})
                            </span>
                            <div className="flex gap-2 items-center">
                              {c.is_internal && <span className="text-[8px] bg-red-950/80 border border-red-500/30 text-red-300 px-1 rounded font-bold uppercase">Internal</span>}
                              <span className="text-[9px] text-text-muted">
                                {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs leading-normal">{c.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comment Entry Form */}
                <form onSubmit={handleAddComment} className="flex flex-col gap-3">
                  <textarea
                    className="internal-note-input"
                    rows="3"
                    placeholder="Type comments or official customer response here..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                  ></textarea>

                  <div className="flex justify-between items-center">
                    {['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'].includes(user.role) ? (
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary select-none">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-gold cursor-pointer"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                        />
                        <span>Internal Note (Visible to Agents Only)</span>
                      </label>
                    ) : <div />}
                    <button type="submit" className="add-note-btn px-4" disabled={submittingComment}>
                      {submittingComment ? 'Sending...' : 'Submit Entry'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* AI Assistant Co-pilot Panel */}
            {['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'].includes(user.role) && (
              <div className="ai-panel-wrapper">
                <AIAssistantPanel ticket={ticket} />
              </div>
            )}

          </div>

          {/* Right Sidebar Column */}
          <div className="flex flex-col gap-6">
            
            {/* SLA countdown timer */}
            {!(ticket.status === 'Resolved' || ticket.status === 'Closed') && (
              <div className="dashboard-panel-card">
                <div className="panel-card-header">
                  <h3>SLA Target Clock</h3>
                </div>
                <div className="panel-card-body">
                  <SLATimer deadline={ticket.sla_deadline} />
                </div>
              </div>
            )}

            {/* Details and Meta */}
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Incident Metadata</h3>
              </div>
              <div className="panel-card-body flex flex-col gap-3">
                <div className="flex justify-between text-xs border-b border-neutral-900 pb-2">
                  <span className="text-text-muted">Assigned Agent</span>
                  <span className="font-semibold text-gold">{ticket.assigned_agent_name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-neutral-900 pb-2">
                  <span className="text-text-muted">Client Owner</span>
                  <span className="font-semibold text-text-primary">{ticket.client_name}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-neutral-900 pb-2">
                  <span className="text-text-muted">Email</span>
                  <span className="font-semibold text-text-secondary select-all">{ticket.client_email}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-neutral-900 pb-2">
                  <span className="text-text-muted">Severity Rating</span>
                  <span className="font-semibold text-text-primary">{ticket.severity || 'Medium'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Created On</span>
                  <span className="font-semibold text-text-primary">{openDate}</span>
                </div>
              </div>
            </div>

            {/* Client Device/Browser Metadata */}
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Environment Parameters</h3>
              </div>
              <div className="panel-card-body flex flex-col gap-3">
                <div className="flex justify-between text-xs border-b border-neutral-900 pb-2">
                  <span className="text-text-muted">Operating System</span>
                  <span className="font-semibold text-text-primary font-mono text-[10.5px]">
                    💻 {ticket.device_info || 'Unknown OS'}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-b border-neutral-900 pb-2">
                  <span className="text-text-muted">Browser Engine</span>
                  <span className="font-semibold text-text-primary font-mono text-[10.5px]">
                    🌐 {ticket.browser_info || 'Chrome (Generic)'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Client Network IP</span>
                  <span className="font-semibold text-gold font-mono text-[10.5px] select-all">
                    🔌 {ticket.ip_address || '127.0.0.1'}
                  </span>
                </div>
              </div>
            </div>

            {/* Related incidents */}
            <div className="dashboard-panel-card">
              <div className="panel-card-header">
                <h3>Related Incidents</h3>
              </div>
              <div className="panel-card-body flex flex-col gap-2">
                {relatedTickets.length === 0 ? (
                  <span className="text-xs text-text-muted italic">No related tickets found.</span>
                ) : (
                  relatedTickets.map(r => (
                    <div 
                      key={r.id} 
                      className="p-2.5 rounded border border-neutral-900 bg-black/20 hover:border-gold-border/60 hover:bg-bg-card-hover/20 cursor-pointer transition-all"
                      onClick={() => navigate(`/tickets/${r.id}`)}
                    >
                      <div className="flex justify-between items-center text-[10px] mb-1">
                        <span className="text-gold font-bold">#{r.id}</span>
                        <PriorityBadge priority={r.priority} />
                      </div>
                      <h4 className="text-xs text-gold-light font-semibold truncate">{r.title}</h4>
                      <div className="flex justify-between items-center text-[9px] text-text-muted mt-1.5">
                        <span>Category: {r.category}</span>
                        <span>{r.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit Log Timeline */}
            <div className="dashboard-panel-card">
              <TicketTimeline history={ticket.history} />
            </div>

            {/* Operation Controls */}
            {['ADMIN', 'SUPPORT_MANAGER', 'TECH_LEAD', 'SUPPORT_AGENT'].includes(user.role) && (
              <div className="dashboard-panel-card">
                <div className="panel-card-header">
                  <h3>Operations Control</h3>
                </div>
                <div className="panel-card-body flex flex-col gap-2.5">
                  
                  {ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
                    <button className="deescalate-action-btn w-full" onClick={handleMarkResolved}>
                      Mark Incident Resolved
                    </button>
                  )}

                  <button className="gold-action-btn ghost w-full" onClick={() => setShowReassign(!showReassign)}>
                    Reassign Operations Ownership
                  </button>

                  {showReassign && (
                    <div className="bg-black/30 border border-neutral-900 p-2.5 rounded flex flex-col gap-2 mt-1">
                      <select
                        className="quick-assign-select w-full"
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {staff.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.role.replace('SUPPORT_', '')})</option>
                        ))}
                      </select>
                      <button className="add-note-btn w-full" onClick={handleReassign}>
                        Confirm Reassignment
                      </button>
                    </div>
                  )}

                  {ticket.status !== 'Closed' && (
                    <button className="view-ticket-action-btn w-full border-red-500/20 text-red-300 hover:bg-red-950/20" onClick={handleCloseTicket}>
                      Close Incident
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

        </main>
      </div>
    </div>
  );
};

export default TicketDetail;
