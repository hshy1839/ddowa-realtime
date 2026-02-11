import { useCallback, useState } from 'react';
import { api } from '@/lib/api-client';
import { Workspace, AgentConfig, Contact, Conversation, Booking } from '@/lib/types';

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/workspace');
      setWorkspace(response.data.workspace);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { workspace, loading, fetchWorkspace };
}

export function useAgentConfig() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/agent-config');
      setConfig(response.data.config);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConfig = useCallback(async (newConfig: Partial<AgentConfig>) => {
    try {
      const response = await api.put('/agent-config', newConfig);
      setConfig(response.data.config);
      return response.data.config;
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }, []);

  return { config, loading, fetchConfig, saveConfig };
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/contacts');
      setContacts(response.data.contacts);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createContact = useCallback(
    async (contact: Partial<Contact>) => {
      try {
        const response = await api.post('/contacts', contact);
        setContacts([...contacts, response.data.contact]);
        return response.data.contact;
      } catch (error) {
        console.error('Failed to create contact:', error);
        throw error;
      }
    },
    [contacts]
  );

  return { contacts, loading, fetchContacts, createContact };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/conversations');
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { conversations, loading, fetchConversations };
}

export function useBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings');
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBooking = useCallback(
    async (booking: Partial<Booking>) => {
      try {
        const response = await api.post('/bookings', booking);
        setBookings([...bookings, response.data.booking]);
        return response.data.booking;
      } catch (error) {
        console.error('Failed to create booking:', error);
        throw error;
      }
    },
    [bookings]
  );

  return { bookings, loading, fetchBookings, createBooking };
}
