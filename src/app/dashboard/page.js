'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({ present: 0, late: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

  useEffect(() => {
    fetchUserData();
    fetchTodayAttendance();
    fetchWeeklySchedule();
    fetchMonthlyStats();
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        console.error('Failed to fetch user, status:', res.status);
        router.push('/login');
        return;
      }
      const data = await res.json();
      console.log('User data received:', data);
      
      if (!data.user) {
        console.error('No user data in response');
        setMessage({ type: 'error', text: 'Data user tidak ditemukan' });
        setLoading(false);
        return;
      }
      
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data user' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/attendance/today?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setAttendance(data.attendance);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchWeeklySchedule = async () => {
    try {
      const res = await fetch('/api/employee/my-schedule');
      if (res.ok) {
        const data = await res.json();
        setWeeklySchedule(data.schedules || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const res = await fetch('/api/employee/monthly-stats');
      if (res.ok) {
        const data = await res.json();
        setMonthlyStats(data.stats || { present: 0, late: 0, absent: 0 });
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung browser Anda'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let errorMsg = 'Gagal mendapatkan lokasi';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Izin lokasi ditolak. Mohon aktifkan izin lokasi.';
          }
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleClockIn = async (type) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const coords = await getLocation();

      const endpoint = type === 'in' ? '/api/attendance/clock-in' : '/api/attendance/clock-out';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coords),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan absensi');
      }

      setMessage({ type: 'success', text: data.message });
      fetchTodayAttendance();
      fetchMonthlyStats(); // Update stats after attendance
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Gagal memuat data user</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard Karyawan</h1>
              <p className="text-sm text-gray-600 mt-1">
                Selamat datang, <span className="font-semibold text-indigo-600">{user?.fullName || 'User'}</span>
                {user && <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{user.nip}</span>}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium shadow-sm hover:shadow"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl shadow-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center">
              <span className="text-lg mr-2">{message.type === 'success' ? '✓' : '✗'}</span>
              {message.text}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Info & Schedule */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <span className="text-2xl mr-3">👤</span>
                  Informasi Akun
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold">📋</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">NIP</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{user?.nip}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600 font-semibold">✉️</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Email</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">👔</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Role</p>
                      <p className="text-base font-semibold text-gray-900 mt-1 capitalize">{user?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600 font-semibold">
                        {user?.isActive ? '✓' : '✗'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</p>
                      <p className="text-base font-semibold mt-1">
                        {user?.isActive ? (
                          <span className="text-green-600">Aktif</span>
                        ) : (
                          <span className="text-red-600">Tidak Aktif</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Schedule Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-linear-to-r from-blue-500 to-cyan-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <span className="text-2xl mr-3">📅</span>
                  Jadwal Shift Minggu Ini
                </h2>
              </div>
              <div className="p-6">
                {weeklySchedule.length > 0 ? (
                  <div className="space-y-3">
                    {weeklySchedule.map((schedule) => {
                      const scheduleDate = new Date(schedule.date);
                      const dayName = scheduleDate.toLocaleDateString('id-ID', { weekday: 'long' });
                      const dateStr = scheduleDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                      const isToday = schedule.date === new Date().toISOString().split('T')[0];
                      
                      return (
                        <div
                          key={schedule.id}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            isToday 
                              ? 'border-indigo-500 bg-linear-to-r from-indigo-50 to-purple-50 shadow-md' 
                              : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-lg">{isToday ? '📍' : '📆'}</span>
                                <p className={`font-semibold ${isToday ? 'text-indigo-900' : 'text-gray-900'}`}>
                                  {dayName}
                                </p>
                                {isToday && (
                                  <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-medium">
                                    Hari Ini
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{dateStr}</p>
                              {schedule.shift ? (
                                <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-base">🕐</span>
                                    <span className="font-semibold text-gray-900">{schedule.shift.name}</span>
                                  </div>
                                  <p className="text-sm text-gray-700 ml-6">
                                    {schedule.shift.startTime} - {schedule.shift.endTime}
                                  </p>
                                  {schedule.shift.description && (
                                    <p className="text-xs text-gray-600 mt-2 ml-6 italic">{schedule.shift.description}</p>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                                  <p className="text-sm text-gray-500 italic">Tidak ada jadwal shift</p>
                                </div>
                              )}
                              {schedule.notes && (
                                <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                  <p className="text-xs text-yellow-800">
                                    <span className="font-semibold">Catatan:</span> {schedule.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <p className="text-gray-500 font-medium">Belum ada jadwal shift untuk minggu ini</p>
                    <p className="text-sm text-gray-400 mt-2">Silakan hubungi admin untuk pengaturan jadwal</p>
                  </div>
                )}
              </div>
            </div>

            {/* Shift Info from User Default (fallback) */}
            {weeklySchedule.length === 0 && (
              <div className="bg-linear-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-5">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">
                      Belum ada jadwal shift untuk minggu ini
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Silakan hubungi admin untuk pengaturan jadwal shift mingguan.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Attendance & Quick Actions */}
          <div className="space-y-6">
            {/* Clock In/Out Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-linear-to-r from-green-500 to-emerald-600 px-6 py-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <span className="text-2xl mr-3">⏰</span>
                  Absensi Hari Ini
                </h2>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <p className="text-sm text-gray-500 mb-2">Waktu Saat Ini</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleClockIn('in')}
                    disabled={loading || attendance?.checkInTime}
                    className="w-full py-4 px-6 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span className="text-xl">{attendance?.checkInTime ? '✓' : '▶️'}</span>
                    <span>{loading ? 'Memproses...' : attendance?.checkInTime ? 'Sudah Clock In' : 'Clock In'}</span>
                  </button>
                  
                  <button
                    onClick={() => handleClockIn('out')}
                    disabled={loading || !attendance?.checkInTime || attendance?.checkOutTime}
                    className="w-full py-4 px-6 bg-linear-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <span className="text-xl">{attendance?.checkOutTime ? '✓' : '⏹️'}</span>
                    <span>{loading ? 'Memproses...' : attendance?.checkOutTime ? 'Sudah Clock Out' : 'Clock Out'}</span>
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Status Absensi</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Masuk</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {attendance?.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Keluar</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {attendance?.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Info Card */}
            <div className="bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">💡</div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Tips Hari Ini</h3>
                  <p className="text-sm text-indigo-100 leading-relaxed">
                    Jangan lupa untuk clock in saat tiba dan clock out saat pulang. Pastikan Anda mengikuti jadwal shift yang telah ditentukan.
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Statistik Bulan Ini</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">✓</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Hadir</p>
                      <p className="text-2xl font-bold text-gray-900">{monthlyStats.present}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">⏰</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Terlambat</p>
                      <p className="text-2xl font-bold text-gray-900">{monthlyStats.late}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">✗</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Tidak Hadir</p>
                      <p className="text-2xl font-bold text-gray-900">{monthlyStats.absent}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
