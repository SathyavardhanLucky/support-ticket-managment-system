import React from 'react';

export const StatusBadge = ({ status }) => {
  const getBadgeClass = () => {
    switch (status?.toLowerCase()) {
      case 'open': return 'badge-open';
      case 'in progress': return 'badge-inprogress';
      case 'on hold': return 'badge-onhold';
      case 'resolved': return 'badge-resolved';
      case 'closed': return 'badge-closed';
      default: return 'badge-open';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()} fade-in-badge`}>
      {status}
    </span>
  );
};

export default StatusBadge;
