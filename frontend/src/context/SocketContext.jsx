import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_URL } from '../config';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', ticketId = null) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, ticketId }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = SOCKET_URL;
    const newSocket = io(socketUrl, {
      query: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    newSocket.on('ticket_created', (ticket) => {
      addToast(`New Ticket Created: "${ticket.title}"`, 'info', ticket.id);
    });

    newSocket.on('ticket_updated', (ticket) => {
      if (ticket.deleted) {
        addToast(`Ticket #${ticket.id} deleted by Admin`, 'warning');
      } else {
        addToast(`Ticket #${ticket.id} updated to ${ticket.status}`, 'success', ticket.id);
      }
    });

    newSocket.on('comment_added', (comment) => {
      addToast(`New comment on Ticket #${comment.ticket_id}: "${comment.content.substring(0, 30)}..."`, 'info', comment.ticket_id);
    });

    newSocket.on('sla_breach_alert', (ticket) => {
      addToast(`⚠️ SLA BREACH ALERT: Ticket #${ticket.id} ("${ticket.title}") has breached SLA!`, 'danger', ticket.id);
    });

    newSocket.on('ticket_assigned', (data) => {
      if (user && data.assigned_agent_id === user.id) {
        addToast(`🎯 A new ticket has been assigned to you: "${data.ticket.title}"`, 'warning', data.ticket_id);
      } else {
        addToast(`Ticket #${data.ticket_id} assigned to agent`, 'info', data.ticket_id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, toasts, addToast, removeToast }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
