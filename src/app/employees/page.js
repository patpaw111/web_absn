'use client'

import { useEffect, useState, Fragment, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Dialog, Transition } from '@headlessui/react'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '', // Password kosong, user harus isi manual
    role: 'employee',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [showModal, setShowModal] = useState(false)
  const cancelButtonRef = useRef(null)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', full_name: '', email: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, created_at')
        .eq('role', 'employee')
        .order('created_at', { ascending: false })
      if (!error) setEmployees(data)
      setLoading(false)
    }
    fetchEmployees()
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus karyawan ini?')) return
    const res = await fetch('/api/admin-delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const result = await res.json()
    if (!res.ok) {
      alert('Gagal menghapus karyawan: ' + result.error)
      return
    }
    setEmployees((prev) => prev.filter((k) => k.id !== id))
  }

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!form.full_name || !form.email || !form.password) {
      setFormError('Nama, email, dan password wajib diisi!')
      return
    }
    setFormLoading(true)
    const res = await fetch('/api/admin-create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
      }),
    })
    const result = await res.json()
    if (!res.ok) {
      setFormError('Gagal menambah karyawan: ' + result.error)
      setFormLoading(false)
      return
    }
    console.log('data dari createUser:', result)
    const userId = result.user?.id || result.id
    setEmployees((prev) => [
      { id: userId, email: result.user.email, full_name: result.user.full_name },
      ...prev,
    ])
    setForm({ full_name: '', email: '', password: '', role: 'employee' })
    setFormSuccess('Karyawan berhasil ditambahkan!')
    setFormLoading(false)
    setShowModal(false)
  }

  const openEditModal = (karyawan) => {
    setEditForm({ id: karyawan.id, full_name: karyawan.full_name, email: karyawan.email })
    setEditError('')
    setEditSuccess('')
    setEditModal(true)
  }

  const handleEditInputChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess('')
    if (!editForm.full_name || !editForm.email) {
      setEditError('Nama dan email wajib diisi!')
      return
    }
    setEditLoading(true)

    // 1. Update email di auth Supabase via API route (karena butuh service role key)
    const res = await fetch('/api/admin-update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editForm.id, email: editForm.email }),
    })
    const result = await res.json()
    if (!res.ok) {
      setEditError('Gagal update email auth: ' + result.error)
      setEditLoading(false)
      return
    }

    // 2. Update di tabel users
    const { error } = await supabase.from('users').update({
      full_name: editForm.full_name,
      email: editForm.email,
    }).eq('id', editForm.id)
    if (error) {
      setEditError('Gagal update data: ' + error.message)
      setEditLoading(false)
      return
    }
    setEmployees((prev) => prev.map((k) => k.id === editForm.id ? { ...k, full_name: editForm.full_name, email: editForm.email } : k))
    setEditSuccess('Data berhasil diupdate!')
    setEditLoading(false)
    setTimeout(() => setEditModal(false), 800)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Data Karyawan</h1>
      <button
        className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        onClick={() => setShowModal(true)}
      >
        Tambah Karyawan
      </button>
      {/* Modal Form Tambah Karyawan */}
      <Transition.Root show={showModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={setShowModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                      Tambah Karyawan
                    </Dialog.Title>
                    <form onSubmit={handleAdd}>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          name="full_name"
                          className="border px-3 py-2 rounded w-full bg-white text-gray-900 placeholder-gray-400"
                          placeholder="Nama Lengkap"
                          value={form.full_name}
                          onChange={handleInputChange}
                          disabled={formLoading}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          className="border px-3 py-2 rounded w-full bg-white text-gray-900 placeholder-gray-400"
                          placeholder="Email"
                          value={form.email}
                          onChange={handleInputChange}
                          disabled={formLoading}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            className="border px-3 py-2 rounded w-full bg-white text-gray-900 placeholder-gray-400"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleInputChange}
                            disabled={formLoading}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                      {formError && <div className="text-red-600 mb-2">{formError}</div>}
                      {formSuccess && <div className="text-green-600 mb-2">{formSuccess}</div>}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
                          onClick={() => setShowModal(false)}
                          ref={cancelButtonRef}
                          disabled={formLoading}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                          disabled={formLoading}
                        >
                          {formLoading ? 'Menambah...' : 'Tambah'}
                        </button>
                      </div>
                    </form>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      {/* Modal Edit Karyawan */}
      <Transition.Root show={editModal} as={Fragment}>
        <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={setEditModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300" enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200" leaveFrom="opacity-100 translate-y-0 sm:scale-100" leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                  <div>
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                      Edit Karyawan
                    </Dialog.Title>
                    <form onSubmit={handleEdit}>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          name="full_name"
                          className="border px-3 py-2 rounded w-full bg-white text-gray-900 placeholder-gray-400"
                          value={editForm.full_name}
                          onChange={handleEditInputChange}
                          disabled={editLoading}
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          className="border px-3 py-2 rounded w-full bg-white text-gray-900 placeholder-gray-400"
                          value={editForm.email}
                          onChange={handleEditInputChange}
                          disabled={editLoading}
                        />
                      </div>
                      {editError && <div className="text-red-600 mb-2">{editError}</div>}
                      {editSuccess && <div className="text-green-600 mb-2">{editSuccess}</div>}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
                          onClick={() => setEditModal(false)}
                          ref={cancelButtonRef}
                          disabled={editLoading}
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                          disabled={editLoading}
                        >
                          {editLoading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    </form>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Nama</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Email</th>
              <th className="py-2 px-4 border bg-gray-200 text-gray-900">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  Tidak ada data karyawan.
                </td>
              </tr>
            ) : (
              employees.map((k) => (
                <tr key={k.id}>
                  <td className="py-2 px-4 border text-gray-900">{k.full_name}</td>
                  <td className="py-2 px-4 border text-gray-900">{k.email}</td>
                  <td className="py-2 px-4 border">
                    <button
                      className="text-blue-500 mr-2 hover:underline"
                      onClick={() => openEditModal(k)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 hover:underline"
                      onClick={() => handleDelete(k.id)}
                    >
                      Hapus
                    </button>
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