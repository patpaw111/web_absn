'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TABS = [
  { key: 'masuk', label: 'Absensi Masuk' },
  { key: 'pulang', label: 'Absensi Pulang' },
]

const STATUS_LABELS = {
  present: 'Hadir',
  late: 'Terlambat',
  absent: 'Tidak Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
}
const STATUS_COLORS = {
  present: 'bg-green-100 text-green-800',
  late: 'bg-yellow-100 text-yellow-800',
  absent: 'bg-red-100 text-red-800',
  izin: 'bg-blue-100 text-blue-800',
  sakit: 'bg-purple-100 text-purple-800',
}

export default function AttendancePage() {
  const [attendances, setAttendances] = useState([])
  const [shiftMap, setShiftMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    date: new Date().toISOString().split('T')[0],
    status: '',
  })
  const [tab, setTab] = useState('masuk')
  const [isHoliday, setIsHoliday] = useState(false)
  const [holidayNote, setHolidayNote] = useState('')
  const [editStatusId, setEditStatusId] = useState(null)
  const [editStatusValue, setEditStatusValue] = useState('')
  const [editStatusLoading, setEditStatusLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // Cek hari libur
      const { data: libur } = await supabase
        .from('hari_libur')
        .select('*')
        .eq('tanggal', filter.date)
        .maybeSingle()
      setIsHoliday(!!libur)
      setHolidayNote(libur?.keterangan || '')
      // Ambil penugasan shift + jam masuk shift untuk hari ini
      const { data: penugasan } = await supabase
        .from('penugasan_shift')
        .select('user_id, shift_kerja:shift_id (jam_mulai)')
        .lte('tanggal_mulai', filter.date)
        .gte('tanggal_selesai', filter.date)
      const sMap = {}
      for (const p of penugasan || []) {
        sMap[p.user_id] = p.shift_kerja?.jam_mulai || '08:00'
      }
      setShiftMap(sMap)
      // Ambil attendance hari ini
      let query = supabase
        .from('attendance')
        .select(`*, users:user_id (full_name)`)
        .order('created_at', { ascending: false })
      if (filter.date) {
        const startDate = new Date(filter.date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(filter.date)
        endDate.setHours(23, 59, 59, 999)
        if (tab === 'masuk') {
          query = query
            .gte('check_in', startDate.toISOString())
            .lte('check_in', endDate.toISOString())
        } else {
          query = query
            .gte('check_out', startDate.toISOString())
            .lte('check_out', endDate.toISOString())
        }
      }
      if (tab === 'masuk') {
        query = query.not('check_in', 'is', null)
      } else {
        query = query.not('check_out', 'is', null)
      }
      const { data: att } = await query
      setAttendances(att || [])
      setLoading(false)
    }
    fetchData()
  }, [filter.date, tab])

  const handleFilterChange = (e) => {
    setFilter({ ...filter, [e.target.name]: e.target.value })
  }

  // Format waktu ke UTC
  const formatTimeUTC = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    return `${hours}.${minutes}`
  }

  // Hitung status absensi per baris
  const getStatus = (a) => {
    if (a.status === 'izin' || a.status === 'sakit') return a.status
    if (isHoliday) return 'present'
    const jamShift = shiftMap[a.user_id] || '08:00'
    if (!a.check_in) return 'absent'
    const tanggal = a.check_in.slice(0, 10)
    const jamMasuk = new Date(`${tanggal}T${jamShift}:00Z`)
    const jamCheckIn = new Date(a.check_in)
    if (jamCheckIn <= jamMasuk) return 'present'
    return 'late'
  }

  const getStatusBadge = (status) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-200 text-gray-800'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )

  // Filter status di frontend
  const filteredAttendances = filter.status
    ? attendances.filter(a => getStatus(a) === filter.status)
    : attendances

  // Edit status handler
  const handleEditStatus = (id, current) => {
    setEditStatusId(id)
    setEditStatusValue(current)
  }
  const handleSaveStatus = async (id) => {
    setEditStatusLoading(true)
    await supabase.from('attendance').update({ status: editStatusValue }).eq('id', id)
    setEditStatusId(null)
    setEditStatusValue('')
    setEditStatusLoading(false)
    // Refresh data
    const event = new Event('refresh-attendance')
    window.dispatchEvent(event)
  }
  useEffect(() => {
    const refresh = () => setFilter(f => ({ ...f }))
    window.addEventListener('refresh-attendance', refresh)
    return () => window.removeEventListener('refresh-attendance', refresh)
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Data Absensi</h1>
      {isHoliday && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded">
          <b>Hari Libur:</b> {holidayNote || 'Hari ini adalah hari libur.'}
        </div>
      )}
      <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
        <b>Info:</b> Status absensi dihitung otomatis dari jam shift dan waktu absen masuk. Pada hari libur, tidak absen tidak memengaruhi performa.
      </div>
      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded font-medium border-b-2 transition-all ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-gray-600 bg-white hover:bg-gray-100'
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-2 md:items-end">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
          <input
            type="date"
            name="date"
            className="border px-3 py-2 rounded w-full"
            value={filter.date}
            onChange={handleFilterChange}
          />
        </div>
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            className="border px-3 py-2 rounded w-full"
            value={filter.status}
            onChange={handleFilterChange}
          >
            <option value="">Semua Status</option>
            <option value="present">Hadir</option>
            <option value="late">Terlambat</option>
            <option value="absent">Tidak Hadir</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Nama Karyawan</th>
                {tab === 'masuk' ? (
                  <th className="py-2 px-4 border bg-gray-200 text-gray-900">Waktu Masuk (UTC)</th>
                ) : (
                  <th className="py-2 px-4 border bg-gray-200 text-gray-900">Waktu Pulang (UTC)</th>
                )}
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Status</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-gray-500">
                    Tidak ada data absensi.
                  </td>
                </tr>
              ) : (
                filteredAttendances.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 px-4 border text-gray-900">{a.users?.full_name || '-'}</td>
                    {tab === 'masuk' ? (
                      <td className="py-2 px-4 border text-gray-900">{formatTimeUTC(a.check_in)}</td>
                    ) : (
                      <td className="py-2 px-4 border text-gray-900">{formatTimeUTC(a.check_out)}</td>
                    )}
                    <td className="py-2 px-4 border">
                      {editStatusId === a.id ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={editStatusValue}
                            onChange={e => setEditStatusValue(e.target.value)}
                            className="border px-2 py-1 rounded"
                          >
                            <option value="izin">Izin</option>
                            <option value="sakit">Sakit</option>
                          </select>
                          <button
                            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-xs"
                            onClick={() => handleSaveStatus(a.id)}
                            disabled={editStatusLoading}
                          >Simpan</button>
                          <button
                            className="bg-gray-300 text-gray-800 px-2 py-1 rounded hover:bg-gray-400 text-xs"
                            onClick={() => setEditStatusId(null)}
                            disabled={editStatusLoading}
                          >Batal</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          {getStatusBadge(getStatus(a))}
                          {(getStatus(a) === 'absent') && (
                            <button
                              className="text-blue-600 hover:underline text-xs"
                              onClick={() => handleEditStatus(a.id, a.status)}
                            >Edit Status</button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4 border text-gray-900">
                      {tab === 'masuk' && a.check_in_location ? (
                        <a
                          href={`https://www.google.com/maps?q=${a.check_in_location.latitude},${a.check_in_location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Lihat Lokasi
                        </a>
                      ) : tab === 'pulang' && a.check_out_location ? (
                        <a
                          href={`https://www.google.com/maps?q=${a.check_out_location.latitude},${a.check_out_location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Lihat Lokasi
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 