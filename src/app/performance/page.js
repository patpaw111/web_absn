'use client'

import { useEffect, useState, useCallback } from 'react'
import { XCircle, CheckCircle, Clock, CalendarDays, BarChart, Info, Users, AlertTriangle, Target, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const DEFAULT_YEAR = new Date().getFullYear()
const DEFAULT_MONTH = new Date().getMonth() + 1

const bulanNames = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April', 5: 'Mei', 6: 'Juni',
  7: 'Juli', 8: 'Agustus', 9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember'
}

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
  const [periode, setPeriode] = useState({})
  const [bulan, setBulan] = useState(DEFAULT_MONTH)
  const [tahun, setTahun] = useState(DEFAULT_YEAR)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [periodeType, setPeriodeType] = useState('bulanan')
  const [minggu, setMinggu] = useState(0)

  const [totalKaryawanCount, setTotalKaryawanCount] = useState(0);
  const [membutuhkanPembinaanCount, setMembutuhkanPembinaanCount] = useState(0);
  const [skorRataRataValue, setSkorRataRataValue] = useState(0.00);

  const weeks = getWeeksInMonth(tahun, bulan)

  const fetchData = useCallback(async () => {
      setLoading(true)
    setData([])
    setError(null)
      let url = `/api/performance/spk?bulan=${bulan}&tahun=${tahun}`
    if (periodeType === 'mingguan') {
        url += `&minggu=${minggu}`
    }
    console.log('Fetching data from:', url)
    try {
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengambil data')
      }
      setData(result.data || [])
      setPeriode(result.periode || null)

      // Set new aggregate states
      setTotalKaryawanCount(result.totalKaryawan || 0);
      setMembutuhkanPembinaanCount(result.membutuhkanPembinaan || 0);
      setSkorRataRataValue(result.skorRataRata || 0.00);

      console.log('Data received in fetchData:', result.data)
    } catch (err) {
      console.error('Error fetching data in fetchData:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      console.log('Loading state set to false.')
    }
  }, [bulan, tahun, periodeType, minggu])

  useEffect(() => {
    console.log('useEffect triggered. Current loading state:', loading)
    fetchData()
  }, [fetchData])

  console.log('Rendering component. Current loading state:', loading)
  console.log('Filtered data:', data)

  // Filter nama karyawan
  const filteredData = search
    ? data.filter(d => d.full_name.toLowerCase().includes(search.toLowerCase()))
    : data

  // Hitung statistik menggunakan nilai dari API
  const stats = {
    total: totalKaryawanCount,
    pembinaan: membutuhkanPembinaanCount,
    rataRataSkor: skorRataRataValue,
  }

  // Format tanggal periode
  const formatPeriode = () => {
    if (!periode.start || !periode.end) return ''
    const start = new Date(periode.start)
    const end = new Date(periode.end)
    return `${start.getDate()} - ${end.getDate()} ${start.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i) // Current year +/- 2 years

  const chartData = {
    labels: filteredData.map(item => item.nama),
    datasets: [
      {
        label: 'Skor Performa (SAW)',
        data: filteredData.map(item => item.skor_performa),
        backgroundColor: filteredData.map(item => item.skor_performa < 75 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(75, 192, 192, 0.6)'),
        borderColor: filteredData.map(item => item.skor_performa < 75 ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)'),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Distribusi Skor Performa Karyawan',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Skor Performa',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Nama Karyawan',
        },
      },
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <main className="flex-1 p-6 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Analisis Performa Karyawan
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membutuhkan Pembinaan</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.pembinaan}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skor Rata-rata</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.rataRataSkor}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Periode Data: {periode ? `${bulanNames[periode.bulan]} ${periode.tahun}` : 'Memuat...'}
          </h2>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Cari karyawan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
        </div>
            <div className="flex gap-2">
              <Select value={bulan.toString()} onValueChange={value => setBulan(Number(value))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(bulanNames).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tahun.toString()} onValueChange={value => setTahun(Number(value))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchData} className="bg-blue-600 hover:bg-blue-700 text-white">
                Terapkan
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Distribusi Skor Performa Karyawan
            </h3>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-10">
                <XCircle className="w-12 h-12 mx-auto mb-4" />
                <p>Error: {error}</p>
                <p className="text-sm text-gray-500">
                  Pastikan ada data di database untuk periode ini dan coba lagi.
                </p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <Info className="w-12 h-12 mx-auto mb-4" />
                <p>Tidak ada data performa untuk periode ini.</p>
                <p className="text-sm text-gray-500">
                  Coba pilih bulan dan tahun yang berbeda, atau pastikan data absensi dan penilaian tersedia.
                </p>
              </div>
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>
          
          <div className="overflow-x-auto bg-gray-50 rounded-lg">
            <Table>
              <TableHeader className="bg-gray-200">
                <TableRow>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Nama Karyawan
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Terlambat
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Tidak Hadir
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Hadir
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Total Hari Kerja
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Kehadiran (%)
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-1 h-4 w-4">
                          <Info className="h-3 w-3 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        C1: Persentase Kehadiran = (Jumlah Hadir / Total Hari Kerja) * 100%.
                        Nilai dinormalisasi terhadap nilai kehadiran maksimum.
                      </PopoverContent>
                    </Popover>
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Keterlambatan (Jumlah)
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-1 h-4 w-4">
                          <Info className="h-3 w-3 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        C2: Jumlah Keterlambatan. Ini adalah kriteria biaya (cost).
                        Nilai dinormalisasi terhadap nilai keterlambatan minimum/maksimum.
                      </PopoverContent>
                    </Popover>
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Ketidakhadiran (Jumlah)
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-1 h-4 w-4">
                          <Info className="h-3 w-3 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        C3: Jumlah Ketidakhadiran. Ini adalah kriteria biaya (cost).
                        Nilai dinormalisasi terhadap nilai ketidakhadiran minimum/maksimum.
                      </PopoverContent>
                    </Popover>
                  </TableHead>
                  <TableHead className="py-3 px-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Skor Performa Akhir (SAW)
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-1 h-4 w-4">
                          <Info className="h-3 w-3 text-gray-500" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 text-sm">
                        Skor Performa Akhir menggunakan metode SAW (Simple Additive Weighting).
                        Ini adalah penjumlahan dari nilai kriteria yang dinormalisasi dikalikan dengan bobot masing-masing kriteria.
                        Skor ini dinormalisasi ke skala 0-100.
                      </PopoverContent>
                    </Popover>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                      </div>
                      <p className="mt-4 text-gray-600">Memuat data...</p>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-red-500">
                      <XCircle className="w-12 h-12 mx-auto mb-4" />
                      <p>Error: {error}</p>
                      <p className="text-sm text-gray-500">
                        Pastikan ada data di database untuk periode ini dan coba lagi.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                      <Info className="w-12 h-12 mx-auto mb-4" />
                      <p>Tidak ada data performa untuk periode ini.</p>
                      <p className="text-sm text-gray-500">
                        Coba pilih bulan dan tahun yang berbeda, atau pastikan data absensi dan penilaian tersedia.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => {
                    console.log('Rendering table row for:', item.id, item.nama, item);
                    return (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell>{item.nama}</TableCell>
                        <TableCell className="text-center">{item.total_terlambat}</TableCell>
                        <TableCell className="text-center">{item.total_tidak_hadir}</TableCell>
                        <TableCell className="text-center">{item.total_hadir}</TableCell>
                        <TableCell className="text-center">{item.total_hari_kerja}</TableCell>
                        <TableCell className="text-center">{item.persentase_kehadiran}%</TableCell>
                        <TableCell className="text-center">{item.total_terlambat}</TableCell>
                        <TableCell className="text-center">{item.total_tidak_hadir}</TableCell>
                        <TableCell className="text-center font-medium">
                          {item.skor_performa !== null ? item.skor_performa.toFixed(2) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Penjelasan Perhitungan Performa</AlertTitle>
          <AlertDescription className="text-blue-700 space-y-2 mt-2">
            <p>Perhitungan performa karyawan menggunakan metode SAW (Simple Additive Weighting) dengan kriteria sebagai berikut:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Kehadiran (40%):</strong> Persentase kehadiran dari total hari kerja yang ditugaskan.</li>
              <li><strong>Keterlambatan (35%):</strong> Jumlah keterlambatan (check-in setelah jam mulai shift).</li>
              <li><strong>Ketidakhadiran (25%):</strong> Jumlah ketidakhadiran (tidak check-in atau terlambat &gt; 30 menit).</li>
            </ul>
            <p className="mt-2 text-sm">Status kehadiran dihitung berdasarkan:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Hadir:</strong> Check-in pada atau sebelum 30 menit setelah jam mulai shift.</li>
              <li><strong>Terlambat:</strong> Check-in setelah jam mulai shift.</li>
              <li><strong>Tidak Hadir:</strong> Tidak check-in atau check-in lebih dari 30 menit setelah jam mulai shift.</li>
            </ul>
          </AlertDescription>
        </Alert>


        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
      ) : (
        <div className="overflow-x-auto">
            
        </div>
      )}
      </main>
    </div>
  )
} 