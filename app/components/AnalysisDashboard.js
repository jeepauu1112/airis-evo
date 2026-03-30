"use client";
import { useState, useRef } from 'react';
import { Upload, Download, Eye, EyeOff } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// Utility function to parse date (handle both Excel serial numbers and string dates)
const parseDate = (dateValue) => {
  if (!dateValue && dateValue !== 0) return null;
  
  let date;
  
  // Handle Excel serial date (number)
  if (typeof dateValue === 'number') {
    // Excel stores dates as days since 1/1/1900
    const excelEpoch = new Date(1900, 0, 1);
    date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
  } else {
    // Handle string date
    const dateStr = dateValue?.toString().trim();
    if (!dateStr) return null;
    date = new Date(dateStr);
  }
  
  return isNaN(date.getTime()) ? null : date;
};

// Get ISO week with correct calculation
const getISOWeek = (date) => {
  if (!date) return null;
  
  // Create a copy to avoid modifying original
  const d = new Date(date);
  
  // Set to nearest Thursday (ISO week calculation)
  d.setDate(d.getDate() + (4 - d.getDay()));
  
  // Get the year for this week
  const year = d.getFullYear();
  
  // Calculate first day of year
  const firstDay = new Date(year, 0, 1);
  
  // Calculate number of weeks
  const weekNum = Math.ceil(((d - firstDay) / 86400000 + 1) / 7);
  
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
};

// Format date helper
const formatDate = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch {
    return '-';
  }
};

// Standardize and clean data
const cleanAndStandardizeData = (data) => {
  return data.map(row => {
    const cleaned = {};
    Object.keys(row).forEach(key => {
      const cleanKey = key.trim();
      if (cleanKey === 'Area') {
        cleaned.Area = row[key]?.toString().trim().toUpperCase()
          .replace(/UNIT1/g, 'UNIT 1')
          .replace(/UNIT2/g, 'UNIT 2') || '';
      } else if (cleanKey === 'Maint. Org.' || cleanKey === 'Maint. Org') {
        cleaned['Maint. Org.'] = row[key]?.toString().trim().toUpperCase() || '';
      } else if (cleanKey === 'Registration Date') {
        const date = parseDate(row[key]);
        cleaned.Registration_Date = date;
        cleaned.Week_Reg = date ? getISOWeek(date) : null;
      } else if (cleanKey === 'Scheduled Start') {
        const date = parseDate(row[key]);
        cleaned.Scheduled_Start = date;
        cleaned.Week_Sched = date ? getISOWeek(date) : null;
      } else {
        cleaned[cleanKey] = row[key];
      }
    });
    return cleaned;
  }).filter(row => row.Registration_Date);
};

// Parse CSV
const parseCSV = (csvText) => {
  const lines = csvText.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    data.push(row);
  }
  
  return data;
};

// Parse Excel files with dynamic import
const parseExcelFile = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      reject(new Error('XLSX library not loaded'));
    }
  });
};

// Download chart as PNG with high quality
const downloadChartAsSVG = (elementId, fileName) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      alert('Grafik tidak ditemukan');
      return;
    }

    // Simply print to PDF using browser
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(element.innerHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      // Don't close, let user decide
    }, 100);

  } catch (error) {
    console.error('Error:', error);
    alert('Simple method: Print dialog opened. Click Print > Save as PDF');
  }
};

