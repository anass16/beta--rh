import { Employee } from '../types';
import { AnalyticsData, AnalyticsFilters, DayRollup, MonthlyKPI, ScheduleConfig, ScheduleDetails, Holiday, DayStatus, DailyAlertsData, AlertItem, AlertType, AlertGroup, Absence } from '../types/pro-analytics';
import { latenessPolicy, scheduleConfig } from '../config/attendanceConfig';
import { getHolidaysForYear } from './holidayManager';
import { eachDayOfInterval, getDaysInMonth, getDay, format, set } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Africa/Casablanca';

function resolveScheduleForEmployee(employee: Employee, config: ScheduleConfig): ScheduleDetails {
    const override = config.employee_overrides[employee.matricule];
    if (override) return { ...config.company_default, ...override };

    const deptDefault = config.department_defaults[employee.department];
    if (deptDefault) return { ...config.company_default, ...deptDefault };
    
    return config.company_default;
}

function calculateDayRollup(
    employee: Employee,
    date: Date,
    schedule: ScheduleDetails,
    holidays: Map<string, Holiday>,
    absenceForDay: Absence | undefined,
    countAbsenceOnHoliday: boolean
): DayRollup {
    const dateString = format(date, 'yyyy-MM-dd');
    
    const punchesForDay = (employee.attendanceRecords || [])
        .map(p => {
            if (!p || !p.punchDateTime) return null;
            let punchDate: Date;
            if (typeof p.punchDateTime === 'number' && p.punchDateTime > 25569) {
                 const utc_days = Math.floor(p.punchDateTime - 25569);
                 punchDate = new Date(utc_days * 86400 * 1000);
            } else {
                punchDate = new Date(p.punchDateTime);
            }
            if (isNaN(punchDate.getTime())) return null;
            return { ...p, punchDate };
        })
        .filter((p): p is NonNullable<typeof p> => {
            if (!p) return false;
            return format(toZonedTime(p.punchDate, TIMEZONE), 'yyyy-MM-dd') === dateString;
        })
        .sort((a, b) => a.punchDate.getTime() - b.punchDate.getTime());

    const holidayInfo = holidays.get(dateString);
    const isHoliday = !!holidayInfo;
    const dayOfWeek = getDay(date); // Sunday: 0, Saturday: 6
    const isWorkingSaturday = schedule.worksSaturday && dayOfWeek === 6;
    const isWeekend = !isWorkingSaturday && (dayOfWeek === 0 || dayOfWeek === 6);

    const isAbsentFromFile = !!absenceForDay;

    let hours = 0;
    const fileRecordForDay = punchesForDay.length > 0 ? punchesForDay[0] : null;
    if (fileRecordForDay?.rawHours && !isNaN(Number(fileRecordForDay.rawHours))) {
        hours = Number(fileRecordForDay.rawHours);
    } else {
        for (let i = 0; i < punchesForDay.length; i += 2) {
            const punchIn = punchesForDay[i]?.punchDate;
            const punchOut = punchesForDay[i + 1]?.punchDate;
            if (punchIn && punchOut) {
                hours += (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60);
            }
        }
    }
    hours = Math.max(0, parseFloat(hours.toFixed(2)));
    const credit = isAbsentFromFile ? 0 : hours >= latenessPolicy.halfDayThresholdHours ? 1 : (hours > 0 ? 0.5 : 0);

    let delayMin: number | undefined;
    if (fileRecordForDay?.rawLateness && !isNaN(Number(fileRecordForDay.rawLateness))) {
        delayMin = Number(fileRecordForDay.rawLateness);
    } else {
        const firstIn = punchesForDay[0]?.punchDate;
        const scheduleStartStr = isWorkingSaturday ? "09:00" : schedule.morning?.start;
        if (firstIn && scheduleStartStr) {
            const [startH, startM] = scheduleStartStr.split(':').map(Number);
            const scheduledStartTime = set(toZonedTime(date, TIMEZONE), { hours: startH, minutes: startM, seconds: 0, milliseconds: 0 });
            const delayMs = firstIn.getTime() - scheduledStartTime.getTime();
            if (delayMs > 0) {
                delayMin = Math.round(delayMs / (1000 * 60));
            }
        }
    }

    let status: DayStatus;
    if (isHoliday) {
        status = credit > 0 ? 'WorkedOnHoliday' : 'Holiday';
    } else if (isWeekend) {
        status = 'Weekend';
    } else if (isAbsentFromFile) {
        status = 'Absent';
    } else if (credit > 0) {
        if (delayMin !== undefined) {
            if (delayMin > latenessPolicy.minorDelayMinutes) status = 'Late';
            else if (delayMin > latenessPolicy.graceMinutes) status = 'MinorDelay';
            else status = 'OnTime';
        } else {
            status = 'OnTime';
        }
    } else {
        // This is a non-worked day, but not an absence from the file.
        // To avoid triggering an 'Absent' alert, we assign a neutral status.
        // The `credit` is 0, so this day will correctly not contribute to `daysWorked`.
        status = 'OnTime';
    }
    
    if (isHoliday && status === 'Absent' && !countAbsenceOnHoliday) {
        status = 'Holiday'; // Revert to Holiday if not counting as absence
    }

    return {
        matricule: employee.matricule,
        date: dateString,
        hours,
        firstIn: punchesForDay[0]?.punchDate.toISOString(),
        delayMin,
        isHoliday,
        workedHoliday: isHoliday && credit > 0,
        credit,
        isAbsentFromFile,
        absenceInfo: absenceForDay,
        punches: punchesForDay.map(({ punchDate, ...rest }) => rest),
        status,
    };
}

