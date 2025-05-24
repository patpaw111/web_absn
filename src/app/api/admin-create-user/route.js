import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const body = await request.json()
  const { email, full_name, password } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. Buat user di auth, auto confirm email
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // 2. Tambah ke tabel users
  const userId = data.user?.id || data.id
  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    email,
    full_name,
    role: 'employee',
  })
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: { id: userId, email, full_name } })
}