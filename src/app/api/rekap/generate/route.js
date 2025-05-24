import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const body = await request.json()
  const { bulan, tahun } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Ambil semua penugasan shift di bulan & tahun tsb
  const { data: penugasan, error: err1 } = await supabase
    .from('penugasan_shift')
    .select('user_id, shift_id, tanggal_mulai, tanggal_selesai, shift_kerja:shift_id (jam_mulai)')

  if (err1) return NextResponse.json({ error: err1.message }, { status: 400 })

  // 2. Buat mapping user_id + tanggal => jam_masuk_shift
  const shiftMap = {}
  for (const p of penugasan) {
    const start = new Date(p.tanggal_mulai)
    const end = new Date(p.tanggal_selesai)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() + 1 === bulan && d.getFullYear() === tahun) {
        const key = `${p.user_id}_${d.toISOString().slice(0, 10)}`
        shiftMap[key] = p.shift_kerja?.jam_mulai || '08:00' // default 08:00
      }
    }
  }

  // 3. Ambil semua user yang punya shift di bulan tsb
  const userTanggalList = Object.keys(shiftMap)

  // 4. Ambil data attendance di bulan tsb
  const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`
  const endDate = `${tahun}-${String(bulan).padStart(2, '0')}-31`
  const { data: attendance, error: err2 } = await supabase
    .from('attendance')
    .select('*')
    .gte('check_in', `${startDate}T00:00:00+00:00`)
    .lte('check_in', `${endDate}T23:59:59+00:00`)

  if (err2) return NextResponse.json({ error: err2.message }, { status: 400 })

  // 5. Mapping attendance: user_id + tanggal => attendance
  const attMap = {}
  for (const a of attendance) {
    if (!a.check_in) continue
    const tgl = new Date(a.check_in).toISOString().slice(0, 10)
    const key = `${a.user_id}_${tgl}`
    attMap[key] = a
  }

  // 6. Generate rekap harian
  const rekap = []
  for (const key of userTanggalList) {
    const [user_id, tanggal] = key.split('_')
    const jam_masuk_shift = shiftMap[key] // format: 'HH:mm'
    const att = attMap[key]
    let status = 'tidak_hadir'
    let menit_terlambat = 0
    let check_in = null
    let check_out = null
    if (att) {
      check_in = att.check_in
      check_out = att.check_out
      // Bandingkan jam check_in dengan jam_masuk_shift
      const jamMasuk = new Date(`${tanggal}T${jam_masuk_shift}:00Z`)
      const jamCheckIn = new Date(att.check_in)
      if (jamCheckIn <= jamMasuk) {
        status = 'hadir'
      } else {
        status = 'terlambat'
        menit_terlambat = Math.floor((jamCheckIn - jamMasuk) / 60000)
      }
    }
    rekap.push({ user_id, tanggal, status, menit_terlambat, check_in, check_out })
  }

  // 7. Insert/update ke tabel rekap_harian_absensi
  for (const r of rekap) {
    await supabase.from('rekap_harian_absensi').upsert({
      user_id: r.user_id,
      tanggal: r.tanggal,
      status: r.status,
      menit_terlambat: r.menit_terlambat,
      check_in: r.check_in,
      check_out: r.check_out,
    }, { onConflict: ['user_id', 'tanggal'] })
  }

  return NextResponse.json({ success: true, total: rekap.length })
} 