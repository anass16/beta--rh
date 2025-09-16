import { useState, useEffect, useCallback } from 'react';
import { Absence } from '../types/pro-analytics';
import { getAbsenceVersion, getAbsences } from '../services/absenceManager';

interface CacheOptions {
  year: number;
  month: number;
  matricule?: string;
  enabled?: boolean;
}

export function useAbsenceCache({ year, month, matricule, enabled = true }: CacheOptions) {
  const [data, setData] = useState<Absence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cacheKey, setCacheKey] = useState(0); // Used to force re-renders

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    // Simulate API call with a short delay to allow UI to respond
    await new Promise(resolve => setTimeout(resolve, 20));

    const serverVersion = getAbsenceVersion();
    const localData = getAbsences(year, month, matricule);
    
    setData(localData);
    setCacheKey(serverVersion.version);
    setIsLoading(false);

  }, [year, month, matricule, enabled]);

  useEffect(() => {
    fetchData();
    
    const channel = new BroadcastChannel('absences-update');
    
    const handleMessage = () => {
        fetchData();
    };

    channel.addEventListener('message', handleMessage);
    
    return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
    };

  }, [fetchData]);

  return { data, isLoading, cacheKey };
}
