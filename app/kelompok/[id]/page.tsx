'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase, PenilaianData, MAX_VALUES } from '@/lib/supabase';

// Helper untuk menghitung total per kategori (AKUMULASI POIN MURNI)
const calculateTotals = (data: PenilaianData) => {
  const totalHadir = data.p1 + data.p2 + data.p3 + data.p4 + data.p5 + data.mentoring;
  const totalTugas = data.tugas_web + data.tugas_video + data.tugas_swot;
  const totalAktif = data.aktif_mentor + data.aktif_kader;
  const totalEtika = data.etika_persyaratan + data.etika_sikap + data.etika_mentor + data.etika_kader;
  const nilaiAkhir = totalHadir + totalTugas + totalAktif + totalEtika;
  const status = nilaiAkhir >= 80 ? 'LULUS' : 'TIDAK LULUS';

  return { totalHadir, totalTugas, totalAktif, totalEtika, nilaiAkhir, status };
};

export default function DashboardPenilaian() {
  const params = useParams();
  const kelompokId = parseInt(params.id as string);

  const [pesertaList, setPesertaList] = useState<PenilaianData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPanduan, setShowPanduan] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [newPesertaName, setNewPesertaName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Debounce timer refs untuk setiap peserta
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch data dari Supabase
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/penilaian?kelompok_id=${kelompokId}`);
      const json = await res.json();
      if (!res.ok) throw json;

      const rows = json.data || [];

      // Convert numeric-like fields to numbers (Supabase may return numeric as strings)
      const numericFields = [
        'p1','p2','p3','p4','p5','mentoring',
        'tugas_web','tugas_video','tugas_swot',
        'aktif_mentor','aktif_kader',
        'etika_persyaratan','etika_sikap','etika_mentor','etika_kader'
      ];

      const normalized = rows.map((r: any) => {
        const out: any = { ...r };
        numericFields.forEach((f) => {
          if (out[f] === null || out[f] === undefined) out[f] = 0;
          // Try to coerce to number
          const n = typeof out[f] === 'string' ? parseFloat(out[f]) : out[f];
          out[f] = Number.isFinite(n) ? n : 0;
        });
        // Ensure kelompok_id is number
        out.kelompok_id = typeof out.kelompok_id === 'string' ? parseInt(out.kelompok_id) : out.kelompok_id;
        return out as PenilaianData;
      });

      setPesertaList(normalized || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, [kelompokId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Handle perubahan input dengan validasi & debounced auto-save
  const handleInputChange = (
    id: string,
    field: keyof PenilaianData,
    value: string
  ) => {
    let numValue = parseFloat(value) || 0;
    
    // VALIDASI: Jika melebihi batas maksimal, set ke nilai maksimal
    const maxValue = MAX_VALUES[field as keyof typeof MAX_VALUES];
    if (maxValue !== undefined && numValue > maxValue) {
      numValue = maxValue;
    }
    
    // Pastikan tidak negatif
    if (numValue < 0) {
      numValue = 0;
    }

    // Update local state INSTANTLY untuk UI responsif
    setPesertaList((prev) =>
      prev.map((peserta) =>
        peserta.id === id ? { ...peserta, [field]: numValue } : peserta
      )
    );

    // Clear existing debounce timer untuk peserta ini
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }

    // Set new debounce timer (auto-save setelah 1 detik tidak ada input)
    debounceTimers.current[id] = setTimeout(async () => {
      try {
        // Call server API route that uses service_role key to bypass RLS
        const res = await fetch('/api/penilaian', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, field, value: numValue }),
        });

        const json = await res.json();
        if (!res.ok) throw json;

        console.log(`Auto-saved ${field} for ${id}`);
      } catch (error) {
        console.error('Error auto-saving:', error);
        // Revert on error
        fetchData();
      }
    }, 1000); // 1 detik debounce
  };

  // Simpan semua perubahan manual (jika mentor klik tombol)
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setSaveMessage('');

      // Clear all pending debounce timers
      Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
      debounceTimers.current = {};

      // Bulk update via server API that uses service_role key
      const res = await fetch('/api/penilaian', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pesertaList }),
      });

      const json = await res.json();
      if (!res.ok) throw json;

      setSaveMessage('Semua perubahan berhasil disimpan!');
      setIsEditMode(false);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('Gagal menyimpan data. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  // Tambah peserta baru
  const handleAddPeserta = async () => {
    if (!newPesertaName.trim()) {
      alert('Nama peserta tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);

      const res = await fetch('/api/penilaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kelompok_id: kelompokId, nama_peserta: newPesertaName.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw json;

      // Refresh data
      await fetchData();
      setNewPesertaName('');
      setShowAddForm(false);
      setSaveMessage('Peserta baru berhasil ditambahkan!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error adding peserta:', error);
      alert('Gagal menambahkan peserta. Silakan coba lagi. Pastikan server environment variable NEXT_SUPABASE_SERVICE_ROLE_KEY sudah di-set.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link href="/kelompok">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Kembali</span>
                </motion.button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
                Penilaian Kelompok {kelompokId}
              </h1>
            </div>

            <div className="flex gap-2 flex-wrap">
              {!isEditMode ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg hover:shadow-amber-500/50 transition-all"
                  >
                    <span>✏️</span>
                    <span className="hidden sm:inline">Edit</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg hover:shadow-emerald-500/50 transition-all"
                  >
                    <span>+</span>
                    <span className="hidden sm:inline">Tambah Data</span>
                    <span className="sm:hidden">Tambah</span>
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setIsEditMode(false);
                      fetchData();
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg hover:shadow-slate-500/50 transition-all"
                  >
                    <span>✕</span>
                    <span className="hidden sm:inline">Batal</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold shadow-lg hover:shadow-sky-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="hidden sm:inline">Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span className="hidden sm:inline">Simpan Perubahan</span>
                        <span className="sm:hidden">Simpan</span>
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {saveMessage}
            </motion.div>
          )}

          {/* Add Peserta Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3"
            >
              <h3 className="font-semibold text-slate-200 text-lg">Tambah Peserta Baru</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPesertaName}
                  onChange={(e) => setNewPesertaName(e.target.value)}
                  placeholder="Masukkan nama peserta"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPeserta()}
                  className="flex-1 bg-slate-700 text-slate-200 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddPeserta}
                  disabled={saving}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-emerald-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Menambah...' : 'Tambah'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPesertaName('');
                  }}
                  className="bg-slate-700 text-slate-300 px-4 py-2 rounded-lg font-semibold hover:bg-slate-600 transition-all"
                >
                  Batal
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Panduan Nilai */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 sm:mb-6"
        >
          <button
            onClick={() => setShowPanduan(!showPanduan)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4 flex items-center justify-between hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <Info className="w-5 h-5 text-sky-400" />
              <span className="font-semibold text-slate-200 text-sm sm:text-base">
                Panduan Nilai Maksimal (Total: 100 Poin)
              </span>
            </div>
            {showPanduan ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {showPanduan && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="bg-slate-800/30 border border-slate-700 border-t-0 rounded-b-lg p-3 sm:p-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-blue-400 mb-2">
                    Rumpun Hadir (30)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• P1-P5: 5 = 25</li>
                    <li>• Mentoring: 5</li>
                  </ul>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-emerald-400 mb-2">
                    Rumpun Tugas (30)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Web: Maks 15</li>
                    <li>• Video: Maks 5</li>
                    <li>• SWOT: Maks 10</li>
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-amber-400 mb-2">
                    Rumpun Aktif (20)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Mentor: Maks 10</li>
                    <li>• Kader: Maks 10</li>
                  </ul>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-purple-400 mb-2">
                    Rumpun Etika (20)
                  </h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Persyaratan: Maks 5</li>
                    <li>• Sikap: Maks 5</li>
                    <li>• Mentor: Maks 5</li>
                    <li>• Kader: Maks 5</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Tabel Penilaian */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-10 bg-slate-800 px-2 sm:px-4 py-3 text-left font-semibold text-slate-200 border-r border-slate-700 min-w-[120px] sm:min-w-[150px]"
                  >
                    Nama Peserta
                  </th>
                  {/* Rumpun Hadir */}
                  <th
                    colSpan={6}
                    className="px-2 sm:px-4 py-2 text-center font-semibold text-blue-400 bg-blue-500/10 border-x border-slate-700"
                  >
                    Hadir (30)
                  </th>
                  {/* Rumpun Tugas */}
                  <th
                    colSpan={3}
                    className="px-2 sm:px-4 py-2 text-center font-semibold text-emerald-400 bg-emerald-500/10 border-x border-slate-700"
                  >
                    Tugas (30)
                  </th>
                  {/* Rumpun Aktif */}
                  <th
                    colSpan={2}
                    className="px-2 sm:px-4 py-2 text-center font-semibold text-amber-400 bg-amber-500/10 border-x border-slate-700"
                  >
                    Aktif (20)
                  </th>
                  {/* Rumpun Etika */}
                  <th
                    colSpan={4}
                    className="px-2 sm:px-4 py-2 text-center font-semibold text-purple-400 bg-purple-500/10 border-x border-slate-700"
                  >
                    Etika (20)
                  </th>
                  {/* Total & Status */}
                  <th
                    colSpan={6}
                    className="px-2 sm:px-4 py-2 text-center font-semibold text-sky-400 bg-sky-500/10 border-l border-slate-700"
                  >
                    Hasil
                  </th>
                </tr>
                <tr className="bg-slate-800/70 text-slate-300">
                  {/* Hadir */}
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P1<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P2<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P3<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P4<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P5<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-blue-500/5">Mtg<br/>(5)</th>
                  {/* Tugas */}
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-emerald-500/5">Web<br/>(15)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-emerald-500/5">Video<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-emerald-500/5">SWOT<br/>(10)</th>
                  {/* Aktif */}
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-amber-500/5">Mentor<br/>(10)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-amber-500/5">Kader<br/>(10)</th>
                  {/* Etika */}
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-purple-500/5">Syarat<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-purple-500/5">Sikap<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-purple-500/5">Mentor<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-purple-500/5">Kader<br/>(5)</th>
                  {/* Total */}
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-sky-500/10 font-bold">T.Hadir</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-sky-500/10 font-bold">T.Tugas</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-sky-500/10 font-bold">T.Aktif</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-sky-500/10 font-bold">T.Etika</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-sky-500/10 font-bold text-base">Akhir</th>
                  <th className="px-2 py-2 bg-sky-500/10 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {pesertaList.map((peserta, index) => {
                  const totals = calculateTotals(peserta);
                  return (
                    <tr
                      key={peserta.id}
                      className={`${
                        index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'
                      } hover:bg-slate-700/30 transition-colors`}
                    >
                      <td className="sticky left-0 z-10 bg-slate-800 px-2 sm:px-4 py-2 font-medium text-slate-200 border-r border-slate-700">
                        {peserta.nama_peserta}
                      </td>
                      {/* Input Hadir */}
                      {(['p1', 'p2', 'p3', 'p4', 'p5', 'mentoring'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-blue-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) =>
                              handleInputChange(peserta.id, field, e.target.value)
                            }
                            disabled={!isEditMode}
                            className="w-full bg-slate-700/50 text-slate-200 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[50px] disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </td>
                      ))}
                      {/* Input Tugas */}
                      {(['tugas_web', 'tugas_video', 'tugas_swot'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-emerald-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) =>
                              handleInputChange(peserta.id, field, e.target.value)
                            }
                            disabled={!isEditMode}
                            className="w-full bg-slate-700/50 text-slate-200 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[50px] disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </td>
                      ))}
                      {/* Input Aktif */}
                      {(['aktif_mentor', 'aktif_kader'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-amber-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) =>
                              handleInputChange(peserta.id, field, e.target.value)
                            }
                            disabled={!isEditMode}
                            className="w-full bg-slate-700/50 text-slate-200 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-amber-500 min-w-[50px] disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </td>
                      ))}
                      {/* Input Etika */}
                      {(['etika_persyaratan', 'etika_sikap', 'etika_mentor', 'etika_kader'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-purple-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) =>
                              handleInputChange(peserta.id, field, e.target.value)
                            }
                            disabled={!isEditMode}
                            className="w-full bg-slate-700/50 text-slate-200 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[50px] disabled:cursor-not-allowed disabled:opacity-70"
                          />
                        </td>
                      ))}
                      {/* Total Hadir */}
                      <td className="px-2 py-2 text-center font-semibold text-blue-400 border-r border-slate-700/50 bg-sky-500/10">
                        {totals.totalHadir}
                      </td>
                      {/* Total Tugas */}
                      <td className="px-2 py-2 text-center font-semibold text-emerald-400 border-r border-slate-700/50 bg-sky-500/10">
                        {totals.totalTugas}
                      </td>
                      {/* Total Aktif */}
                      <td className="px-2 py-2 text-center font-semibold text-amber-400 border-r border-slate-700/50 bg-sky-500/10">
                        {totals.totalAktif}
                      </td>
                      {/* Total Etika */}
                      <td className="px-2 py-2 text-center font-semibold text-purple-400 border-r border-slate-700/50 bg-sky-500/10">
                        {totals.totalEtika}
                      </td>
                      {/* Nilai Akhir */}
                      <td className="px-2 py-2 text-center font-bold text-sky-400 text-base border-r border-slate-700/50 bg-sky-500/10">
                        {totals.nilaiAkhir}
                      </td>
                      {/* Status */}
                      <td className="px-2 py-2 text-center bg-sky-500/10">
                        {totals.status === 'LULUS' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs font-semibold border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            LULUS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full text-xs font-semibold border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            TIDAK LULUS
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Info Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-slate-500 text-xs sm:text-sm"
        >
          <p>
            Total Peserta: <span className="text-sky-400 font-semibold">{pesertaList.length}</span> |
            Lulus: <span className="text-emerald-400 font-semibold">
              {pesertaList.filter((p) => calculateTotals(p).status === 'LULUS').length}
            </span> |
            Tidak Lulus: <span className="text-rose-400 font-semibold">
              {pesertaList.filter((p) => calculateTotals(p).status === 'TIDAK LULUS').length}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-600">
            Nilai otomatis tersimpan 1 detik setelah Anda berhenti mengetik
          </p>
        </motion.div>
      </div>
    </div>
  );
}