export function computeUserMonthlyKpi(
    employee: Employee,
    year: number,
    month: number,
    absences: Absence[],
    autoDeriveAbsence: boolean,
    countAbsenceOnHoliday: boolean
): MonthlyKPI | null {
    if (!employee) return null;

    const targetMonthDate = new Date(year, month);
    const monthPrefix = format(targetMonthDate, 'yyyy-MM');

    const hasAttendanceForMonth = (employee.attendanceRecords || []).some(rec => {
        if (!rec || !rec.punchDateTime) return false;
        let punchDate: Date;
        if (typeof rec.punchDateTime === 'number' && rec.punchDateTime > 25569) {
            const utc_days = Math.floor(rec.punchDateTime - 25569);
            punchDate = new Date(utc_days * 86400 * 1000);
        } else {
            punchDate = new Date(rec.punchDateTime);
        }
        if (isNaN(punchDate.getTime())) return false;
        const zonedPunchDate = toZonedTime(punchDate, TIMEZONE);
        return format(zonedPunchDate, 'yyyy-MM') === monthPrefix;
    });

    const hasAbsencesForMonth = absences.some(abs => abs.date.startsWith(monthPrefix));

    if (!hasAttendanceForMonth && !hasAbsencesForMonth && !autoDeriveAbsence) {
        return {
            matricule: employee.matricule,
            month: format(targetMonthDate, 'yyyy-MM'),
            name: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            status: employee.status as 'Active' | 'Inactive',
            daysWorked: 0,
            daysAbsent: 0,
            deltaDays: 0,
            totalHours: 0,
            avgDelayMin: 0,
            lateDays: 0,
            minorDays: 0,
            onTimeDays: 0,
            workedHolidays: 0,
        };
    }

    const holidays = getHolidaysForYear(year);
    const daysInMonth = getDaysInMonth(targetMonthDate);
    const interval = { start: new Date(year, month, 1), end: new Date(year, month, daysInMonth) };
    const monthDays = eachDayOfInterval(interval);
    const schedule = resolveScheduleForEmployee(employee, scheduleConfig);
    
    const absenceMap = new Map(absences.map(a => [a.date, a]));

    const empRollups = monthDays.map(day => {
        const dateString = format(day, 'yyyy-MM-dd');
        return calculateDayRollup(employee, day, schedule, holidays, absenceMap.get(dateString), countAbsenceOnHoliday);
    });

    const daysWorked = empRollups.reduce((sum, r) => sum + r.credit, 0);
    const workedHolidays = empRollups.filter(r => r.workedHoliday).length;
    const totalHours = empRollups.reduce((sum, r) => sum + r.hours, 0);
    
    let daysAbsent = empRollups.filter(r => r.isAbsentFromFile).length;

    if (autoDeriveAbsence) {
        const derivedAbsences = Math.max(0, latenessPolicy.requiredDaysPerMonth - daysWorked);
        daysAbsent = Math.max(daysAbsent, derivedAbsences);
    }

    const delays = empRollups.map(r => r.delayMin).filter((d): d is number => d !== undefined && d > 0);
    const avgDelayMin = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
    
    const lateDays = empRollups.filter(r => r.status === 'Late').length;
    const minorDays = empRollups.filter(r => r.status === 'MinorDelay').length;
    const onTimeDays = empRollups.filter(r => r.status === 'OnTime').length;

    return {
        matricule: employee.matricule,
        month: format(targetMonthDate, 'yyyy-MM'),
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        status: employee.status as 'Active' | 'Inactive',
        daysWorked,
        daysAbsent,
        deltaDays: daysWorked - latenessPolicy.requiredDaysPerMonth,
        totalHours: parseFloat(totalHours.toFixed(1)),
        avgDelayMin: parseFloat(avgDelayMin.toFixed(1)),
        lateDays,
        minorDays,
        onTimeDays,
        workedHolidays,
    };
}


