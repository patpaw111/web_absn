'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const getErrorMessage = (error) => {
    // Pesan error yang lebih user-friendly
    const errorMessages = {
      'Invalid login credentials': 'Email atau password yang Anda masukkan salah',
      'Email not confirmed': 'Email Anda belum diverifikasi',
      'Akses ditolak. Hanya admin yang diizinkan.': 'Maaf, Anda tidak memiliki akses sebagai admin',
      'Invalid email': 'Format email tidak valid',
      'Password is required': 'Password harus diisi',
      'Email is required': 'Email harus diisi',
      'Invalid phone number': 'Nomor telepon tidak valid',
      'User not found': 'Email tidak terdaftar',
      'Too many requests': 'Terlalu banyak percobaan login',
    }

    // Cek apakah error message ada dalam daftar
    for (const [key, value] of Object.entries(errorMessages)) {
      if (error.includes(key)) {
        return value
      }
    }

    // Jika error tidak ada dalam daftar, kembalikan pesan default
    return 'Terjadi kesalahan. Silakan coba lagi.'
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validasi input
      if (!email) {
        throw new Error('Email is required')
      }
      if (!password) {
        throw new Error('Password is required')
      }

      console.log('Attempting login...')

      // Login dengan Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (signInError) {
        console.error('Sign in error:', signInError)
        throw signInError
      }

      console.log('Login successful, checking user role...')

      // Cek role user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (userError) {
        console.error('User role check error:', userError)
        throw userError
      }

      console.log('User role:', userData)

      if (!userData || userData.role !== 'admin') {
        await supabase.auth.signOut()
        throw new Error('Akses ditolak. Hanya admin yang diizinkan.')
      }

      console.log('Login successful, redirecting to dashboard...')
      
      // Redirect ke dashboard
      router.push('/')

    } catch (error) {
      console.error('Login error:', error)
      setError(getErrorMessage(error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Dashboard Sistem Absensi
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {error.includes('Email atau password') && (
                        <>
                          <li>Pastikan email yang Anda masukkan benar</li>
                          <li>Pastikan password yang Anda masukkan benar</li>
                          <li>Pastikan Caps Lock tidak aktif</li>
                        </>
                      )}
                      {error.includes('Format email') && (
                        <>
                          <li>Email harus mengandung @ dan domain yang valid</li>
                          <li>Contoh: nama@perusahaan.com</li>
                        </>
                      )}
                      {error.includes('tidak memiliki akses') && (
                        <li>Silakan hubungi administrator untuk mendapatkan akses</li>
                      )}
                      {error.includes('tidak terdaftar') && (
                        <li>Silakan periksa kembali email Anda</li>
                      )}
                      {error.includes('terlalu banyak percobaan') && (
                        <li>Silakan tunggu beberapa menit sebelum mencoba lagi</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Loading...
                </div>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 