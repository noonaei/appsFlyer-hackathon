import { useEffect, useState } from 'react';
import api from '../services/api';

export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function reload() {
    setError('');
    setIsLoading(true);
    try {
      const list = await api.devices.list();
      setDevices(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load devices';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  return { devices, isLoading, error, reload };
}
