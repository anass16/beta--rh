import { useState, useMemo, useCallback, useEffect } from 'react';
import { Employee } from '../types';
import { AnalyticsData, AnalyticsFilters, Absence } from '../types/pro-analytics';
import { processAnalytics } from '../utils/proAnalyticsEngine';
import { useAbsenceCache } from './useAbsenceCache';

const initialState: AnalyticsData = {
    companyKpis: { daysWorked: 0, daysAbsent: 0, avgDelay: 0, lateDays: 0, workedHolidays: 0, onTimeRate: 0 },
    departmentKpis: [],
    employeeKpis: [],
    dailyMetrics: [],
    isLoading: true,
    sourceEmployees: [],
};

export function useProAnalytics(sourceEmployees: Employee[]) {
    const today = new Date();
    const [filters, setFilters] = useState<AnalyticsFilters>({
        year: today.getFullYear(),
        month: today.getMonth(),
        departments: [],
        status: ['Active'],
        searchText: '',
        autoDeriveAbsence: false,
        countAbsenceOnHoliday: false,
    });
    
    // Use the absence cache hook to get absence data
    const { data: absenceData, isLoading: isAbsenceLoading, cacheKey } = useAbsenceCache({ year: filters.year, month: filters.month });

    const allDepartments = useMemo(() => {
        return [...new Set(sourceEmployees.map(e => e.department).filter(Boolean))].sort();
    }, [sourceEmployees]);

    const analyticsData = useMemo(() => {
        if (sourceEmployees.length === 0 || isAbsenceLoading) {
            return { ...initialState, isLoading: true };
        }
        const processedData = processAnalytics(sourceEmployees, filters, absenceData);
        return {
            ...processedData,
            isLoading: false,
            sourceEmployees,
        };
    }, [sourceEmployees, filters, absenceData, isAbsenceLoading, cacheKey]);

    // Recompute is now handled by cache invalidation, but we can keep a manual trigger if needed
    const recompute = useCallback(() => {
        // This is now less direct. The best way to force a recompute is to invalidate the cache.
        // For now, we can just depend on the cacheKey changing.
    }, []);

    return {
        filters,
        setFilters,
        analyticsData,
        allDepartments,
        recompute,
    };
}
