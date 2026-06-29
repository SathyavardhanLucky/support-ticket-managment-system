import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { API_URL } from '../config';

export const useTickets = (filters = {}) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket();


  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/tickets`, { params: filters });
      setTickets(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (newTicket) => {
      let matches = true;
      if (filters.status && newTicket.status !== filters.status) matches = false;
      if (filters.priority && newTicket.priority !== filters.priority) matches = false;
      if (filters.category && newTicket.category !== filters.category) matches = false;
      if (filters.severity && newTicket.severity !== filters.severity) matches = false;
      if (filters.agent_id && newTicket.assigned_agent_id !== parseInt(filters.agent_id)) matches = false;

      if (matches) {
        setTickets((prev) => {
          if (prev.some(t => t.id === newTicket.id)) return prev;
          return [newTicket, ...prev];
        });
      }
    };

    const handleTicketUpdated = (updatedTicket) => {
      if (updatedTicket.deleted) {
        setTickets((prev) => prev.filter((t) => t.id !== updatedTicket.id));
        return;
      }

      setTickets((prev) => {
        let matches = true;
        if (filters.status && updatedTicket.status !== filters.status) matches = false;
        if (filters.priority && updatedTicket.priority !== filters.priority) matches = false;
        if (filters.category && updatedTicket.category !== filters.category) matches = false;
        if (filters.severity && updatedTicket.severity !== filters.severity) matches = false;
        if (filters.agent_id && updatedTicket.assigned_agent_id !== parseInt(filters.agent_id)) matches = false;

        const exists = prev.some((t) => t.id === updatedTicket.id);

        if (exists) {
          if (matches) {
            return prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t));
          } else {
            return prev.filter((t) => t.id !== updatedTicket.id);
          }
        } else {
          if (matches) {
            return [updatedTicket, ...prev];
          }
          return prev;
        }
      });
    };

    socket.on('ticket_created', handleTicketCreated);
    socket.on('ticket_updated', handleTicketUpdated);

    return () => {
      socket.off('ticket_created', handleTicketCreated);
      socket.off('ticket_updated', handleTicketUpdated);
    };
  }, [socket, JSON.stringify(filters)]);

  return { tickets, loading, error, refetch: fetchTickets, setTickets };
};
export default useTickets;
