import React from 'react';
import { useSocket } from '../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import './NotificationToast.css';

export const NotificationToast = () => {
  const { toasts, removeToast } = useSocket();
  const navigate = useNavigate();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container-stack">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-card toast-border-${toast.type}`}
          onClick={() => {
            if (toast.ticketId) {
              navigate(`/tickets/${toast.ticketId}`);
            }
            removeToast(toast.id);
          }}
          style={{ cursor: toast.ticketId ? 'pointer' : 'default' }}
        >
          <div className="toast-body-content">
            <span className="toast-icon-bullet">✨</span>
            <p className="toast-msg-text">{toast.message}</p>
          </div>
          <button
            className="toast-close-btn-custom"
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
