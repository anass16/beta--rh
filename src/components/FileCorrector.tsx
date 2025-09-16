import React, { useState, useMemo, useRef } from 'react';
import { Upload, File, Wrench, Download, Search, Filter, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { analyzeAndCorrectFile } from '../utils/fileCorrector';
import { CorrectionReport } from '../types';
import * as XLSX from 'xlsx';

const FileCorrector: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState<CorrectionReport | null>(null);
  const [standardizedData, setStandardizedData] = useState<any[][] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setReport(null);
    setStandardizedData(null);
    setError(null);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      const result = analyzeAndCorrectFile(rawData);
      setReport(result.report);
      setStandardizedData(result.standardizedData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during file processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = () => {
    if (!standardizedData) return;
    const worksheet = XLSX.utils.aoa_to_sheet(standardizedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Corrected Data');
    XLSX.writeFile(workbook, `corrected_${fileName}.xlsx`);
  };

  const { headers, filteredData, departments } = useMemo(() => {
    if (!standardizedData) return { headers: [], filteredData: [], departments: [] };

    const headers = standardizedData[0] || [];
    const data = standardizedData.slice(1);

    const nameIndex = headers.indexOf('Name');
    const departmentIndex = headers.indexOf('Department');

    const filtered = data.filter(row => {
      const name = nameIndex !== -1 ? String(row[nameIndex] || '').toLowerCase() : '';
      const department = departmentIndex !== -1 ? String(row[departmentIndex] || '') : '';
      
      const matchesSearch = nameIndex === -1 || name.includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentIndex === -1 || !departmentFilter || department === departmentFilter;
      
      return matchesSearch && matchesDepartment;
    });

    const depts = departmentIndex !== -1 
      ? [...new Set(data.map(row => String(row[departmentIndex] || '')).filter(Boolean))].sort()
      : [];

    return { headers, filteredData: filtered, departments: depts };
  }, [standardizedData, searchTerm, departmentFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Wrench className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">File Corrector & Analyzer</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Upload a messy Excel or CSV file. This tool will attempt to auto-detect the format, standardize headers, and provide a clean version for download.
        </p>
        
        <div className="relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 border-gray-300 hover:border-green-400 hover:bg-gray-50">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="space-y-4">
            <div className="flex justify-center">
              {isProcessing ? (
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              ) : (
                <Upload className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isProcessing ? 'Analyzing file...' : 'Drop a file here or browse'}
              </p>
            </div>
            <button
              onClick={handleBrowseClick}
              disabled={isProcessing}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <File className="w-4 h-4 mr-2" />
              Browse File
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-md flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {report && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Report</h3>
          <div className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
            <pre>{JSON.stringify(report, null, 2)}</pre>
          </div>
        </div>
      )}

      {standardizedData && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Corrected Data Preview</h3>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Corrected File (.xlsx)
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            {departments.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500">
            Showing {filteredData.length} of {standardizedData.length - 1} rows.
          </p>
        </div>
      )}
    </div>
  );
};

export default FileCorrector;
