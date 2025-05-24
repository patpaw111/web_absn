'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AssignmentPage() {
  const [assignments, setAssignments] = useState([])
  const [employees, setEmployees] = useState([])
  const [shifts, setShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ user_id: '', shift_id: '', tanggal_mulai: '', tanggal_selesai: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      const { data: emp } = await supabase.from('users').select('id, full_name').eq('role', 'employee')
      const { data: shf } = await supabase.from('shift_kerja').select('id, nama_shift')
      const { data: asg } = await supabase
        .from('penugasan_shift')
        .select('id, user_id, shift_id, tanggal_mulai, tanggal_selesai, created_at')
        .order('created_at', { ascending: false })
      setEmployees(emp || [])
      setShifts(shf || [])
      setAssignments(asg || [])
      setLoading(false)
    }
    fetchAll()
  }, [])

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!form.user_id || !form.shift_id || !form.tanggal_mulai || !form.tanggal_selesai) {
      setFormError('Semua field wajib diisi!')
      return
    }
    setFormLoading(true)
    const { data, error } = await supabase.from('penugasan_shift').insert({
      user_id: form.user_id,
      shift_id: form.shift_id,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
    }).select().single()
    if (error) {
      setFormError('Gagal menambah penugasan: ' + error.message)
      setFormLoading(false)
      return
    }
    setAssignments((prev) => [data, ...prev])
    setForm({ user_id: '', shift_id: '', tanggal_mulai: '', tanggal_selesai: '' })
    setFormSuccess('Penugasan shift berhasil ditambahkan!')
    setFormLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Penugasan Shift</h1>
      <form onSubmit={handleAdd} className="mb-6 flex flex-col md:flex-row gap-2 md:items-end">
        <select
          name="user_id"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.user_id}
          onChange={handleInputChange}
          disabled={formLoading}
        >
          <option value="">Pilih Karyawan</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.full_name}</option>
          ))}
        </select>
        <select
          name="shift_id"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.shift_id}
          onChange={handleInputChange}
          disabled={formLoading}
        >
          <option value="">Pilih Shift</option>
          {shifts.map((s) => (
            <option key={s.id} value={s.id}>{s.nama_shift}</option>
          ))}
        </select>
        <input
          type="date"
          name="tanggal_mulai"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.tanggal_mulai}
          onChange={handleInputChange}
          disabled={formLoading}
        />
        <input
          type="date"
          name="tanggal_selesai"
          className="border px-3 py-2 rounded w-full md:w-1/4"
          value={form.tanggal_selesai}
          onChange={handleInputChange}
          disabled={formLoading}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={formLoading}
        >
          {formLoading ? 'Menambah...' : 'Tambah Penugasan'}
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
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Karyawan</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Shift</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Tanggal Mulai</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Tanggal Selesai</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                  Tidak ada penugasan shift.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 px-4 border text-gray-900">
                    {employees.find((e) => e.id === a.user_id)?.full_name || '-'}
                  </td>
                  <td className="py-2 px-4 border text-gray-900">
                    {shifts.find((s) => s.id === a.shift_id)?.nama_shift || '-'}
                  </td>
                  <td className="py-2 px-4 border text-gray-900">{a.tanggal_mulai}</td>
                  <td className="py-2 px-4 border text-gray-900">{a.tanggal_selesai}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}