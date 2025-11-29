// src/components/MyFiles.jsx
import { useState, useEffect } from 'react';
import Layout from './Layout';
import Api from '../API/Api';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

function MyFiles({ onLogout }) {
  const [files, setFiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await Api.getMyFiles();
        const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setFiles(data);
        setFiltered(data);
      } catch (err) {
        console.error('Failed to fetch files:', err);
        setError('Unable to load your files.');
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setFiltered(files);
    } else {
      setFiltered(files.filter(f =>
        f.Diary_Number?.toLowerCase().includes(term) ||
        f.Case_Number?.toLowerCase().includes(term)
      ));
    }
  }, [searchTerm, files]);

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'dd-MM-yy');
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return formatInTimeZone(dateStr, 'UTC', 'dd-MM-yy - HH:mm:ss');
  };

  return (
    <Layout onLogout={onLogout}>
      <div className="p-4 md:p-6 bg-white shadow rounded-lg w-full">
        <h2 className="text-2xl font-bold mb-4 text-gray-700">📁 My Files</h2>

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
            <table className="table-auto w-full border text-sm">
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
                className={`p-3 rounded shadow text-sm border ${idx % 2 === 0 ? 'bg-blue-50' : 'bg-green-50'}`}
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

        {filtered.length === 0 && !loading && (
          <p className="text-gray-500 mt-4">No files found.</p>
        )}
      </div>
    </Layout>
  );
}

export default MyFiles;
