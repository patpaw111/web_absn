'use client'

import { useEffect, useState } from 'react'

const DEFAULT_YEAR = new Date().getFullYear()
const DEFAULT_MONTH = new Date().getMonth() + 1

function getWeeksInMonth(year, month) {
  const weeks = []
  const firstDay = new Date(year, month - 1, 1)
  let start = new Date(firstDay)
  while (start.getMonth() === firstDay.getMonth()) {
    const end = new Date(start)
    end.setDate(start.getDate() + 6 - start.getDay()) // Minggu: Minggu-Sabtu
    if (end.getMonth() !== firstDay.getMonth()) end.setDate(new Date(year, month, 0).getDate())
    weeks.push({
      start: new Date(start),
      end: new Date(end),
      label: `${start.getDate()}-${end.getDate()} ${start.toLocaleString('id-ID', { month: 'short' })}`
    })
    start.setDate(end.getDate() + 1)
  }
  return weeks
}

export default function SpkKurangPerformaPage() {
  const [data, setData] = useState([])
  const [bulan, setBulan] = useState(DEFAULT_MONTH)
  const [tahun, setTahun] = useState(DEFAULT_YEAR)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [periode, setPeriode] = useState('bulanan')
  const [minggu, setMinggu] = useState(0)

  const weeks = getWeeksInMonth(tahun, bulan)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let url = `/api/performance/spk?bulan=${bulan}&tahun=${tahun}`
      if (periode === 'mingguan') {
        url += `&minggu=${minggu}`
      }
      const res = await fetch(url)
      const result = await res.json()
      setData(result.data || [])
      setLoading(false)
    }
    fetchData()
  }, [bulan, tahun, periode, minggu])

  // Filter nama karyawan
  const filteredData = search
    ? data.filter(d => d.full_name.toLowerCase().includes(search.toLowerCase()))
    : data

  // Hitung jumlah karyawan perlu pembinaan
  const totalPembinaan = filteredData.filter(d =>
    d.total_terlambat > 3 ||
    d.total_tidak_hadir > 1 ||
    (d.skor_performa !== null && d.skor_performa < 70) ||
    (d.skor_total !== null && d.skor_total < 70)
  ).length

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">SPK Analisis Performa Karyawan</h1>
      <div className="flex gap-4 mb-6 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
          <select value={periode} onChange={e => setPeriode(e.target.value)} className="border px-2 py-1 rounded">
            <option value="bulanan">Bulanan</option>
            <option value="mingguan">Mingguan</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
          <select value={bulan} onChange={e => setBulan(Number(e.target.value))} className="border px-2 py-1 rounded">
            {[...Array(12)].map((_, i) => (
              <option key={i+1} value={i+1}>{i+1}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
          <input type="number" value={tahun} onChange={e => setTahun(Number(e.target.value))} className="border px-2 py-1 rounded w-24" />
        </div>
        {periode === 'mingguan' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minggu</label>
            <select value={minggu} onChange={e => setMinggu(Number(e.target.value))} className="border px-2 py-1 rounded">
              {weeks.map((w, i) => (
                <option key={i} value={i}>{w.label}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari Nama</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="border px-2 py-1 rounded" placeholder="Cari karyawan..." />
        </div>
      </div>
      <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded">
        <b>Kesimpulan SPK:</b> {totalPembinaan > 0
          ? `Ada ${totalPembinaan} karyawan yang perlu pembinaan/peringatan pada periode ini.`
          : 'Semua karyawan dalam performa baik.'}
      </div>
      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Nama</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Hadir</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Terlambat</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Tidak Hadir</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Izin</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Sakit</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Skor Performa</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Skor Total</th>
                <th className="py-2 px-4 border bg-gray-200 text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-4 text-gray-500">Tidak ada data.</td></tr>
              ) : (
                filteredData.map((d) => (
                  <tr key={d.user_id} className={
                    (d.total_terlambat > 3 || d.total_tidak_hadir > 1 || (d.skor_performa !== null && d.skor_performa < 70) || (d.skor_total !== null && d.skor_total < 70))
                      ? 'bg-red-50' : ''
                  }>
                    <td className="py-2 px-4 border text-gray-900 font-semibold">{d.full_name}</td>
                    <td className="py-2 px-4 border text-center">{d.total_hadir ?? '-'}</td>
                    <td className="py-2 px-4 border text-center">{d.total_terlambat ?? '-'}</td>
                    <td className="py-2 px-4 border text-center">{d.total_tidak_hadir ?? '-'}</td>
                    <td className="py-2 px-4 border text-center">{d.total_izin ?? '-'}</td>
                    <td className="py-2 px-4 border text-center">{d.total_sakit ?? '-'}</td>
                    <td className="py-2 px-4 border text-center">{d.skor_performa ?? '-'}</td>
                    <td className="py-2 px-4 border text-center">{d.skor_total ?? '-'}</td>
                    <td className="py-2 px-4 border text-center font-semibold">
                      {(d.total_terlambat > 3 || d.total_tidak_hadir > 1 || (d.skor_performa !== null && d.skor_performa < 70) || (d.skor_total !== null && d.skor_total < 70))
                        ? <span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs">Perlu Pembinaan</span>
                        : <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Aman</span>}
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