import React from 'react';
import './TicketTimeline.css';

export const TicketTimeline = ({ history = [] }) => {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const getFriendlyChange = (h) => {
    const changer = h.changer_name || 'System';
    const field = h.field_changed;
    const oldVal = h.old_value || 'None';
    const newVal = h.new_value || 'None';

    if (field === 'status') {
      if (oldVal === 'None' || oldVal === '') {
        return `Ticket created in state Open by ${changer}`;
      }
      return `${changer} changed status from ${oldVal} to ${newVal}`;
    }
    if (field === 'assigned_agent_id') {
      if (oldVal === 'None' || oldVal === '') {
        return `${changer} assigned ticket to Agent #${newVal}`;
      }
      return `${changer} reassigned ticket from Agent #${oldVal} to Agent #${newVal}`;
    }
    if (field === 'sla_breached' && newVal === 'True') {
      return `⚠️ SLA Monitor: Ticket breached the SLA deadline.`;
    }
    return `${changer} updated ${field} from "${oldVal}" to "${newVal}"`;
  };

  return (
    <div className="timeline-container">
      <h3 className="timeline-title">Activity History</h3>
      {history.length === 0 ? (
        <p className="no-history">No history log found.</p>
      ) : (
        <ul className="timeline-list">
          {history.map((h) => (
            <li key={h.id} className="timeline-item">
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <span className="timeline-timestamp">{formatDate(h.changed_at)}</span>
                <p className="timeline-text">{getFriendlyChange(h)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TicketTimeline;
