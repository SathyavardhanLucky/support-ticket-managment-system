import React from 'react';
import './GoldButton.css';

export const GoldButton = ({
  children,
  onClick,
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className = ''
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'ghost': return 'btn-gold-ghost';
      case 'danger': return 'btn-gold-danger';
      case 'success': return 'btn-gold-success';
      default: return 'btn-gold-primary';
    }
  };

  return (
    <button
      type={type}
      className={`btn-gold-custom ${getVariantClass()} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div className="btn-spinner">
          <span className="dot"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

export default GoldButton;
