# Web Absensi Karyawan

Aplikasi web untuk manajemen absensi karyawan dengan fitur login, dashboard admin, dan manajemen data karyawan.

## Fitur Utama

- 🔐 Autentikasi dengan Supabase
- 📊 Dashboard Admin
- 👥 Manajemen Data Karyawan
- 📝 Pencatatan Absensi
- 📈 Laporan Performa
- 🕒 Manajemen Shift Kerja
- 📅 Pengaturan Hari Libur

## Prasyarat

Sebelum menginstal, pastikan Anda memiliki:
- Node.js (versi 18.0.0 atau lebih baru)
- npm atau yarn
- Akun Supabase (gratis)

## Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/patpaw111/web_absn.git
   cd web_absn
   ```

2. **Instal Dependencies**
   ```bash
   npm install
   # atau
   yarn install
   ```

3. **Buat Project di Supabase**
   - Buka [Supabase](https://supabase.com)
   - Buat project baru
   - Salin URL dan anon key dari project settings

4. **Konfigurasi Environment**
   - Buat file `.env.local` di root project
   - Isi dengan konfigurasi berikut:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
     ```
   - Untuk mendapatkan key-key tersebut:
     1. Buka project Supabase Anda
     2. Pilih menu "Project Settings"
     3. Pilih "API"
     4. Salin "Project URL" untuk `NEXT_PUBLIC_SUPABASE_URL`
     5. Salin "anon public" untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     6. Salin "service_role" untuk `SUPABASE_SERVICE_ROLE_KEY`

5. **Jalankan Aplikasi**
   ```bash
   npm run dev
   # atau
   yarn dev
   ```

