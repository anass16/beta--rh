import React, { useState, useRef } from 'react';
import { Upload, File, AlertCircle, CheckCircle, Info, Download } from 'lucide-react';
import { downloadCSV } from '../utils/csvDownloader';
import { useI18n } from '../contexts/I18nContext';
import { UploadSummary } from '../types';

interface FileUploadProps {
  onFileProcessed: (file: File) => Promise<UploadSummary>;
  lastUploadReports: {
    suggestions?: any[][];
    conflicts?: any[][];
    unmatched_attendance?: any[][];
  };
  accept?: string;
  multiple?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileProcessed, 
  lastUploadReports,
  accept = ".xls,.xlsx,.csv",
  multiple = false 
}) => {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string; fileName?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus({ type: 'info', message: t('upload_status_processing') });

    try {
      const summary = await onFileProcessed(file);
      const matchedCount = summary.matchedRows ?? (summary.inserted + summary.updated);
      const successMessage = t('upload_status_success')
        .replace('{fileName}', file.name)
        .replace('{matched}', String(matchedCount))
        .replace('{quarantined}', String(summary.quarantined));

      setUploadStatus({ 
        type: 'success', 
        message: successMessage,
        fileName: file.name 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('upload_status_error_unknown');
      setUploadStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFile(files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };
  const handleBrowseClick = () => fileInputRef.current?.click();

  return (
    <div className="w-full space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">{t('upload_info_matricule')}</p>
          </div>
        </div>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${isDragging ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-green-400'} ${isProcessing ? 'cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      >
        <input ref={fileInputRef} type="file" accept={accept} multiple={multiple} onChange={handleFileSelect} className="hidden" disabled={isProcessing} />
        <div className="space-y-4">
          <div className="flex justify-center">
            {isProcessing ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div> : <Upload className="h-12 w-12 text-gray-400" />}
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">{isProcessing ? t('upload_status_processing') : t('upload_drop_zone_text')}</p>
            <p className="text-sm text-gray-500 mt-1">Supports .xls, .xlsx, and .csv</p>
          </div>
          <button onClick={handleBrowseClick} disabled={isProcessing} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <File className="w-4 h-4 mr-2" /> {t('upload_btn_browse')}
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className={`p-4 rounded-md flex items-start space-x-2 ${uploadStatus.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : uploadStatus.type === 'info' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {uploadStatus.type === 'success' ? <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" /> : uploadStatus.type === 'info' ? <Info className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <div className="text-sm flex-grow"><pre className="whitespace-pre-wrap font-sans">{uploadStatus.message}</pre></div>
        </div>
      )}

      {(lastUploadReports.suggestions || lastUploadReports.conflicts || lastUploadReports.unmatched_attendance) && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 space-y-3">
            <h4 className="font-medium text-yellow-800">{t('upload_report_title')}</h4>
            <div className="flex flex-wrap gap-3">
            {lastUploadReports.suggestions && (
                <button onClick={() => downloadCSV(lastUploadReports.suggestions!, 'merge_suggestions.csv')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
                    <Download className="w-4 h-4 mr-2" /> {t('upload_btn_download_suggestions').replace('{count}', String(lastUploadReports.suggestions.length - 1))}
                </button>
            )}
            {lastUploadReports.conflicts && (
                <button onClick={() => downloadCSV(lastUploadReports.conflicts!, 'conflicts.csv')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                    <Download className="w-4 h-4 mr-2" /> {t('upload_btn_download_conflicts').replace('{count}', String(lastUploadReports.conflicts.length - 1))}
                </button>
            )}
            {lastUploadReports.unmatched_attendance && (
                <button onClick={() => downloadCSV(lastUploadReports.unmatched_attendance!, 'unmatched_attendance.csv')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                    <Download className="w-4 h-4 mr-2" /> {t('upload_btn_download_unmatched').replace('{count}', String(lastUploadReports.unmatched_attendance.length - 1))}
                </button>
            )}
            </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
