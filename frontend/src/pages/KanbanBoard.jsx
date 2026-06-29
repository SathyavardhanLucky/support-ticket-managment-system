import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import PriorityBadge from '../components/PriorityBadge';
import SLATimer from '../components/SLATimer';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import './KanbanBoard.css';

export const KanbanBoard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { tickets, loading, error, refetch } = useTickets();
  const navigate = useNavigate();

  // Columns lists
  const columns = [
    { title: 'Open', status: 'Open', colorClass: 'col-gold' },
    { title: 'In Progress', status: 'In Progress', colorClass: 'col-purple' },
    { title: 'On Hold', status: 'On Hold', colorClass: 'col-amber' },
    { title: 'Resolved', status: 'Resolved', colorClass: 'col-green' }
  ];

  // Drag over state to highlight columns
  const [dragOverCol, setDragOverCol] = useState(null);

  // Close Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingDrop, setPendingDrop] = useState(null); // { ticketId, targetStatus }

  // Sync kanban card status in real-time
  useEffect(() => {
    if (!socket) return;
    
    const handleTicketUpdate = () => {
      refetch();
    };

    socket.on('ticket_updated', handleTicketUpdate);
    socket.on('ticket_created', handleTicketUpdate);

    return () => {
      socket.off('ticket_updated', handleTicketUpdate);
      socket.off('ticket_created', handleTicketUpdate);
    };
  }, [socket]);

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('text/plain', ticketId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, status) => {
    e.preventDefault();
    setDragOverCol(status);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const ticketId = e.dataTransfer.getData('text/plain');
    if (!ticketId) return;

    if (targetStatus === 'Resolved') {
      // Prompt confirmation before moving to Resolved
      setPendingDrop({ ticketId, targetStatus });
      setShowConfirmModal(true);
    } else {
      await updateTicketStatus(ticketId, targetStatus);
    }
  };

  const updateTicketStatus = async (ticketId, targetStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_URL}/tickets/${ticketId}`, 
        { status: targetStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      refetch();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update ticket status.');
    }
  };

  const confirmDropAction = async () => {
    if (pendingDrop) {
      await updateTicketStatus(pendingDrop.ticketId, pendingDrop.targetStatus);
    }
    setShowConfirmModal(false);
    setPendingDrop(null);
  };

  const cancelDropAction = () => {
    setShowConfirmModal(false);
    setPendingDrop(null);
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-layout">
        <Topbar title="Kanban Operations" />
        
        <main className="main-content">
          {loading ? (
            <div className="kanban-loading">Loading Kanban board...</div>
          ) : (
            <div className="kanban-board-grid">
              {columns.map((col) => {
                const colTickets = tickets.filter(t => t.status === col.status);
                const isOver = dragOverCol === col.status;

                return (
                  <div
                    key={col.status}
                    className={`kanban-column ${col.colorClass} ${isOver ? 'drag-over-highlight' : ''}`}
                    onDragOver={(e) => handleDragOver(e, col.status)}
                    onDragEnter={(e) => handleDragEnter(e, col.status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.status)}
                  >
                    <div className="kanban-column-header">
                      <h4>{col.title}</h4>
                      <span className="column-count-badge">{colTickets.length}</span>
                    </div>

                    <div className="kanban-column-body">
                      {colTickets.length === 0 ? (
                        <div className="column-empty-placeholder">Drop incidents here</div>
                      ) : (
                        colTickets.map((t) => {
                          const isVip = t.client_is_vip;
                          const hasEscalation = t.escalation_level > 0;
                          
                          return (
                            <div
                              key={t.id}
                              className="kanban-card-wrapper"
                              draggable
                              onDragStart={(e) => handleDragStart(e, t.id)}
                              onClick={() => navigate(`/tickets/${t.id}`)}
                            >
                              <div className="kanban-card dark-glass-card">
                                <div className="kanban-card-top flex justify-between items-center mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="kanban-card-id font-bold text-gold">#{t.id}</span>
                                    {isVip && <span className="badge-vip">VIP</span>}
                                    {hasEscalation && (
                                      <span className={`escalation-level-badge level-${t.escalation_level}`}>
                                        L{t.escalation_level}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] text-text-muted">
                                    {new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                
                                <h5 className="kanban-card-title text-xs font-semibold text-gold-light mb-1.5 leading-tight">
                                  {t.title}
                                </h5>

                                <div className="text-[10px] text-text-secondary mb-2 bg-black/20 p-1.5 rounded border border-neutral-900/60">
                                  <div className="font-semibold">{t.client_name}</div>
                                  <div className="text-text-muted text-[9px]">{t.client_company || 'Crownridge Client'}</div>
                                </div>

                                <div className="flex justify-between items-center text-[9px] border-t border-neutral-800/80 pt-2">
                                  <span className="text-text-muted bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                    {t.category}
                                  </span>
                                  
                                  <div className="flex items-center gap-2">
                                    {t.comments?.length > 0 && (
                                      <span className="text-text-muted flex items-center gap-0.5" title="Comments count">
                                        💬 {t.comments.length}
                                      </span>
                                    )}
                                    <PriorityBadge priority={t.priority} />
                                  </div>
                                </div>

                                {!(t.status === 'Resolved' || t.status === 'Closed') && (
                                  <div className="kanban-sla-mini mt-2 text-right">
                                    <SLATimer deadline={t.sla_deadline} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Drag Confirmation Modal */}
          {showConfirmModal && (
            <div className="kanban-confirm-overlay">
              <div className="kanban-confirm-modal">
                <h4 className="text-gold font-bold text-sm mb-2">⚠️ Confirm Status Change</h4>
                <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                  Are you sure you want to transition Ticket #{pendingDrop?.ticketId} to <strong>Resolved</strong>? 
                  This will log a resolution timestamp and notify the customer.
                </p>
                <div className="flex gap-3 justify-end">
                  <button className="confirm-btn-modal" onClick={confirmDropAction}>Confirm</button>
                  <button className="cancel-btn-modal" onClick={cancelDropAction}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default KanbanBoard;
