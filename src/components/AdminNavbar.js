'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNavbar({ onLogout }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const pathname = usePathname();
  const dropdownRef = useRef(null);

  // Menu structure dengan submenu
  const menuStructure = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      href: '/dashboard/admin',
    },
    {
      id: 'employees',
      label: 'SDM',
      icon: '👥',
      submenu: [
        { label: 'Data Karyawan', href: '/dashboard/admin/employees' },
      ],
    },
    {
      id: 'shift',
      label: 'Shift & Jadwal',
      icon: '🕐',
      submenu: [
        { label: 'Master Shift', href: '/dashboard/admin/shifts' },
        { label: 'Jadwal Shift Mingguan', href: '/dashboard/admin/shift-schedule' },
      ],
    },
    {
      id: 'attendance',
      label: 'Absensi',
      icon: '📋',
      submenu: [
        { label: 'Data Absensi', href: '/dashboard/admin/attendance' },
        { label: 'Laporan & Export', href: '/dashboard/admin/reports' },
      ],
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: '⚙️',
      href: '/dashboard/admin/settings',
    },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when route changes
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  const toggleDropdown = (menuId) => {
    setOpenDropdown(openDropdown === menuId ? null : menuId);
  };

  const isActive = (href) => {
    return pathname === href;
  };

  const isMenuActive = (menu) => {
    if (menu.href) {
      return pathname === menu.href;
    }
    if (menu.submenu) {
      return menu.submenu.some((item) => pathname === item.href);
    }
    return false;
  };

  return (
    <nav className="bg-white shadow-md border-b border-gray-200" ref={dropdownRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <div className="flex items-center">
            <Link href="/dashboard/admin" className="flex items-center space-x-2">
              <span className="text-2xl">🏢</span>
              <span className="text-xl font-bold text-gray-900">HRIS Admin</span>
            </Link>
          </div>

          {/* Menu Items */}
          <div className="flex items-center space-x-1">
            {menuStructure.map((menu) => (
              <div key={menu.id} className="relative">
                {menu.submenu ? (
                  // Dropdown Menu
                  <div>
                    <button
                      onClick={() => toggleDropdown(menu.id)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isMenuActive(menu)
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span>{menu.icon}</span>
                      <span>{menu.label}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          openDropdown === menu.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Content */}
                    {openDropdown === menu.id && (
                      <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          {menu.submenu.map((item, index) => (
                            <Link
                              key={index}
                              href={item.href}
                              className={`block px-4 py-2 text-sm ${
                                isActive(item.href)
                                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Single Menu Item
                  <Link
                    href={menu.href}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(menu.href)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span>{menu.icon}</span>
                    <span>{menu.label}</span>
                  </Link>
                )}
              </div>
            ))}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="group ml-4 px-5 py-2.5 bg-linear-to-r from-red-500 to-red-600 text-white text-sm font-semibold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2"
            >
              <span className="text-base">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
