'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Karyawan', href: '/employees' },
  { name: 'Absensi', href: '/attendance' },
  { name: 'Performa', href: '/performance' },
  { name: 'Shift Kerja', href: '/shift' },
  { name: 'Penugasan Shift', href: '/assignment' },
  { name: 'Hari Libur', href: '/holidays' },
]

export default function Sidebar({ onLogout }) {
  const pathname = usePathname()
  return (
    <aside className="w-64 bg-white text-gray-900 border-r fixed h-full top-0 left-0">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-6">Admin Dashboard</h1>
        <nav className="space-y-2">
          {navigation.map(item => (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-3 py-2 rounded hover:bg-gray-800 transition ${
                pathname === item.href ? 'bg-blue-600 text-white font-bold' : ''
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <button
          onClick={onLogout}
          className="mt-8 w-full px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
