'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ tanggal: '', keterangan: '' })
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    setLoading(true)
    const { data } = await supabase.from('hari_libur').select('*').order('tanggal', { ascending: true })
    setHolidays(data || [])
    setLoading(false)
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.tanggal) return setError('Tanggal wajib diisi')
    if (editId) {
      // Edit
      const { error } = await supabase.from('hari_libur').update({ tanggal: form.tanggal, keterangan: form.keterangan }).eq('id', editId)
      if (error) return setError(error.message)
      setSuccess('Hari libur berhasil diupdate')
    } else {
      // Tambah
      const { error } = await supabase.from('hari_libur').insert({ tanggal: form.tanggal, keterangan: form.keterangan })
      if (error) return setError(error.message)
      setSuccess('Hari libur berhasil ditambahkan')
    }
    setForm({ tanggal: '', keterangan: '' })
    setEditId(null)
    fetchHolidays()
  }

  const handleEdit = (h) => {
    setForm({ tanggal: h.tanggal, keterangan: h.keterangan || '' })
    setEditId(h.id)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus hari libur ini?')) return
    const { error } = await supabase.from('hari_libur').delete().eq('id', id)
    if (error) return setError(error.message)
    setSuccess('Hari libur berhasil dihapus')
    fetchHolidays()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Pengaturan Hari Libur</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col md:flex-row gap-2 md:items-end bg-white p-4 rounded shadow">
        <input
          type="date"
          name="tanggal"
          className="border border-gray-400 px-3 py-2 rounded w-full md:w-1/4 text-gray-900 bg-white"
          value={form.tanggal}
          onChange={handleChange}
        />
        <input
          type="text"
          name="keterangan"
          className="border border-gray-400 px-3 py-2 rounded w-full md:w-1/2 text-gray-900 bg-white"
          placeholder="Keterangan (opsional)"
          value={form.keterangan}
          onChange={handleChange}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          {editId ? 'Simpan Perubahan' : 'Tambah Hari Libur'}
        </button>
        {editId && (
          <button type="button" className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition-colors" onClick={() => { setEditId(null); setForm({ tanggal: '', keterangan: '' }) }}>Batal</button>
        )}
      </form>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white border border-gray-300 rounded shadow">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b border-gray-300 bg-gray-100 text-gray-900">Tanggal</th>
              <th className="py-2 px-4 border-b border-gray-300 bg-gray-100 text-gray-900">Keterangan</th>
              <th className="py-2 px-4 border-b border-gray-300 bg-gray-100 text-gray-900">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-4 text-gray-500">Belum ada hari libur.</td></tr>
            ) : (
              holidays.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-4 border-b border-gray-200 text-gray-900">{h.tanggal}</td>
                  <td className="py-2 px-4 border-b border-gray-200 text-gray-900">{h.keterangan || '-'}</td>
                  <td className="py-2 px-4 border-b border-gray-200">
                    <button className="text-blue-600 mr-2 hover:underline hover:text-blue-800 transition-colors" onClick={() => handleEdit(h)}>Edit</button>
                    <button className="text-red-600 hover:underline hover:text-red-800 transition-colors" onClick={() => handleDelete(h.id)}>Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
} 