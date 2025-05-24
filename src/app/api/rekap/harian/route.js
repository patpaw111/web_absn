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

  const { data, error } = await supabase
    .from('rekap_harian_absensi')
    .select('*, users:user_id (full_name)')
    .gte('tanggal', `${tahun}-${String(bulan).padStart(2, '0')}-01`)
    .lte('tanggal', `${tahun}-${String(bulan).padStart(2, '0')}-31`)
    .order('tanggal', { ascending: true })
    .order('user_id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Format data agar full_name langsung di root
  const result = (data || []).map(d => ({
    ...d,
    full_name: d.users?.full_name || '-',
  }))

  return NextResponse.json({ data: result })
} 