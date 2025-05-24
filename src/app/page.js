'use client'


import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState([
    { name: 'Total Karyawan', value: '0' },
    { name: 'Hadir Hari Ini', value: '0' },
    { name: 'Terlambat Hari Ini', value: '0' },
    { name: 'Tidak Hadir Hari Ini', value: '0' },
  ])

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      // Cek hari libur
      const { data: libur } = await supabase.from('hari_libur').select('*').eq('tanggal', today).maybeSingle()
      // Total karyawan
      const { count: totalKaryawan } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'employee')
      if (libur) {
        setStats([
          { name: 'Total Karyawan', value: totalKaryawan || 0 },
          { name: 'Hadir Hari Ini', value: '-' },
          { name: 'Terlambat Hari Ini', value: '-' },
          { name: 'Tidak Hadir Hari Ini', value: '-' },
        ])
        setLoading(false)
        return
      }
      // Ambil penugasan shift hari ini
      const { data: penugasan } = await supabase
        .from('penugasan_shift')
        .select('user_id, shift_kerja:shift_id (jam_mulai)')
        .lte('tanggal_mulai', today)
        .gte('tanggal_selesai', today)
      const shiftMap = {}
      for (const p of penugasan || []) {
        shiftMap[p.user_id] = p.shift_kerja?.jam_mulai || '08:00'
      }
      // Ambil absensi hari ini
      const { data: att } = await supabase
        .from('attendance')
        .select('id, user_id, check_in, status')
        .gte('check_in', today + 'T00:00:00+00:00')
        .lte('check_in', today + 'T23:59:59+00:00')
      // Hitung statistik
      let hadir = 0, terlambat = 0, tidakHadir = 0
      const hadirUser = new Set()
      const terlambatUser = new Set()
      const izinSakitUser = new Set()
      for (const a of att || []) {
        if (a.status === 'izin' || a.status === 'sakit') {
          izinSakitUser.add(a.user_id)
          hadirUser.add(a.user_id)
        } else if (a.check_in) {
          const jamShift = shiftMap[a.user_id] || '08:00'
          const tanggal = a.check_in.slice(0, 10)
          const jamMasuk = new Date(`${tanggal}T${jamShift}:00Z`)
          const jamCheckIn = new Date(a.check_in)
          if (jamCheckIn <= jamMasuk) {
            hadirUser.add(a.user_id)
          } else {
            terlambatUser.add(a.user_id)
            hadirUser.add(a.user_id)
          }
        }
      }
      hadir = hadirUser.size
      terlambat = terlambatUser.size
      // Tidak hadir = user yang dijadwalkan shift hari ini, tidak ada absen, dan bukan izin/sakit
      const userShiftToday = Object.keys(shiftMap)
      tidakHadir = userShiftToday.filter(uid => !hadirUser.has(uid) && !izinSakitUser.has(uid)).length
      setStats([
        { name: 'Total Karyawan', value: totalKaryawan || 0 },
        { name: 'Hadir Hari Ini', value: hadir },
        { name: 'Terlambat Hari Ini', value: terlambat },
        { name: 'Tidak Hadir Hari Ini', value: tidakHadir },
      ])
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.name}
              className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
            >
              <dt>
                <div className="absolute rounded-md bg-indigo-500 p-3">
                  <svg
                    className="h-6 w-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                    />
                  </svg>
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
              </dt>
              <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
              </dd>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Aktivitas Terbaru</h2>
        <div className="mt-4 overflow-hidden rounded-lg bg-white shadow">
          <div className="p-6">
            <p className="text-gray-500">Belum ada aktivitas terbaru</p>
          </div>
        </div>
      </div>
    </div>
  )
}