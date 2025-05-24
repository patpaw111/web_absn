import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const body = await request.json()
  const { email, full_name } = body
  const password = Math.random().toString(36).slice(-8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key dari .env.local
  )

  // 1. Buat user di auth
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2. Tambah ke tabel users
  const { error: userError } = await supabase.from('users').insert({
    id: data.user.id,
    email,
    full_name,
    role: 'employee',
  })
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: { id: data.user.id, email, full_name } })
}