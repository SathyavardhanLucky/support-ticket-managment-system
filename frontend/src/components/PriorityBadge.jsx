import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const getBadgeClass = () => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'badge-critical';
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      default: return 'badge-low';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()} fade-in-badge`}>
      {priority}
    </span>
  );
};

export default PriorityBadge;
