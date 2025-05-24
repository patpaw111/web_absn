import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const url = new URL(request.url)
  const bulan = Number(url.searchParams.get('bulan'))
  const tahun = Number(url.searchParams.get('tahun'))

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Ambil data rekap_harian_absensi
  const { data: rekap, error: err1 } = await supabase
    .from('rekap_harian_absensi')
    .select('user_id, status, menit_terlambat, users:user_id (full_name)')
    .gte('tanggal', `${tahun}-${String(bulan).padStart(2, '0')}-01`)
    .lte('tanggal', `${tahun}-${String(bulan).padStart(2, '0')}-31`)

  if (err1) {
    return NextResponse.json({ error: err1.message }, { status: 400 })
  }

  // Hitung rekap performa per user
  const userMap = {}
  for (const r of rekap) {
    if (!userMap[r.user_id]) {
      userMap[r.user_id] = {
        user_id: r.user_id,
        full_name: r.users?.full_name || '-',
        total_terlambat: 0,
        total_tidak_hadir: 0,
        total_hadir: 0,
        total_izin: 0,
        total_sakit: 0,
        skor_performa: 100,
      }
    }
    if (r.status === 'terlambat') userMap[r.user_id].total_terlambat++
    if (r.status === 'tidak_hadir') userMap[r.user_id].total_tidak_hadir++
    if (r.status === 'hadir') userMap[r.user_id].total_hadir++
    if (r.status === 'izin') userMap[r.user_id].total_izin++
    if (r.status === 'sakit') userMap[r.user_id].total_sakit++
  }
  // Contoh skor_performa sederhana: 100 - (total_terlambat*2 + total_tidak_hadir*5)
  for (const u of Object.values(userMap)) {
    u.skor_performa = Math.max(0, 100 - (u.total_terlambat*2 + u.total_tidak_hadir*5))
  }

  // Ambil data penilaian_performa (ambil skor_total terbaru per user)
  const { data: penilaian, error: err2 } = await supabase
    .from('penilaian_performa')
    .select('user_id, skor_total, created_at')
    .order('created_at', { ascending: false })

  if (err2) {
    return NextResponse.json({ error: err2.message }, { status: 400 })
  }

  // Ambil skor_total terbaru per user
  const skorTotalMap = {}
  for (const p of penilaian) {
    if (!skorTotalMap[p.user_id]) {
      skorTotalMap[p.user_id] = p.skor_total
    }
  }

  // Gabungkan data dan filter kriteria kurang performa
  const result = Object.values(userMap).map(u => ({
    ...u,
    skor_total: skorTotalMap[u.user_id] ?? null,
  })).filter(d =>
    d.total_terlambat > 3 ||
    d.total_tidak_hadir > 1 ||
    (d.skor_performa !== null && d.skor_performa < 70) ||
    (d.skor_total !== null && d.skor_total < 70)
  )

  return NextResponse.json({ data: result })
} 