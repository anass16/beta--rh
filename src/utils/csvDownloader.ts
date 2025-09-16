export function downloadCSV(data: any[][], filename: string) {
    if (!data || data.length === 0) {
        console.warn('No data provided to downloadCSV');
        return;
    }
    const csvContent = data.map(row => 
        row.map(cell => {
            const strCell = String(cell || '');
            // Escape quotes and wrap in quotes if it contains commas, quotes, or newlines
            if (strCell.includes('"') || strCell.includes(',') || strCell.includes('\n')) {
                return `"${strCell.replace(/"/g, '""')}"`;
            }
            return strCell;
        }).join(',')
    ).join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
