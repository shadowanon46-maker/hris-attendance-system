'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    endDate: new Date().toISOString().split('T')[0], // Today
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleExportCSV = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(
        `/api/admin/export?startDate=${filters.startDate}&endDate=${filters.endDate}&format=csv`
      );

      if (!res.ok) {
        throw new Error('Export gagal');
      }

      // Download file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-absensi-${filters.startDate}-${filters.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: 'success', text: 'Export CSV berhasil!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(
        `/api/admin/export?startDate=${filters.startDate}&endDate=${filters.endDate}&format=json`
      );

      if (!res.ok) {
        throw new Error('Gagal mengambil data');
      }

      const data = await res.json();
      setMessage({
        type: 'success',
        text: `Total ${data.total} record ditemukan untuk periode ${filters.startDate} - ${filters.endDate}`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Laporan & Export</h2>
          <p className="text-sm text-gray-700 mt-1">Export data absensi ke format CSV</p>
        </div>
        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-md ${message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Export Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-6">Generate Laporan Absensi</h2>

          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Filters
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    setFilters({ startDate: todayStr, endDate: todayStr });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setFilters({
                      startDate: firstDay.toISOString().split('T')[0],
                      endDate: today.toISOString().split('T')[0],
                    });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Bulan Ini
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                    setFilters({
                      startDate: lastMonth.toISOString().split('T')[0],
                      endDate: lastMonthEnd.toISOString().split('T')[0],
                    });
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                >
                  Bulan Lalu
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleViewReport}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Lihat Laporan'}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : '📥 Export CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">📊 Informasi Laporan</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Pilih periode tanggal untuk generate laporan</li>
            <li>• Export CSV dapat dibuka di Microsoft Excel atau Google Sheets</li>
            <li>• Laporan berisi data lengkap absensi karyawan</li>
            <li>• Format CSV sudah mendukung UTF-8 untuk karakter Indonesia</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
