// src/components/UserDashboard.jsx
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import Layout from './Layout';
import Api from '../API/Api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

function UserDashboard({ onLogout }) {
  const [files, setFiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserFiles = async () => {
      try {
        const response = await Api.getUserFiles();
        const fileData = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];

        setFiles(fileData);
        setFiltered(fileData);
      } catch (err) {
        console.error('Failed to load user files:', err);
        setError('Unable to load your files.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserFiles();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFiltered(files);
    } else {
      const results = files.filter(f =>
        f.Diary_Number?.toLowerCase().includes(term) ||
        f.Case_Number?.toLowerCase().includes(term)
      );
      setFiltered(results);
    }
  }, [searchTerm, files]);

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'dd-MM-yy');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return formatInTimeZone(dateStr, 'UTC', 'dd-MM-yy - HH:mm:ss');
  };

  const groupBy = (period) => {
    const counts = {};
    files.forEach(file => {
      const date = new Date(file.ServerDateTime);
      let key = '';

      switch (period) {
        case 'daily':
          key = format(date, 'dd-MM-yy');
          break;
        case 'weekly':
          key = format(date, 'ww-yyyy');
          break;
        case 'monthly':
          key = format(date, 'MM-yyyy');
          break;
        case 'yearly':
          key = format(date, 'yyyy');
          break;
        default:
          return;
      }

      counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts).map(([key, value]) => ({
      name: key,
      count: value
    }));
  };

  const chartColors = {
    daily: '#6366f1',
    weekly: '#10b981',
    pie: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#f43f5e'],
  };

  return (
    <Layout onLogout={onLogout}>
      <div className="p-4 md:p-6 bg-white shadow rounded-lg w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-700">📁 My File Tracking History</h2>

        {/* Search */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search by Diary or Case Number"
            className="border p-2 flex-grow rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        {!loading && filtered.length > 0 && (
          <div className="hidden sm:block overflow-x-auto mb-8 w-full">
            <table className="table-auto w-full min-w-[700px] border text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Diary #</th>
                  <th className="p-2 border">Case #</th>
                  <th className="p-2 border">Branch</th>
                  <th className="p-2 border">Diary Date</th>
                  <th className="p-2 border">Case Title</th>
                  <th className="p-2 border">Receive Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(file => (
                  <tr key={file.ID} className="text-center hover:bg-gray-50">
                    <td className="border p-1">{file.Diary_Number}</td>
                    <td className="border p-1">{file.Case_Number}</td>
                    <td className="border p-1">{file.Branch}</td>
                    <td className="border p-1">{formatDateOnly(file.Institution_Date)}</td>
                    <td className="border p-1">{file.Case_Name}</td>
                    <td className="border p-1">{formatDateTime(file.ServerDateTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Colored Cards */}
        {!loading && filtered.length > 0 && (
          <div className="sm:hidden mt-4 space-y-3">
            {filtered.map((file, idx) => (
              <div
                key={file.ID}
                className={`p-3 rounded shadow text-sm border ${
                  idx % 2 === 0 ? 'bg-blue-50' : 'bg-green-50'
                }`}
              >
                {/* Diary & Case on same line */}
                <div className="flex justify-between font-medium flex-wrap">
                  <div className="flex flex-nowrap items-center">
                    <span className="font-semibold">Diary:</span>&nbsp;{file.Diary_Number}
                    <span className="font-semibold ml-2">Case:</span>&nbsp;{file.Case_Number}
                  </div>
                </div>

                {/* Case Name */}
                <div className="mt-2">
                  <span className="font-semibold">Case Name:</span> {file.Case_Name}
                </div>

                {/* Branch & Date */}
                <div className="mt-1 text-xs text-gray-700">
                  <span className="font-semibold">Branch:</span> {file.Branch} |{' '}
                  <span className="font-semibold">Diary Date:</span> {formatDateOnly(file.Institution_Date)}
                </div>

                {/* Received */}
                <div className="mt-1 text-xs text-gray-700">
                  <span className="font-semibold">Received:</span> {formatDateTime(file.ServerDateTime)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
  {['daily', 'weekly', 'monthly', 'yearly'].map((type) => {
    const isPie = type === 'monthly' || type === 'yearly';
    const data = groupBy(type);
    const chartHeight = window.innerWidth < 640 ? 250 : 300; // reduce height on mobile

    return (
      <div key={type} className="p-4 border rounded shadow bg-white">
        <h3 className="font-semibold mb-4 text-center capitalize text-lg text-gray-700">
          {type === 'monthly' ? '📅' : type === 'yearly' ? '📈' : ''} {type} Uploads
        </h3>

        <ResponsiveContainer width="100%" height={chartHeight}>
          {isPie ? (
            <PieChart>
              <Tooltip formatter={(value) => [`${value} uploads`, 'Count']} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={chartHeight / 3} // adjust radius for smaller height
                label={({ name, percent, value }) =>
                  `${name} (${value}, ${(percent * 100).toFixed(0)}%)`
                }
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColors.pie[index % chartColors.pie.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 30 }}
              barSize={window.innerWidth < 640 ? 20 : 35}
            >
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, 'Uploads']} />
              <Bar dataKey="count" fill={chartColors[type]} radius={[10, 10, 0, 0]}>
                <LabelList dataKey="count" position="top" />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  })}
</div>

      </div>
    </Layout>
  );
}

export default UserDashboard;
