import React from 'react';
import PriorityBadge from './PriorityBadge';
import { useNavigate } from 'react-router-dom';

export const KanbanBoard = ({ tickets = [], onStatusChange }) => {
  const columns = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];
  const navigate = useNavigate();

  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId && onStatusChange) {
      onStatusChange(parseInt(ticketId), newStatus);
    }
  };

  const getTicketsByStatus = (status) => {
    return tickets.filter((t) => t.status === status);
  };

  return (
    <div className="kanban-board">
      {columns.map((column) => (
        <div
          key={column}
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column)}
        >
          <div className="kanban-column-header">
            <h4>{column}</h4>
            <span className="kanban-column-count">{getTicketsByStatus(column).length}</span>
          </div>
          <div className="kanban-column-cards">
            {getTicketsByStatus(column).map((ticket) => (
              <div
                key={ticket.id}
                className={`kanban-card ${ticket.sla_breached ? 'card-breached' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, ticket.id)}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              >
                <div className="kanban-card-id">#{ticket.id}</div>
                <h5 className="kanban-card-title">{ticket.title}</h5>
                <p className="kanban-card-desc">{ticket.description.substring(0, 80)}...</p>
                <div className="kanban-card-meta">
                  <span className="kanban-card-cat">{ticket.category}</span>
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <div className="kanban-card-footer">
                  <span className="kanban-card-agent">
                    👤 {ticket.assigned_agent_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            ))}
            {getTicketsByStatus(column).length === 0 && (
              <div className="kanban-empty-slot">Drop tickets here</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
