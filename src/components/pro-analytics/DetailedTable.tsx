import React, { useMemo } from 'react';
import { MonthlyKPI } from '../../types/pro-analytics';
import { useI18n } from '../../contexts/I18nContext';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DetailedTableProps {
  data: MonthlyKPI[];
  onRowClick: (matricule: string) => void;
}

const DetailedTable: React.FC<DetailedTableProps> = ({ data, onRowClick }) => {
  const { t } = useI18n();
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const columns = useMemo<ColumnDef<MonthlyKPI>[]>(() => [
    { accessorKey: 'matricule', header: () => t('table_col_matricule') },
    { accessorKey: 'name', header: () => t('table_col_name') },
    { accessorKey: 'department', header: () => t('table_col_department') },
    { accessorKey: 'daysWorked', header: () => t('table_col_days_worked') },
    { accessorKey: 'daysAbsent', header: () => t('table_col_days_absent') },
    { accessorKey: 'deltaDays', header: () => t('table_col_delta') },
    { accessorKey: 'totalHours', header: () => t('table_col_total_hours') },
    { accessorKey: 'avgDelayMin', header: () => t('table_col_avg_delay') },
    { accessorKey: 'lateDays', header: () => t('table_col_late_days') },
    { accessorKey: 'minorDays', header: () => t('table_col_minor_days') },
    { accessorKey: 'workedHolidays', header: () => t('table_col_holidays_worked') },
    { accessorKey: 'status', header: () => t('table_col_status') },
  ], [t]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 p-4 border-b">{t('detailed_table_title')}</h3>
        {table.getRowModel().rows.length === 0 ? (
            <div className="text-center p-8 text-gray-500">{t('no_filtered_data')}</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div
                                className="flex items-center space-x-1 cursor-pointer"
                                onClick={header.column.getToggleSortingHandler()}
                            >
                                <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                {{
                                    asc: <ChevronUp className="w-4 h-4" />,
                                    desc: <ChevronDown className="w-4 h-4" />,
                                }[header.column.getIsSorted() as string] ?? null}
                            </div>
                            </th>
                        ))}
                        </tr>
                    ))}
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(row.original.matricule)}>
                        {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                        ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
  );
};

export default DetailedTable;
