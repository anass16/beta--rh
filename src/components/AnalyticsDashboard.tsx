import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { Users, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { Employee, Analytics } from '../types';

interface AnalyticsDashboardProps {
  employees: Employee[];
  selectedDepartment?: string;
  dateRange?: { start: string; end: string };
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  employees,
  selectedDepartment,
  dateRange
}) => {
  const analytics = useMemo((): Analytics => {
    let filteredEmployees = employees;
    
    if (selectedDepartment) {
      filteredEmployees = employees.filter(emp => emp.department === selectedDepartment);
    }

    const totalEmployees = filteredEmployees.length;
    const totalDaysWorked = filteredEmployees.reduce((sum, emp) => sum + emp.daysWorked, 0);
    const totalDaysPossible = filteredEmployees.reduce((sum, emp) => sum + emp.totalDays, 0);
    const attendanceRate = totalDaysPossible > 0 ? (totalDaysWorked / totalDaysPossible) * 100 : 0;
    const totalAbsences = filteredEmployees.reduce((sum, emp) => sum + emp.daysOff, 0);
    
    // Calculate department performance
    const departmentMap = new Map<string, { employees: number; daysWorked: number; absences: number; totalDays: number }>();
    
    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'Unknown';
      const current = departmentMap.get(dept) || { employees: 0, daysWorked: 0, absences: 0, totalDays: 0 };
      departmentMap.set(dept, {
        employees: current.employees + 1,
        daysWorked: current.daysWorked + emp.daysWorked,
        absences: current.absences + emp.daysOff,
        totalDays: current.totalDays + emp.totalDays
      });
    });

    const departmentPerformance = Array.from(departmentMap.entries()).map(([department, data]) => ({
      department,
      employees: data.employees,
      daysWorked: data.daysWorked,
      absences: data.absences,
      attendanceRate: data.totalDays > 0 ? (data.daysWorked / data.totalDays) * 100 : 0
    }));

    return {
      totalEmployees,
      attendanceRate: parseFloat(attendanceRate.toFixed(1)),
      avgLateMinutes: 15, // Mock data - would need actual punch time analysis
      totalAbsences,
      departmentPerformance
    };
  }, [employees, selectedDepartment, dateRange]);

  if (employees.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <TrendingUp className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-500">No records available. Please upload attendance or employee files.</p>
      </div>
    );
  }

  // Chart configurations
  const departmentChartOption = {
    title: { text: 'Department Performance', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 10 },
    xAxis: {
      type: 'category',
      data: analytics.departmentPerformance.map(d => d.department)
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: 'Days Worked',
        type: 'bar',
        data: analytics.departmentPerformance.map(d => d.daysWorked),
        itemStyle: { color: '#10B981' }
      },
      {
        name: 'Absences',
        type: 'bar',
        data: analytics.departmentPerformance.map(d => d.absences),
        itemStyle: { color: '#EF4444' }
      }
    ]
  };

  const statusChartOption = {
    title: { text: 'Employee Status Breakdown', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: employees.reduce((acc, emp) => {
          const existing = acc.find(item => item.name === emp.status);
          if (existing) {
            existing.value++;
          } else {
            acc.push({ name: emp.status, value: 1 });
          }
          return acc;
        }, [] as Array<{ name: string; value: number }>),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  const employeesPerDeptOption = {
    title: { text: 'Employees per Department', left: 'center' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: analytics.departmentPerformance.map(d => d.department)
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: analytics.departmentPerformance.map(d => d.employees),
        itemStyle: { color: '#3B82F6' }
      }
    ]
  };

  const attendanceRateOption = {
    title: { text: 'Attendance Rate by Department', left: 'center' },
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    xAxis: {
      type: 'category',
      data: analytics.departmentPerformance.map(d => d.department)
    },
    yAxis: { type: 'value', max: 100, min: 0 },
    series: [
      {
        type: 'line',
        data: analytics.departmentPerformance.map(d => parseFloat(d.attendanceRate.toFixed(1))),
        itemStyle: { color: '#10B981' },
        lineStyle: { width: 3 }
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Employees</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.attendanceRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Late Minutes</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.avgLateMinutes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Absences</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.totalAbsences}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <ReactECharts option={departmentChartOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <ReactECharts option={statusChartOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <ReactECharts option={employeesPerDeptOption} style={{ height: '300px' }} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <ReactECharts option={attendanceRateOption} style={{ height: '300px' }} />
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Department Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Worked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absences
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.departmentPerformance.map((dept, index) => (
                <tr key={dept.department} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {dept.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.employees}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.daysWorked}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.absences}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {dept.attendanceRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