export default function AnalysisDashboard() {
  const [data, setData] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [weekRange, setWeekRange] = useState([null, null]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const fileInputRef = useRef(null);
  const chart1Ref = useRef(null);
  const chart2Ref = useRef(null);
  const chart3Ref = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      let rawData = [];
      
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        rawData = parseCSV(text);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        rawData = await parseExcelFile(file);
      }

      if (rawData.length > 0) {
        const cleaned = cleanAndStandardizeData(rawData);
        setData(cleaned);
        
        const weeks = [...new Set(cleaned.map(r => r.Week_Reg).filter(Boolean))].sort().reverse();
        if (weeks.length > 0) {
          setSelectedWeek(weeks[0]);
          setWeekRange([weeks[weeks.length - 1], weeks[0]]);
        }
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get aggregated data for charts
  const getChartData = () => {
    if (data.length === 0) return { line: [], bars: {} };

    const validOrgs = ['HM', 'HL', 'HKI'];
    const filteredData = data.filter(r => validOrgs.includes(r['Maint. Org.']));

    // Elimination Rate Data (Line Chart)
    const weekRegMap = new Map();
    const weekSchedMap = new Map();

    filteredData.forEach(row => {
      if (row.Week_Reg) {
        weekRegMap.set(row.Week_Reg, (weekRegMap.get(row.Week_Reg) || 0) + 1);
      }
      if (row.Week_Sched) {
        weekSchedMap.set(row.Week_Sched, (weekSchedMap.get(row.Week_Sched) || 0) + 1);
      }
    });

    let lineData = [];
    const allWeeks = new Set([...weekRegMap.keys(), ...weekSchedMap.keys()]);
    allWeeks.forEach(week => {
      const reg = weekRegMap.get(week) || 0;
      const sched = weekSchedMap.get(week) || 0;
      const rate = reg > 0 ? (sched / reg * 100) : 100;
      lineData.push({
        week,
        rate: parseFloat(rate.toFixed(2)),
        reg,
        sched
      });
    });

    lineData = lineData
      .filter(d => weekRange[0] && weekRange[1] && d.week >= weekRange[0] && d.week <= weekRange[1])
      .sort((a, b) => a.week.localeCompare(b.week));

    // Get bar data for selected week
    const divisionList = ['HM', 'HL', 'HKI'];
    const areaList = ['BOP', 'UNIT 1', 'UNIT 2', 'CH', 'ASH', 'FF'];

    const getBarData = (groupCol, week, filterList) => {
      const divData = {};
      filterList.forEach(item => {
        divData[item] = { Registered: 0, Scheduled: 0, 'Reg=Sched': 0 };
      });

      const weekData = filteredData.filter(r => r.Week_Reg === week || r.Week_Sched === week);

      weekData.forEach(row => {
        if (row.Week_Reg === week) {
          const key = row[groupCol];
          if (divData[key]) divData[key].Registered++;
        }
        if (row.Week_Sched === week) {
          const key = row[groupCol];
          if (divData[key]) divData[key].Scheduled++;
        }
        if (row.Week_Reg === week && row.Registration_Date && row.Scheduled_Start &&
            row.Registration_Date.toDateString() === row.Scheduled_Start.toDateString()) {
          const key = row[groupCol];
          if (divData[key]) divData[key]['Reg=Sched']++;
        }
      });

      return Object.entries(divData).map(([label, values]) => ({
        name: label,
        ...values
      }));
    };

    return {
      line: lineData,
      divisionData: getBarData('Maint. Org.', selectedWeek, divisionList),
      areaData: getBarData('Area', selectedWeek, areaList)
    };
  };

  const chartData = getChartData();
  const weeks = [...new Set(data.map(r => r.Week_Reg).filter(Boolean))].sort().reverse();
  const tableData = data.filter(r => r.Week_Reg === selectedWeek);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#131314]">
      {/* HEADER & CONTROLS */}
      <div className="px-4 md:px-8 py-4 md:py-6 bg-white dark:bg-[#131314] border-b border-gray-200 dark:border-[#444746] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00A3AD] to-[#008a8f] text-white rounded-lg cursor-pointer hover:shadow-lg transition-shadow">
            <Upload size={18} />
            <span>Upload File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
          </label>

          {data.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-[#c4c7c5] mb-1">
                  Pilih Minggu
                </label>
                <select
                  value={selectedWeek || ''}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="px-3 py-2 bg-gray-100 dark:bg-[#2a2b2c] border border-gray-300 dark:border-[#444746] rounded-lg text-sm text-gray-900 dark:text-[#e3e3e3]"
                >
                  {weeks.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-[#c4c7c5] mb-1">
                  Rentang Tren
                </label>
                <div className="flex gap-2">
                  <select
                    value={weekRange[0] || ''}
                    onChange={(e) => setWeekRange([e.target.value, weekRange[1]])}
                    className="px-2 py-2 bg-gray-100 dark:bg-[#2a2b2c] border border-gray-300 dark:border-[#444746] rounded-lg text-sm text-gray-900 dark:text-[#e3e3e3]"
                  >
                    {weeks.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                  <span className="text-gray-600 dark:text-[#c4c7c5] font-semibold">-</span>
                  <select
                    value={weekRange[1] || ''}
                    onChange={(e) => setWeekRange([weekRange[0], e.target.value])}
                    className="px-2 py-2 bg-gray-100 dark:bg-[#2a2b2c] border border-gray-300 dark:border-[#444746] rounded-lg text-sm text-gray-900 dark:text-[#e3e3e3]"
                  >
                    {weeks.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-sm text-blue-600 dark:text-blue-400">Loading...</div>
        )}

        {data.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-[#c4c7c5]">
            Total Records: <span className="font-bold">{data.length}</span> | Filter: <span className="font-bold">{tableData.length}</span>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-8 text-gray-500 dark:text-[#8a8c8e]">
            <div className="max-w-md">
              <Upload size={48} className="mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Upload File</h3>
              <p className="text-sm">Upload file Excel (.xlsx) atau CSV dengan kolom: Registration Date, Scheduled Start, Maint. Org., Area</p>
            </div>
          </div>
        ) : (
          <div className="p-4 md:p-8 space-y-8">
            {/* CHART 1: ELIMINATION RATE */}
            <div id="chart-1" ref={chart1Ref} className="bg-gray-50 dark:bg-[#1e1f20] rounded-lg p-4 md:p-6 border border-gray-200 dark:border-[#444746]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                  1. Total Elimination Rate Trend (%)
                </h3>
                <button
                  onClick={() => downloadChartAsSVG('chart-1', 'elimination-rate-trend')}
                  className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm"
                  title="Download chart as PNG"
                >
                  <Download size={16} /> Download
                </button>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData.line}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="week" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1f20',
                      border: '1px solid #444746',
                      color: '#e3e3e3'
                    }}
                    formatter={(value) => value + '%'}
                  />
                  <Legend />
                  <ReferenceLine y={100} stroke="red" strokeDasharray="5 5" label="Target 100%" />
                  <Line type="monotone" dataKey="rate" stroke="#3b82f6" name="Rate (%)" dot={{ fill: '#3b82f6' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* CHARTS 2 & 3: BAR CHARTS */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Chart 2: Division */}
              <div id="chart-2" ref={chart2Ref} className="bg-gray-50 dark:bg-[#1e1f20] rounded-lg p-4 md:p-6 border border-gray-200 dark:border-[#444746]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    2. WO Distribution by Division ({selectedWeek})
                  </h3>
                  <button
                    onClick={() => downloadChartAsSVG('chart-2', 'wo-distribution-division')}
                    className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm"
                    title="Download chart as PNG"
                  >
                    <Download size={16} /> Download
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.divisionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1f20',
                        border: '1px solid #444746',
                        color: '#e3e3e3'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Registered" fill="#3b82f6" />
                    <Bar dataKey="Scheduled" fill="#10b981" />
                    <Bar dataKey="Reg=Sched" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 3: Area */}
              <div id="chart-3" ref={chart3Ref} className="bg-gray-50 dark:bg-[#1e1f20] rounded-lg p-4 md:p-6 border border-gray-200 dark:border-[#444746]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    3. WO Distribution by Area ({selectedWeek})
                  </h3>
                  <button
                    onClick={() => downloadChartAsSVG('chart-3', 'wo-distribution-area')}
                    className="flex items-center gap-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition text-sm"
                    title="Download chart as PNG"
                  >
                    <Download size={16} /> Download
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.areaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="name" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e1f20',
                        border: '1px solid #444746',
                        color: '#e3e3e3'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Registered" fill="#3b82f6" />
                    <Bar dataKey="Scheduled" fill="#10b981" />
                    <Bar dataKey="Reg=Sched" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-gray-50 dark:bg-[#1e1f20] rounded-lg p-4 md:p-6 border border-gray-200 dark:border-[#444746]">
              <button
                onClick={() => setShowDataTable(!showDataTable)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mb-4"
              >
                {showDataTable ? <EyeOff size={18} /> : <Eye size={18} />}
                {showDataTable ? 'Sembunyikan' : 'Tampilkan'} Tabel Detail
              </button>

              {showDataTable && tableData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-200 dark:bg-[#2a2b2c] border-b border-gray-300 dark:border-[#444746] sticky top-0">
                      <tr>
                        {Object.keys(tableData[0]).map((key) => (
                          key !== 'Week_Reg' && key !== 'Week_Sched' && (
                            <th key={key} className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-[#e3e3e3] whitespace-nowrap border-r border-gray-300 dark:border-[#444746]">
                              {key.replace(/_/g, ' ')}
                            </th>
                          )
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.slice(0, 100).map((row, idx) => (
                        <tr key={idx} className="border-b border-gray-200 dark:border-[#444746] hover:bg-gray-100 dark:hover:bg-[#2a2b2c] transition">
                          {Object.entries(row).map(([key, value]) => (
                            key !== 'Week_Reg' && key !== 'Week_Sched' && (
                              <td key={key} className="px-3 py-2 text-gray-900 dark:text-[#e3e3e3] border-r border-gray-200 dark:border-[#444746]">
                                {key === 'Registration_Date' || key === 'Scheduled_Start'
                                  ? formatDate(value)
                                  : typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value || '-')}
                              </td>
                            )
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {tableData.length > 100 && (
                    <div className="mt-2 text-sm text-gray-600 dark:text-[#c4c7c5]">
                      ... dan {tableData.length - 100} baris lainnya
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