export function processAnalytics(
    sourceEmployees: Employee[],
    filters: AnalyticsFilters,
    allAbsencesForPeriod: Absence[]
): Omit<AnalyticsData, 'sourceEmployees' | 'isLoading'> {
    const { year, month } = filters;

    const filteredEmployees = sourceEmployees.filter(emp => {
        const matchesDept = filters.departments.length === 0 || filters.departments.includes(emp.department);
        const matchesStatus = filters.status.length === 0 || filters.status.includes(emp.status as any);
        return matchesDept && matchesStatus;
    });

    const absencesByMatricule = new Map<string, Absence[]>();
    allAbsencesForPeriod.forEach(abs => {
        if (!absencesByMatricule.has(abs.matricule)) {
            absencesByMatricule.set(abs.matricule, []);
        }
        absencesByMatricule.get(abs.matricule)!.push(abs);
    });

    let employeeKpis: MonthlyKPI[] = filteredEmployees.map(emp => 
        computeUserMonthlyKpi(emp, year, month, absencesByMatricule.get(emp.matricule) || [], filters.autoDeriveAbsence, filters.countAbsenceOnHoliday)
    ).filter((kpi): kpi is MonthlyKPI => kpi !== null);
    
    // Search filter
    if (filters.searchText) {
        const lowerSearchText = filters.searchText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        employeeKpis = employeeKpis.filter(kpi => 
            kpi.matricule.toLowerCase().startsWith(lowerSearchText) ||
            kpi.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lowerSearchText)
        );
    }

    const companyKpis = {
        daysWorked: employeeKpis.reduce((sum, e) => sum + e.daysWorked, 0),
        daysAbsent: employeeKpis.reduce((sum, e) => sum + e.daysAbsent, 0),
        avgDelay: employeeKpis.length > 0 ? employeeKpis.reduce((sum, e) => sum + e.avgDelayMin, 0) / employeeKpis.filter(e => e.avgDelayMin > 0).length || 0 : 0,
        lateDays: employeeKpis.reduce((sum, e) => sum + e.lateDays, 0),
        workedHolidays: employeeKpis.reduce((sum, e) => sum + e.workedHolidays, 0),
        onTimeRate: 0,
    };
    
    return {
        employeeKpis,
        companyKpis,
        departmentKpis: [], // This could be implemented later
        dailyMetrics: [], // This could be implemented later
    };
}

export function generateDailyAlerts(
    employees: Employee[],
    date: Date,
    absences: Absence[],
    groupBy: 'department' | 'role' = 'department'
): DailyAlertsData {
    const dateString = format(toZonedTime(date, TIMEZONE), 'yyyy-MM-dd');
    const holidays = getHolidaysForYear(date.getFullYear());
    const alertItems: AlertItem[] = [];
    const absenceMap = new Map(absences.filter(a => a.date === dateString).map(a => [a.matricule, a]));

    employees.forEach(emp => {
        const schedule = resolveScheduleForEmployee(emp, scheduleConfig);
        const rollup = calculateDayRollup(emp, date, schedule, holidays, absenceMap.get(emp.matricule), false); // `countAbsenceOnHoliday` is false for informational alerts
        
        let reasonTag: AlertType | null = null;
        switch (rollup.status) {
            case 'Late': reasonTag = 'LATE'; break;
            case 'MinorDelay': reasonTag = 'MINOR'; break;
            case 'Absent': reasonTag = 'ABSENT'; break;
            case 'WorkedOnHoliday': reasonTag = 'HOLIDAY_WORKED'; break;
            case 'Holiday': reasonTag = 'HOLIDAY_NO_ATT'; break;
        }

        if (reasonTag === 'ABSENT' && rollup.isHoliday) {
            reasonTag = null; // Don't show absent alert on a holiday unless explicitly configured
        }

        if (reasonTag) {
            alertItems.push({
                matricule: emp.matricule,
                name: `${emp.firstName} ${emp.lastName}`,
                department: emp.department,
                delayMin: rollup.delayMin,
                hours: rollup.hours,
                reasonTag,
                note: rollup.absenceInfo?.note,
            });
        }
    });

    const grouped = new Map<string, { items: AlertItem[], totals: Record<Lowercase<AlertType>, number> }>();

    alertItems.forEach(item => {
        const key = item.department || 'Unknown';
        if (!grouped.has(key)) {
            grouped.set(key, { 
                items: [], 
                totals: { late: 0, minor: 0, absent: 0, holiday_worked: 0, holiday_no_att: 0 }
            });
        }
        const group = grouped.get(key)!;
        group.items.push(item);
        group.totals[item.reasonTag.toLowerCase() as Lowercase<AlertType>]++;
    });

    const groups: AlertGroup[] = Array.from(grouped.entries()).map(([key, value]) => ({
        key,
        ...value
    })).sort((a, b) => a.key.localeCompare(b.key));

    return {
        date: dateString,
        groups,
        unmatchedCount: 0, // Placeholder
        totalAlerts: alertItems.length
    };
}