6. **Buka di Browser**
   - Buka [http://localhost:3000](http://localhost:3000)

## Struktur Database

### SQL untuk Membuat Tabel
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel Users
CREATE TABLE users (
  id uuid references auth.users primary key,
  email text unique,
  full_name text,
  role text check (role in ('admin', 'employee')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Attendance
CREATE TABLE attendance (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  check_in_photo_url text,
  check_out_photo_url text,
  check_in_location jsonb,
  check_out_location jsonb,
  status text check (status in ('present', 'late', 'absent')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Kehadiran
CREATE TABLE kehadiran (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  tanggal date,
  jam_masuk timestamp with time zone,
  jam_keluar timestamp with time zone,
  foto_masuk text,
  foto_keluar text,
  lokasi_masuk jsonb,
  lokasi_keluar jsonb,
  status text check (status in ('hadir', 'terlambat', 'tidak_hadir', 'izin', 'sakit')),
  keterangan text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Analisis Performa
CREATE TABLE analisis_performa (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  bulan integer,
  tahun integer,
  total_hadir integer,
  total_terlambat integer,
  total_tidak_hadir integer,
  total_izin integer,
  total_sakit integer,
  skor_performa numeric,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Penilaian Performa
CREATE TABLE penilaian_performa (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  penilai_id uuid references users(id),
  periode text,
  skor_kehadiran numeric,
  skor_kinerja numeric,
  skor_kerjasama numeric,
  skor_kepemimpinan numeric,
  skor_total numeric,
  komentar text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Shift Kerja
CREATE TABLE shift_kerja (
  id uuid default uuid_generate_v4() primary key,
  nama_shift text,
  jam_mulai time,
  jam_selesai time,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Penugasan Shift
CREATE TABLE penugasan_shift (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  shift_id uuid references shift_kerja(id),
  tanggal_mulai date,
  tanggal_selesai date,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabel Rekap Harian Absensi
CREATE TABLE rekap_harian_absensi (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  tanggal date,
  status text check (status in ('hadir', 'terlambat', 'tidak_hadir', 'izin', 'sakit')),
  menit_terlambat integer default 0,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, tanggal)
);

-- Tabel Hari Libur
CREATE TABLE hari_libur (
  id uuid default uuid_generate_v4() primary key,
  tanggal date unique,
  keterangan text
);
```

### Cara Menggunakan SQL
1. Buka Supabase Dashboard
2. Pilih project Anda
3. Buka menu "SQL Editor"
4. Copy-paste SQL di atas
5. Klik "Run" atau "Execute"

### Deskripsi Tabel

#### Tabel Users
- `id`: UUID (Primary Key, references auth.users)
- `email`: Text (Unique)
- `full_name`: Text
- `role`: Text (admin/employee)
- `created_at`: Timestamp

#### Tabel Attendance
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key ke Users)
- `check_in`: Timestamp
- `check_out`: Timestamp
- `check_in_photo_url`: Text
- `check_out_photo_url`: Text
- `check_in_location`: JSONB
- `check_out_location`: JSONB
- `status`: Text (present/late/absent)
- `created_at`: Timestamp

#### Tabel Kehadiran
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key ke Users)
- `tanggal`: Date
- `jam_masuk`: Timestamp
- `jam_keluar`: Timestamp
- `foto_masuk`: Text
- `foto_keluar`: Text
- `lokasi_masuk`: JSONB
- `lokasi_keluar`: JSONB
- `status`: Text (hadir/terlambat/tidak_hadir/izin/sakit)
- `keterangan`: Text
- `created_at`: Timestamp

#### Tabel Analisis Performa
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key ke Users)
- `bulan`: Integer
- `tahun`: Integer
- `total_hadir`: Integer
- `total_terlambat`: Integer
- `total_tidak_hadir`: Integer
- `total_izin`: Integer
- `total_sakit`: Integer
- `skor_performa`: Numeric
- `created_at`: Timestamp

#### Tabel Penilaian Performa
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key ke Users)
- `penilai_id`: UUID (Foreign Key ke Users)
- `periode`: Text
- `skor_kehadiran`: Numeric
- `skor_kinerja`: Numeric
- `skor_kerjasama`: Numeric
- `skor_kepemimpinan`: Numeric
- `skor_total`: Numeric
- `komentar`: Text
- `created_at`: Timestamp

#### Tabel Shift Kerja
- `id`: UUID (Primary Key)
- `nama_shift`: Text
- `jam_mulai`: Time
- `jam_selesai`: Time
- `created_at`: Timestamp

#### Tabel Penugasan Shift
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key ke Users)
- `shift_id`: UUID (Foreign Key ke Shift Kerja)
- `tanggal_mulai`: Date
- `tanggal_selesai`: Date
- `created_at`: Timestamp

#### Tabel Rekap Harian Absensi
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key ke Users)
- `tanggal`: Date
- `status`: Text (hadir/terlambat/tidak_hadir/izin/sakit)
- `menit_terlambat`: Integer
- `check_in`: Timestamp
- `check_out`: Timestamp
- `created_at`: Timestamp

#### Tabel Hari Libur
- `id`: UUID (Primary Key)
- `tanggal`: Date (Unique)
- `keterangan`: Text

## Penggunaan

### Login Admin
1. Buka halaman login
2. Masukkan email dan password admin
3. Setelah login, Anda akan diarahkan ke dashboard

### Manajemen Karyawan
1. Dari dashboard, pilih menu "Karyawan"
2. Tambah karyawan baru dengan mengisi form
3. Edit atau hapus data karyawan yang ada

### Pencatatan Absensi
1. Pilih menu "Absensi"
2. Pilih karyawan dan tanggal
3. Catat waktu check-in dan check-out
4. Simpan data absensi

## Deployment

### Deploy ke Vercel
1. Push kode ke GitHub
2. Buka [Vercel](https://vercel.com)
3. Import project dari GitHub
4. Tambahkan environment variables
5. Deploy

### Environment Variables di Vercel
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Troubleshooting

### Error Database
- Pastikan struktur tabel sesuai dengan yang ada di README
- Periksa koneksi database di Supabase

### Error Login
- Pastikan email dan password benar
- Periksa role user di database

### Error Deployment
- Pastikan semua environment variables terisi
- Periksa log build di Vercel

## Kontribusi

1. Fork repository
2. Buat branch baru (`git checkout -b fitur-baru`)
3. Commit perubahan (`git commit -m 'Menambah fitur baru'`)
4. Push ke branch (`git push origin fitur-baru`)
5. Buat Pull Request

## Lisensi

MIT License - lihat file [LICENSE](LICENSE) untuk detail

## Kontak

- Email: m._nur_imam_fiqih@teknokrat.ac.id
- GitHub: [patpaw111](https://github.com/patpaw111)
