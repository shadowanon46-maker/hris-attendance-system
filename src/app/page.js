import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-500 to-purple-600">
      <div className="text-center text-white px-4">
        <h1 className="text-5xl font-bold mb-4">
          HRIS Dashboard
        </h1>
        <p className="text-xl mb-8">
          Sistem Absensi Karyawan Berbasis GPS
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg shadow-lg hover:bg-gray-100 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-indigo-600 transition"
          >
            Register
          </Link>
        </div>
        <div className="mt-12 text-sm">
          <p className="mb-2">Demo Credentials:</p>
          <p>Admin: admin@hris.com / admin123</p>
          <p>Employee: employee1@hris.com / employee123</p>
        </div>
      </div>
    </div>
  );
}
