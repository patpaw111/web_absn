import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const body = await request.json()
  const { id } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Hapus user dari auth
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: error.message, details: error }, { status: 400 })
  }

  // Hapus user dari tabel users
  const { error: userError } = await supabase.from('users').delete().eq('id', id)
  if (userError) {
    return NextResponse.json({ error: userError.message, details: userError }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}