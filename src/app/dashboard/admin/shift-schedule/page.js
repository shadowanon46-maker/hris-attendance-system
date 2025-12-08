'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';

export default function ShiftSchedulePage() {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Week selector
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weekDates, setWeekDates] = useState([]);
  
  // Schedule data (nested object: {userId: {date: shiftId}})
  const [scheduleData, setScheduleData] = useState({});
  
  const router = useRouter();

  useEffect(() => {
    // Set default ke minggu ini
    const today = new Date();
    const monday = getMonday(today);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    setStartDate(formatDate(monday));
    setEndDate(formatDate(sunday));
    generateWeekDates(monday);
    
    fetchEmployees();
    fetchShifts();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchSchedules();
    }
  }, [startDate, endDate]);

  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const generateWeekDates = (monday) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(date.getDate() + i);
      dates.push(formatDate(date));
    }
    setWeekDates(dates);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/admin/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await fetch('/api/admin/shifts');
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(
        `/api/admin/shift-schedules?startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
        
        // Convert to nested object for easy access
        const scheduleMap = {};
        data.schedules.forEach((schedule) => {
          if (!scheduleMap[schedule.userId]) {
            scheduleMap[schedule.userId] = {};
          }
          scheduleMap[schedule.userId][schedule.scheduleDate] = schedule.shiftId;
        });
        setScheduleData(scheduleMap);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleShiftChange = (userId, date, shiftId) => {
    setScheduleData((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [date]: shiftId || null,
      },
    }));
  };

  const handleSaveSchedules = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert scheduleData to array format
      const schedulesToSave = [];
      Object.keys(scheduleData).forEach((userId) => {
        Object.keys(scheduleData[userId]).forEach((date) => {
          const shiftId = scheduleData[userId][date];
          if (shiftId) {
            schedulesToSave.push({
              userId: parseInt(userId),
              shiftId: parseInt(shiftId),
              scheduleDate: date,
            });
          }
        });
      });

      if (schedulesToSave.length === 0) {
        setMessage({ type: 'error', text: 'Tidak ada jadwal untuk disimpan' });
        return;
      }

      const res = await fetch('/api/admin/shift-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules: schedulesToSave }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setMessage({ type: 'success', text: data.message });
      fetchSchedules();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const changeWeek = (direction) => {
    const current = new Date(startDate);
    current.setDate(current.getDate() + (direction * 7));
    const newMonday = getMonday(current);
    const newSunday = new Date(newMonday);
    newSunday.setDate(newSunday.getDate() + 6);
    
    setStartDate(formatDate(newMonday));
    setEndDate(formatDate(newSunday));
    generateWeekDates(newMonday);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[date.getDay()];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Penjadwalan Shift Mingguan</h2>
          <p className="text-sm text-gray-700 mt-1">Atur jadwal shift karyawan untuk minggu tertentu</p>
        </div>
        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Week Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Jadwal Shift Mingguan</h2>
              <p className="text-sm text-gray-700">
                {new Date(startDate).toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })} - {new Date(endDate).toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => changeWeek(-1)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                ← Minggu Lalu
              </button>
              <button
                onClick={() => changeWeek(1)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Minggu Depan →
              </button>
            </div>
          </div>

          <button
            onClick={handleSaveSchedules}
            disabled={saving}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : '💾 Simpan Semua Jadwal'}
          </button>
        </div>

        {/* Schedule Table */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase sticky left-0 bg-gray-50">
                  Karyawan
                </th>
                {weekDates.map((date) => (
                  <th
                    key={date}
                    className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase"
                  >
                    <div>{getDayName(date)}</div>
                    <div className="font-normal">
                      {new Date(date).getDate()}/{new Date(date).getMonth() + 1}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.filter(e => e.role !== 'admin').map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    <div>{employee.fullName}</div>
                    <div className="text-xs text-gray-600">{employee.nip}</div>
                  </td>
                  {weekDates.map((date) => (
                    <td key={date} className="px-2 py-2">
                      <select
                        value={scheduleData[employee.id]?.[date] || ''}
                        onChange={(e) =>
                          handleShiftChange(employee.id, date, e.target.value)
                        }
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
                      >
                        <option value="">-</option>
                        {shifts.map((shift) => (
                          <option key={shift.id} value={shift.id}>
                            {shift.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Petunjuk:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Pilih shift untuk setiap karyawan pada setiap hari</li>
            <li>• Pilih "-" untuk tidak memberikan shift (libur)</li>
            <li>• Klik "Simpan Semua Jadwal" setelah selesai mengatur</li>
            <li>• Gunakan tombol navigasi untuk berpindah minggu</li>
            <li>• Jadwal yang tersimpan akan digunakan untuk validasi absensi</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
