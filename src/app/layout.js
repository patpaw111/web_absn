'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Karyawan', href: '/employees' },
  { name: 'Absensi', href: '/attendance' },
  { name: 'Performa', href: '/performance' },
  { name: 'Shift Kerja', href: '/shift' },
  { name: 'Penugasan Shift', href: '/assignment' },
  { name: 'Hari Libur', href: '/holidays' },
]

export default function RootLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  // Proteksi login
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && pathname !== '/login') {
        router.replace('/login')
      }
      if (session && pathname === '/login') {
        router.replace('/')
      }
    }
    check()
  }, [pathname, router])

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <html lang="id">
      <body>
        <div className="min-h-screen flex bg-white">
          {/* Sidebar hanya jika bukan di halaman login */}
          {pathname !== '/login' && <Sidebar onLogout={handleLogout} />}
          {/* Main content */}
          <main className="flex-1 bg-white min-h-screen p-4 pl-64">
        {children}
          </main>
        </div>
      </body>
    </html>
  )
}