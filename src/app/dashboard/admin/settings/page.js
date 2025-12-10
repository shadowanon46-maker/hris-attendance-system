'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    office_lat: '',
    office_lng: '',
    office_radius: '',
    office_name: '',
    office_address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentLocation, setCurrentLocation] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setMessage({ type: '', text: '' });
    if (!navigator.geolocation) {
      setMessage({ type: 'error', text: 'Geolocation tidak didukung browser Anda' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(8);
        const lng = position.coords.longitude.toFixed(8);
        setCurrentLocation({ lat, lng });
        setSettings({
          ...settings,
          office_lat: lat,
          office_lng: lng,
        });
        setMessage({ type: 'success', text: 'Lokasi berhasil didapatkan!' });
      },
      (error) => {
        let errorMsg = 'Gagal mendapatkan lokasi';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Izin lokasi ditolak. Mohon aktifkan izin lokasi.';
        }
        setMessage({ type: 'error', text: errorMsg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update gagal');
      }

      setMessage({ type: 'success', text: data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar onLogout={handleLogout} />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pengaturan Lokasi Kantor</h2>
          <p className="text-sm text-gray-700 mt-1">Atur koordinat GPS dan radius area kantor</p>
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

        {/* Settings Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Pengaturan Lokasi Kantor</h2>
            <p className="text-sm text-gray-700">
              Atur koordinat GPS dan radius area kantor untuk validasi absensi karyawan
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Info */}
            <div>
              <h3 className="text-md font-medium mb-4">Informasi Perusahaan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nama Perusahaan
                  </label>
                  <input
                    type="text"
                    value={settings.office_name}
                    onChange={(e) => setSettings({ ...settings, office_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="PT. HRIS Indonesia"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alamat Kantor
                  </label>
                  <textarea
                    value={settings.office_address}
                    onChange={(e) => setSettings({ ...settings, office_address: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="Jakarta, Indonesia"
                  />
                </div>
              </div>
            </div>

            {/* GPS Coordinates */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium">Koordinat GPS Kantor</h3>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                >
                  📍 Gunakan Lokasi Saat Ini
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.office_lat}
                    onChange={(e) => setSettings({ ...settings, office_lat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="-6.200000"
                  />
                  <p className="text-xs text-gray-600 mt-1">Range: -90 hingga 90</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.office_lng}
                    onChange={(e) => setSettings({ ...settings, office_lng: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    placeholder="106.816666"
                  />
                  <p className="text-xs text-gray-600 mt-1">Range: -180 hingga 180</p>
                </div>
              </div>

              {currentLocation && (
                <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                  ✓ Lokasi terdeteksi: {currentLocation.lat}, {currentLocation.lng}
                </div>
              )}
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Radius Area Kantor (meter) *
              </label>
              <input
                type="number"
                required
                min="10"
                max="1000"
                value={settings.office_radius}
                onChange={(e) => setSettings({ ...settings, office_radius: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                placeholder="100"
              />
              <p className="text-xs text-gray-600 mt-1">
                Karyawan harus berada dalam radius ini untuk absensi (10-1000 meter)
              </p>
            </div>

            {/* Map Preview Link */}
            {settings.office_lat && settings.office_lng && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-700 mb-2">Preview Lokasi:</p>
                <a
                  href={`https://www.google.com/maps?q=${settings.office_lat},${settings.office_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 text-sm underline"
                >
                  🗺️ Buka di Google Maps
                </a>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={fetchSettings}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2 text-yellow-900">⚠️ Penting</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Perubahan akan langsung mempengaruhi validasi absensi karyawan</li>
            <li>• Pastikan koordinat GPS sudah benar sebelum menyimpan</li>
            <li>• Gunakan fitur "Gunakan Lokasi Saat Ini" jika Anda berada di kantor</li>
            <li>• Radius yang terlalu kecil dapat menyulitkan karyawan untuk absen</li>
            <li>• Koordinat dapat dicek di Google Maps</li>
          </ul>
        </div>

        {/* How to Find Coordinates */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2 text-blue-900">📍 Cara Mendapatkan Koordinat</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Buka Google Maps di browser</li>
            <li>Cari alamat kantor Anda</li>
            <li>Klik kanan pada lokasi → pilih "What's here?"</li>
            <li>Koordinat akan muncul di bagian bawah (contoh: -6.200000, 106.816666)</li>
            <li>Copy koordinat tersebut ke form di atas</li>
          </ol>
        </div>
      </main>
    </div>
  );
}
