import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 1. Ambil data absensi dari Supabase
    const { data: attendance } = await supabase
      .from('attendance')
      .select('user_id, check_in, check_out, status')

    // 2. Rekap data per user
    const userMap = {}
    attendance.forEach(row => {
      if (!userMap[row.user_id]) {
        userMap[row.user_id] = { hadir: 0, terlambat: 0, tidak_hadir: 0 }
      }
      if (row.status === 'present') userMap[row.user_id].hadir++
      if (row.status === 'late') userMap[row.user_id].terlambat++
      if (row.status === 'absent') userMap[row.user_id].tidak_hadir++
    })

    // 3. Normalisasi (misal: bagi dengan nilai maksimum dari semua user)
    const maxHadir = Math.max(...Object.values(userMap).map(u => u.hadir))
    const maxTerlambat = Math.max(...Object.values(userMap).map(u => u.terlambat))
    const maxTidakHadir = Math.max(...Object.values(userMap).map(u => u.tidak_hadir))

    // 4. Hitung skor SAW (misal: bobot hadir=0.5, terlambat=0.3, tidak_hadir=0.2)
    const bobot = { hadir: 0.5, terlambat: 0.3, tidak_hadir: 0.2 }
    const hasilSPK = Object.entries(userMap).map(([user_id, nilai]) => {
      const skor = (
        (nilai.hadir / maxHadir) * bobot.hadir +
        (1 - (nilai.terlambat / maxTerlambat)) * bobot.terlambat +
        (1 - (nilai.tidak_hadir / maxTidakHadir)) * bobot.tidak_hadir
      )
      return { user_id, skor: skor * 100 }
    })

    return NextResponse.json({ 
      message: 'Data berhasil ditambahkan',
      data: hasilSPK
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 