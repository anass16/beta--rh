import React from 'react';
import { AnalyticsData } from '../../types/pro-analytics';
import ReactECharts from 'echarts-for-react';
import { useI18n } from '../../contexts/I18nContext';

interface AnalyticsGridProps {
  analyticsData: Omit<AnalyticsData, 'isLoading' | 'sourceEmployees'>;
}

const AnalyticsGrid: React.FC<AnalyticsGridProps> = ({ analyticsData }) => {
  const { t } = useI18n();
  const { employeeKpis } = analyticsData;

  const workedVsRequiredOption = {
    title: { text: t('worked_vs_required_chart_title'), left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: [t('worked_days_legend'), t('required_days_legend')], bottom: 0 },
    xAxis: {
      type: 'category',
      data: employeeKpis.slice(0, 10).map(e => e.name),
      axisLabel: { interval: 0, rotate: 30 }
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('worked_days_legend'),
        type: 'bar',
        data: employeeKpis.slice(0, 10).map(e => e.daysWorked),
        itemStyle: { color: '#10B981' }
      },
      {
        name: t('required_days_legend'),
        type: 'bar',
        data: employeeKpis.slice(0, 10).map(() => 26), // Fixed at 26 for now
        itemStyle: { color: '#A5B4FC' }
      }
    ]
  };

  const latenessSplitOption = {
    title: { text: t('lateness_split_chart_title'), left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, data: [t('on_time_legend'), t('minor_delay_legend'), t('late_legend')] },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: employeeKpis.reduce((sum, e) => sum + e.onTimeDays, 0), name: t('on_time_legend') },
          { value: employeeKpis.reduce((sum, e) => sum + e.minorDays, 0), name: t('minor_delay_legend') },
          { value: employeeKpis.reduce((sum, e) => sum + e.lateDays, 0), name: t('late_legend') },
        ],
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
        }
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <ReactECharts option={workedVsRequiredOption} style={{ height: '400px' }} />
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <ReactECharts option={latenessSplitOption} style={{ height: '400px' }} />
      </div>
    </div>
  );
};

export default AnalyticsGrid;
