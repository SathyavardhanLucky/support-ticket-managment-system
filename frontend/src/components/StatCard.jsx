import React from 'react';
import './StatCard.css';

export const StatCard = ({ label, value, delta, variant = 'default', delay = 0.1 }) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'gold': return 'stat-gold';
      case 'danger': return 'stat-danger';
      case 'success': return 'stat-success';
      default: return 'stat-default';
    }
  };

  const renderDelta = () => {
    if (delta === undefined || delta === null) return null;
    const isPositive = typeof delta === 'number' ? delta >= 0 : !delta.startsWith('-');
    const sign = isPositive ? '▲' : '▼';
    const deltaClass = isPositive ? 'delta-positive' : 'delta-negative';

    return (
      <span className={`stat-card-delta ${deltaClass}`}>
        {sign} {Math.abs(typeof delta === 'number' ? delta : parseFloat(delta))}%
      </span>
    );
  };

  return (
    <div
      className={`stat-card-custom ${getVariantClass()}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        {renderDelta()}
      </div>
      <div className="stat-card-value">{value}</div>
    </div>
  );
};

export default StatCard;
