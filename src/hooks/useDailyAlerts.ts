import { useState, useMemo, useCallback } from 'react';
import { Employee } from '../types';
import { DailyAlertsData, Absence } from '../types/pro-analytics';
import { generateDailyAlerts } from '../utils/proAnalyticsEngine';
import { getTodayYMD } from '../utils/holidayManager';
import { parse } from 'date-fns';
import { useAbsenceCache } from './useAbsenceCache';

const initialState: DailyAlertsData = {
  date: getTodayYMD(),
  groups: [],
  unmatchedCount: 0,
  totalAlerts: 0,
};

export function useDailyAlerts(sourceEmployees: Employee[]) {
  const [date, setDate] = useState<Date>(new Date());
  const [groupBy, setGroupBy] = useState<'department' | 'role'>('department');
  const [searchText, setSearchText] = useState('');
  
  const { data: absenceData, isLoading: isAbsenceLoading } = useAbsenceCache({ year: date.getFullYear(), month: date.getMonth() });

  const alertsData = useMemo(() => {
    if (sourceEmployees.length === 0 || isAbsenceLoading) {
      return initialState;
    }
    
    let data = generateDailyAlerts(sourceEmployees, date, absenceData, groupBy);

    if (searchText) {
        const lowerSearch = searchText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const filteredGroups = data.groups.map(group => {
            const filteredItems = group.items.filter(item => 
                item.matricule.toLowerCase().includes(lowerSearch) ||
                item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lowerSearch)
            );
            return { ...group, items: filteredItems };
        }).filter(group => group.items.length > 0);
        
        data = { ...data, groups: filteredGroups };
    }

    return data;
  }, [sourceEmployees, date, groupBy, searchText, absenceData, isAbsenceLoading]);

  const recompute = useCallback(() => {
    // Invalidation is handled by the cache hook now
  }, []);
  
  const handleDateChange = (dateString: string) => {
    // Handles YYYY-MM-DD from input[type=date]
    const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
    setDate(parsedDate);
  };

  return {
    date,
    handleDateChange,
    groupBy,
    setGroupBy,
    searchText,
    setSearchText,
    alertsData,
    recompute,
  };
}
