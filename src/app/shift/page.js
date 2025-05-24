'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ShiftPage() {
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nama_shift: '', jam_mulai: '', jam_selesai: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('shift_kerja')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setShifts(data)
      setLoading(false)
    }
    fetchShifts()
  }, [])

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!form.nama_shift || !form.jam_mulai || !form.jam_selesai) {
      setFormError('Semua field wajib diisi!')
      return
    }
    setFormLoading(true)
    const { data, error } = await supabase.from('shift_kerja').insert({
      nama_shift: form.nama_shift,
      jam_mulai: form.jam_mulai,
      jam_selesai: form.jam_selesai,
    }).select().single()
    if (error) {
      setFormError('Gagal menambah shift: ' + error.message)
      setFormLoading(false)
      return
    }
    setShifts((prev) => [data, ...prev])
    setForm({ nama_shift: '', jam_mulai: '', jam_selesai: '' })
    setFormSuccess('Shift berhasil ditambahkan!')
    setFormLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Shift Kerja</h1>
      <form onSubmit={handleAdd} className="mb-6 flex flex-col md:flex-row gap-2 md:items-end">
        <input
          type="text"
          name="nama_shift"
          placeholder="Nama Shift"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.nama_shift}
          onChange={handleInputChange}
          disabled={formLoading}
        />
        <input
          type="time"
          name="jam_mulai"
          placeholder="Jam Mulai"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.jam_mulai}
          onChange={handleInputChange}
          disabled={formLoading}
        />
        <input
          type="time"
          name="jam_selesai"
          placeholder="Jam Selesai"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.jam_selesai}
          onChange={handleInputChange}
          disabled={formLoading}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={formLoading}
        >
          {formLoading ? 'Menambah...' : 'Tambah Shift'}
        </button>
      </form>
      {formError && <div className="text-red-600 mb-2">{formError}</div>}
      {formSuccess && <div className="text-green-600 mb-2">{formSuccess}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Nama Shift</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Jam Mulai</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Jam Selesai</th>
            </tr>
          </thead>
          <tbody>
            {shifts.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  Tidak ada shift kerja.
                </td>
              </tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 px-4 border text-gray-900">{s.nama_shift}</td>
                  <td className="py-2 px-4 border text-gray-900">{s.jam_mulai}</td>
                  <td className="py-2 px-4 border text-gray-900">{s.jam_selesai}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}