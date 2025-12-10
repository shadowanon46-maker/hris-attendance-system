'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminSidebar({ onLogout }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const pathname = usePathname();

  // Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  // Menu structure
  const menuStructure = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      href: '/dashboard/admin',
    },
    {
      id: 'employees',
      label: 'SDM',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      submenu: [
        { label: 'Data Karyawan', href: '/dashboard/admin/employees' },
      ],
    },
    {
      id: 'shift',
      label: 'Shift & Jadwal',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      submenu: [
        { label: 'Master Shift', href: '/dashboard/admin/shifts' },
        { label: 'Jadwal Shift Mingguan', href: '/dashboard/admin/shift-schedule' },
      ],
    },
    {
      id: 'attendance',
      label: 'Absensi',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      submenu: [
        { label: 'Data Absensi', href: '/dashboard/admin/attendance' },
        { label: 'Laporan & Export', href: '/dashboard/admin/reports' },
      ],
    },
    {
      id: 'settings',
      label: 'Pengaturan',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      submenu: [
        { label: 'Lokasi Kantor', href: '/dashboard/admin/locations' },
        { label: 'Pengaturan Umum', href: '/dashboard/admin/settings' },
      ],
    },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setOpenSubmenu(null);
    }
  };

  const toggleSubmenu = (menuId) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setOpenSubmenu(menuId);
    } else {
      setOpenSubmenu(openSubmenu === menuId ? null : menuId);
    }
  };

  const isActive = (href) => pathname === href;

  const isMenuActive = (menu) => {
    if (menu.href) return pathname === menu.href;
    if (menu.submenu) return menu.submenu.some((item) => pathname === item.href);
    return false;
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!isCollapsed && (
          <Link href="/dashboard/admin" className="flex items-center space-x-2">
            <span className="text-2xl">🏢</span>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              HRIS Admin
            </span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg hover:bg-slate-700 transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuStructure.map((menu) => (
            <li key={menu.id}>
              {menu.submenu ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(menu.id)}
                    className={`w-full flex items-center ${
                      isCollapsed ? 'justify-center' : 'justify-between'
                    } px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isMenuActive(menu)
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={isCollapsed ? menu.label : ''}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="flex-shrink-0">{menu.icon}</span>
                      {!isCollapsed && (
                        <span className="font-medium text-sm">{menu.label}</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          openSubmenu === menu.id ? 'rotate-180' : ''
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
                    )}
                  </button>
                  {/* Submenu */}
                  {!isCollapsed && openSubmenu === menu.id && (
                    <ul className="mt-1 ml-4 space-y-1 border-l-2 border-slate-700 pl-3">
                      {menu.submenu.map((item, index) => (
                        <li key={index}>
                          <Link
                            href={item.href}
                            className={`block px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                              isActive(item.href)
                                ? 'bg-indigo-500/20 text-indigo-400 font-medium'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={menu.href}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center' : ''
                  } space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(menu.href)
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={isCollapsed ? menu.label : ''}
                >
                  <span className="flex-shrink-0">{menu.icon}</span>
                  {!isCollapsed && (
                    <span className="font-medium text-sm">{menu.label}</span>
                  )}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center' : ''
          } space-x-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white font-medium text-sm hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-red-500/30`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
