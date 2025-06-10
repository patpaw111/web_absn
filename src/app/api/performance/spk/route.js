import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const bulan = Number(url.searchParams.get('bulan'))
    const tahun = Number(url.searchParams.get('tahun'))
    const minggu = Number(url.searchParams.get('minggu') || 0)

    console.log('API SPK called with params:', { bulan, tahun, minggu })

    if (!bulan || !tahun) {
      return NextResponse.json({ error: 'Bulan dan tahun harus diisi' }, { status: 400 })
    }

    // Helper untuk format Date ke YYYY-MM-DD dalam timezone lokal
    const formatDateToYYYYMMDD = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper untuk mendapatkan daftar tanggal antara dua tanggal (inklusif)
    const getDatesBetween = (startDate, endDate) => {
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(formatDateToYYYYMMDD(currentDate));
            currentDate.setDate(currentDate.getDate() + 1); // Pindah ke hari berikutnya
        }
        return dates;
    };

    // Hitung tanggal awal dan akhir bulan dengan benar
    const startDate = new Date(tahun, bulan - 1, 1)
    const endDate = new Date(tahun, bulan, 1) // Hari pertama bulan berikutnya

    console.log('Original Date objects:', { startDate, endDate });
    const startFormatted = formatDateToYYYYMMDD(startDate);
    const endFormatted = formatDateToYYYYMMDD(endDate); 

    console.log('Formatted Date strings for query:', { start: startFormatted, end: endFormatted });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // 1. Ambil semua user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, full_name')

    if (userError) {
      console.error('Error fetching users:', userError)
      return NextResponse.json({ error: 'Error fetching users: ' + userError.message }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ data: [], message: 'Tidak ada data user' })
    }

    console.log('Users count:', users.length)

    // Ambil data dari attendance, shift_kerja, dan penugasan_shift
    const { data: attendance_records, error: attError } = await supabase
      .from('attendance')
      .select('user_id, check_in')
      .gte('check_in', startDate.toISOString())
      .lt('check_in', endDate.toISOString())
      .in('user_id', users.map(u => u.id))

    if (attError) {
      console.error('Error fetching attendance_records:', attError);
      return NextResponse.json({ error: 'Error fetching attendance records: ' + attError.message }, { status: 500 });
    }
    console.log('Raw attendance records fetched:', attendance_records);
    console.log('Attendance records count:', attendance_records?.length || 0);

    const { data: shifts, error: shiftError } = await supabase
      .from('shift_kerja')
      .select('id, jam_mulai');

    if (shiftError) {
      console.error('Error fetching shifts:', shiftError);
      return NextResponse.json({ error: 'Error fetching shifts: ' + shiftError.message }, { status: 500 });
    }
    console.log('Shifts count:', shifts?.length || 0);
    const shiftMap = new Map(shifts.map(s => [s.id, s.jam_mulai]));

    // Ambil penugasan shift yang tumpang tindih dengan periode yang dipilih
    const { data: assignments, error: assignError } = await supabase
      .from('penugasan_shift')
      .select('user_id, shift_id, tanggal_mulai, tanggal_selesai')
      // Pastikan tanggal_mulai berada dalam atau sebelum periode query
      .lte('tanggal_mulai', endFormatted)
      // Pastikan tanggal_selesai berada dalam atau setelah periode query (atau null)
      .or(`tanggal_selesai.is.null,tanggal_selesai.gte.${startFormatted}`)
      .in('user_id', users.map(u => u.id));

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
      return NextResponse.json({ error: 'Error fetching shift assignments: ' + assignError.message }, { status: 500 });
    }
    console.log('Raw shift assignments fetched:', assignments);
    console.log('Shift assignments count:', assignments?.length || 0);

    // Inisialisasi userMap dengan kriteria mentah
    const userMap = {}
    for (const user of users) {
      userMap[user.id] = {
        user_id: user.id,
        full_name: user.full_name,
        // Data absensi mentah
        total_hadir: 0,
        total_terlambat: 0,
        total_tidak_hadir: 0,
        total_izin: 0,
        total_sakit: 0,
        total_hari_kerja: 0,
        
        // Skor akhir performa
        skor_performa: null, // Default to null
      }
    }

    // Build a map for quick attendance lookup: user_id -> date -> attendance_record
    const attendanceLookup = new Map();
    for (const rec of attendance_records) {
        const localCheckInDate = new Date(rec.check_in);
        const dateKey = formatDateToYYYYMMDD(localCheckInDate); 

        if (dateKey && !attendanceLookup.has(rec.user_id)) {
            attendanceLookup.set(rec.user_id, new Map());
        }
        if (dateKey) {
            attendanceLookup.get(rec.user_id).set(dateKey, rec);
        }
    }

    // === REVISI LOGIKA POPULASI ABSENSI ===
    // Map untuk menyimpan hari-hari kerja yang ditugaskan untuk setiap user dalam periode query
    const assignedWorkDaysPerUser = new Map(); // user_id -> Set<date_string>

    for (const assignment of assignments) {
        const userId = assignment.user_id;
        const assignStartDate = new Date(assignment.tanggal_mulai); // Tanggal mulai penugasan
        // Tanggal selesai penugasan, jika null anggap sampai akhir periode query
        const assignEndDate = assignment.tanggal_selesai ? new Date(assignment.tanggal_selesai) : endDate;

        // Tentukan periode efektif penugasan yang tumpang tindih dengan periode query
        const effectiveStartDate = new Date(Math.max(assignStartDate.getTime(), startDate.getTime()));
        const effectiveEndDate = new Date(Math.min(assignEndDate.getTime(), endDate.getTime()));

        // Pastikan periode efektif valid
        if (effectiveStartDate > effectiveEndDate) {
            continue;
        }

        const daysInThisAssignment = getDatesBetween(effectiveStartDate, effectiveEndDate); // Mendapatkan setiap hari dalam rentang

        if (!assignedWorkDaysPerUser.has(userId)) {
            assignedWorkDaysPerUser.set(userId, new Map());
        }
        // Simpan setiap hari yang ditugaskan dengan shiftId-nya
        for (const dayString of daysInThisAssignment) {
            assignedWorkDaysPerUser.get(userId).set(dayString, assignment.shift_id);
        }
    }
    console.log('Assigned work days per user:', Object.fromEntries(assignedWorkDaysPerUser));

    // Populate absensi data berdasarkan assignedWorkDaysPerUser dan attendanceLookup
    for (const userId in userMap) {
        const userAssignedDays = assignedWorkDaysPerUser.get(userId);

        if (!userAssignedDays) {
            userMap[userId].total_hadir = 0;
            userMap[userId].total_terlambat = 0;
            userMap[userId].total_tidak_hadir = 0;
            userMap[userId].total_hari_kerja = 0; 
            userMap[userId].skor_performa = null; // Menyetel skor menjadi null jika tidak ada penugasan shift
            continue; // Lanjutkan ke karyawan berikutnya, abaikan perhitungan SAW
        }

        // Set total_hari_kerja berdasarkan total hari yang ditugaskan untuk periode tersebut
        userMap[userId].total_hari_kerja = userAssignedDays.size;

        for (const [assignedDate, shiftId] of userAssignedDays.entries()) {
            console.log(`  Processing day: ${assignedDate} for user ${userId}`); // Log per hari
            const attendanceRecord = attendanceLookup.get(userId)?.get(assignedDate);
            const shiftStartTime = shiftMap.get(shiftId);

            if (!shiftStartTime) {
                console.log(`    No shift start time for day ${assignedDate}. Incrementing total_tidak_hadir.`); // Log detail
                userMap[userId].total_tidak_hadir++;
                continue;
            }

            const [shiftHour, shiftMinute] = shiftStartTime.split(':').map(Number);
            const shiftStartCompare = new Date(0, 0, 0, shiftHour, shiftMinute, 0, 0);
            const shiftGracePeriodEndCompare = new Date(0, 0, 0, shiftHour, shiftMinute + 30, 0, 0);

            if (attendanceRecord && attendanceRecord.check_in) {
                const checkinTime = new Date(attendanceRecord.check_in);
                const checkinHour = checkinTime.getHours();
                const checkinMinute = checkinTime.getMinutes();
                const checkinCompare = new Date(0, 0, 0, checkinHour, checkinMinute, 0, 0);

                console.log(`    Check-in found for ${assignedDate}. CheckinTime: ${checkinTime.toISOString()}, ShiftStartTime: ${shiftStartTime}`); // Log detail
                
                // Defenisi Hadir: Karyawan melakukan check-in untuk hari yang ditugaskan
                userMap[userId].total_hadir++;
                console.log(`    total_hadir incremented. Current total_hadir: ${userMap[userId].total_hadir}`); // Log detail

                // Defenisi Terlambat: jika jam masuk lewat dari jam mulai shift
                if (checkinCompare > shiftStartCompare) {
                    userMap[userId].total_terlambat++;
                    console.log(`    Check-in was late. Current total_terlambat: ${userMap[userId].total_terlambat}`); // Log detail
                }

            } else {
                console.log(`    No check-in found for ${assignedDate}. Incrementing total_tidak_hadir.`); // Log detail
                // Karyawan tidak hadir (tidak ada record attendance atau check_in null) untuk hari yang ditugaskan
                userMap[userId].total_tidak_hadir++;
                console.log(`    Current total_tidak_hadir: ${userMap[userId].total_tidak_hadir}`); // Log detail
            }
            console.log(`  UserMap for ${userId} after day ${assignedDate}:`, userMap[userId]); // Log detail per hari
        }
    }

    console.log('UserMap state after attendance processing (FINAL):', userMap); // Log FINAL userMap

    // Menghitung skor performa untuk setiap karyawan (Sistem Poin Baru)
    const result = [];
    for (const userId in userMap) {
      const user = userMap[userId];

      console.log(`[Perhitungan Poin] User: ${user.full_name}, ID: ${user.user_id}, Total Hari Kerja: ${user.total_hari_kerja}`);

      // Jika karyawan tidak memiliki hari kerja yang ditugaskan (total_hari_kerja adalah 0),
      // maka skor performa mereka adalah null dan tidak perlu dihitung lebih lanjut.
      if (user.total_hari_kerja === 0) {
        // skor_performa sudah null dari inisialisasi
        result.push({
          id: userId,
          nama: user.full_name,
          total_hari_kerja: user.total_hari_kerja,
          total_hadir: user.total_hadir,
          total_terlambat: user.total_terlambat,
          total_tidak_hadir: user.total_tidak_hadir,
          persentase_kehadiran: "0.00",
          skor_performa: null
        });
        continue; // Lanjutkan ke karyawan berikutnya
      }

      // Mulai dengan skor 100
      let skorAkhir = 100;

      // Hitung persentase kehadiran (untuk tampilan, tidak langsung mengurangi/menambah dari 100)
      const persentaseKehadiran = (user.total_hadir / user.total_hari_kerja) * 100;

      // Kurangi poin berdasarkan keterlambatan
      const penguranganTerlambat = user.total_terlambat * 5; // Contoh: 5 poin per keterlambatan
      skorAkhir -= penguranganTerlambat;

      // Kurangi poin berdasarkan ketidakhadiran
      const penguranganTidakHadir = user.total_tidak_hadir * 10; // Contoh: 10 poin per ketidakhadiran
      skorAkhir -= penguranganTidakHadir;

      // Pastikan skor tidak di bawah 0
      skorAkhir = Math.max(0, skorAkhir);

      // Simpan skor ke userMap
      user.skor_performa = skorAkhir;

      // Tambahkan data untuk response
      result.push({
        id: userId,
        nama: user.full_name,
        total_hari_kerja: user.total_hari_kerja,
        total_hadir: user.total_hadir,
        total_terlambat: user.total_terlambat,
        total_tidak_hadir: user.total_tidak_hadir,
        persentase_kehadiran: persentaseKehadiran.toFixed(2),
        skor_performa: skorAkhir
      });
    }

    // Urutkan berdasarkan skor performa (descending)
    result.sort((a, b) => {
      // Tangani null untuk pengurutan: null dianggap lebih rendah (muncul di akhir)
      if (a.skor_performa === null && b.skor_performa === null) return 0;
      if (a.skor_performa === null) return 1; // a (null) goes after b
      if (b.skor_performa === null) return -1; // b (null) goes after a
      return b.skor_performa - a.skor_performa;
    });

    console.log('Final calculation results (backend - new point system):', result);

    // Hitung metrik agregat
    const totalKaryawan = users.length;
    let membutuhkanPembinaan = 0;
    let totalSkorPerforma = 0;
    let countValidSkor = 0;

    for (const user of result) {
      if (user.skor_performa !== null) {
        if (user.skor_performa < 70) {
          membutuhkanPembinaan++;
        }
        totalSkorPerforma += user.skor_performa;
        countValidSkor++;
      }
    }

    const skorRataRata = countValidSkor > 0 ? (totalSkorPerforma / countValidSkor).toFixed(2) : 0;

    console.log('Final result array:', result);
    console.log('Aggregate Metrics: ', { totalKaryawan, membutuhkanPembinaan, skorRataRata });

    return NextResponse.json({
      data: result,
      totalKaryawan: totalKaryawan,
      membutuhkanPembinaan: membutuhkanPembinaan,
      skorRataRata: parseFloat(skorRataRata),
      message: 'Data performa karyawan berhasil diambil'
    });
  } catch (error) {
    console.error('Error in GET /api/performance/spk:', error);
    return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
  }
} 