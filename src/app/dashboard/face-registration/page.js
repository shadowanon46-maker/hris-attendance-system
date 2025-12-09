'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FaceCapture from '@/components/FaceCapture';

export default function FaceRegistrationPage() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredAt, setRegisteredAt] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const checkRegistrationStatus = async () => {
    try {
      const response = await fetch('/api/face/register');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to check registration status');
      }

      const data = await response.json();
      setIsRegistered(data.isRegistered);
      setRegisteredAt(data.registeredAt);
    } catch (error) {
      console.error('Error checking status:', error);
      setMessage({
        type: 'error',
        text: 'Gagal memeriksa status registrasi',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async (imageFile) => {
    setProcessing(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/face/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registrasi gagal');
      }

      setMessage({
        type: 'success',
        text: 'Wajah berhasil didaftarkan! Anda dapat menggunakan verifikasi wajah untuk absensi.',
      });
      
      setIsRegistered(true);
      setRegisteredAt(data.user.faceRegisteredAt);
      setShowCamera(false);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Terjadi kesalahan saat registrasi wajah',
      });
      setShowCamera(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus registrasi wajah?')) {
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/face/register', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus registrasi');
      }

      setMessage({
        type: 'success',
        text: 'Registrasi wajah berhasil dihapus',
      });
      
      setIsRegistered(false);
      setRegisteredAt(null);
    } catch (error) {
      console.error('Remove error:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Gagal menghapus registrasi wajah',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Kembali
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Registrasi Wajah
          </h1>
          <p className="text-gray-600 mb-6">
            Daftarkan wajah Anda untuk verifikasi absensi yang lebih aman
          </p>

          {message.text && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {isRegistered ? (
            <div className="space-y-6">
              <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">✅</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 mb-1">
                      Wajah Sudah Terdaftar
                    </h3>
                    <p className="text-sm text-green-700">
                      Wajah Anda berhasil didaftarkan pada{' '}
                      {new Date(registeredAt).toLocaleString('id-ID', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Fitur yang Tersedia:
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Verifikasi wajah saat clock-in/clock-out</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Keamanan absensi lebih terjamin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Mencegah absensi titip atau fraud</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCamera(true)}
                  disabled={processing}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  🔄 Daftar Ulang Wajah
                </button>
                <button
                  onClick={handleRemove}
                  disabled={processing}
                  className="px-6 py-2 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  🗑️ Hapus Registrasi
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">⚠️</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      Wajah Belum Terdaftar
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Daftarkan wajah Anda untuk mengaktifkan verifikasi wajah
                      saat absensi
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Cara Registrasi:
                </h3>
                <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                  <li>Klik tombol "Daftar Wajah"</li>
                  <li>Izinkan akses kamera saat diminta</li>
                  <li>Posisikan wajah Anda di tengah kamera</li>
                  <li>Pastikan pencahayaan cukup terang</li>
                  <li>Klik tombol "Ambil Foto"</li>
                  <li>Tunggu proses verifikasi selesai</li>
                </ol>
              </div>

              <button
                onClick={() => setShowCamera(true)}
                disabled={processing}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                📸 Daftar Wajah Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {showCamera && (
        <FaceCapture
          mode="register"
          onCapture={handleCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
