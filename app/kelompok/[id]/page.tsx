'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PenilaianData, MAX_VALUES } from '@/lib/supabase';

const calculateTotals = (data: PenilaianData) => {
  const totalHadir = data.p1 + data.p2 + data.p3 + data.p4 + data.p5 + data.mentoring;
  const totalTugas = data.tugas_web + data.tugas_video + data.tugas_swot;
  const totalAktif = data.aktif_mentor + data.aktif_kader;
  const totalEtika = data.etika_persyaratan + data.etika_sikap + data.etika_mentor + data.etika_kader;
  const nilaiAkhir = totalHadir + totalTugas + totalAktif + totalEtika;
  const status = nilaiAkhir >= 80 ? 'LULUS' : 'TIDAK LULUS';

  return { totalHadir, totalTugas, totalAktif, totalEtika, nilaiAkhir, status };
};

const MASTER_PASSWORD = 'ketuplaklkmbaik';

export default function DashboardPenilaian() {
  const params = useParams();
  const kelompokId = parseInt(params.id as string);

  const [pesertaList, setPesertaList] = useState<PenilaianData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPanduan, setShowPanduan] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return sessionStorage.getItem('lkm_mentor_auth') === 'true';
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newPesertaName, setNewPesertaName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/penilaian?kelompok_id=${kelompokId}`);
      const json = await res.json();
      if (!res.ok) throw json;

      const rows = (json.data || []) as Array<Record<string, unknown>>;
      const numericFields: Array<keyof PenilaianData> = [
        'p1', 'p2', 'p3', 'p4', 'p5', 'mentoring',
        'tugas_web', 'tugas_video', 'tugas_swot',
        'aktif_mentor', 'aktif_kader',
        'etika_persyaratan', 'etika_sikap', 'etika_mentor', 'etika_kader',
      ];

      const normalized = rows.map((row) => {
        const out: Record<string, unknown> = { ...row };
        numericFields.forEach((field) => {
          if (out[field] === null || out[field] === undefined) out[field] = 0;
          const value = typeof out[field] === 'string' ? parseFloat(out[field]) : out[field];
          out[field] = Number.isFinite(value) ? value : 0;
        });
        out.kelompok_id = typeof out.kelompok_id === 'string' ? parseInt(out.kelompok_id) : out.kelompok_id;
        return out as unknown as PenilaianData;
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
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/penilaian?kelompok_id=${kelompokId}`);
        const json = await res.json();
        if (!res.ok) throw json;

        const rows = (json.data || []) as Array<Record<string, unknown>>;
        const numericFields: Array<keyof PenilaianData> = [
          'p1', 'p2', 'p3', 'p4', 'p5', 'mentoring',
          'tugas_web', 'tugas_video', 'tugas_swot',
          'aktif_mentor', 'aktif_kader',
          'etika_persyaratan', 'etika_sikap', 'etika_mentor', 'etika_kader',
        ];

        const normalized = rows.map((row) => {
          const out: Record<string, unknown> = { ...row };
          numericFields.forEach((field) => {
            if (out[field] === null || out[field] === undefined) out[field] = 0;
            const value = typeof out[field] === 'string' ? parseFloat(out[field]) : out[field];
            out[field] = Number.isFinite(value as number) ? value : 0;
          });
          out.kelompok_id = typeof out.kelompok_id === 'string' ? parseInt(out.kelompok_id as string) : out.kelompok_id;
          return out as unknown as PenilaianData;
        });

        if (!cancelled) {
          setPesertaList(normalized || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Gagal memuat data. Silakan refresh halaman.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [kelompokId]);

  useEffect(() => {
    const timers = debounceTimers.current;

    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const handleInputChange = (id: string, field: keyof PenilaianData, value: string) => {
    let numValue = parseFloat(value) || 0;

    const maxValue = MAX_VALUES[field as keyof typeof MAX_VALUES];
    if (maxValue !== undefined && numValue > maxValue) {
      numValue = maxValue;
    }

    if (numValue < 0) {
      numValue = 0;
    }

    setPesertaList((previous) =>
      previous.map((peserta) => (peserta.id === id ? { ...peserta, [field]: numValue } : peserta))
    );

    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }

    debounceTimers.current[id] = setTimeout(async () => {
      try {
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
        fetchData();
      }
    }, 1000);
  };

  const handleVerifyPassword = () => {
    if (inputPassword === MASTER_PASSWORD) {
      sessionStorage.setItem('lkm_mentor_auth', 'true');
      setIsEditMode(true);
      setShowPasswordModal(false);
      setInputPassword('');
      setPasswordError('');
      return;
    }

    setPasswordError('Password salah! Anda bukan mentor.');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('lkm_mentor_auth');
    setIsEditMode(false);
    setShowPasswordModal(false);
    setInputPassword('');
    setPasswordError('');
  };

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

  const inputClass = isEditMode
    ? 'w-full bg-slate-950 border border-slate-700 rounded text-center focus:border-sky-500 focus:outline-none text-slate-200 min-w-[50px] px-2 py-1'
    : 'w-full bg-transparent border-none text-white text-center focus:outline-none min-w-[50px] px-2 py-1';

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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4 min-w-0">
              <Link href="/kelompok">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Kembali</span>
                </motion.button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Penilaian Kelompok {kelompokId}</h1>
            </div>

            <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
              {!isEditMode ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setInputPassword('');
                    setPasswordError('');
                    setShowPasswordModal(true);
                  }}
                  className="flex items-center gap-2 bg-slate-800 text-slate-100 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold border border-slate-700 hover:border-sky-500 hover:text-sky-300 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Buka Akses Mentor</span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="flex items-center gap-2 bg-slate-800 text-slate-100 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold border border-slate-700 hover:border-rose-500 hover:text-rose-300 transition-all"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Tutup Akses Edit</span>
                </motion.button>
              )}
            </div>
          </div>

          {isEditMode && (
            <div className="flex justify-end mb-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowAddForm(true)}
                className="text-sm text-slate-300 hover:text-sky-300 transition-colors"
              >
                Tambah peserta baru
              </motion.button>
            </div>
          )}

          {saveMessage && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 px-4 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {saveMessage}
            </motion.div>
          )}

          {isEditMode && showAddForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-slate-200 text-lg">Tambah Peserta Baru</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPesertaName}
                  onChange={(e) => setNewPesertaName(e.target.value)}
                  placeholder="Masukkan nama peserta"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPeserta()}
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

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 sm:mb-6">
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
                  <h3 className="font-semibold text-blue-400 mb-2">Rumpun Hadir (30)</h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• P1-P5: 5 = 25</li>
                    <li>• Mentoring: 5</li>
                  </ul>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-emerald-400 mb-2">Rumpun Tugas (30)</h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Web: Maks 15</li>
                    <li>• Video: Maks 5</li>
                    <li>• SWOT: Maks 10</li>
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-amber-400 mb-2">Rumpun Aktif (20)</h3>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Mentor: Maks 10</li>
                    <li>• Kader: Maks 10</li>
                  </ul>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                  <h3 className="font-semibold text-purple-400 mb-2">Rumpun Etika (20)</h3>
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto w-full pb-4 custom-scrollbar">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-20 bg-slate-900 px-2 sm:px-4 py-3 text-center font-semibold text-slate-200 border-r border-slate-700 min-w-[56px]"
                  >
                    No
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-14 sm:left-16 z-20 bg-slate-900 px-2 sm:px-4 py-3 text-left font-semibold text-slate-200 border-r border-slate-700 min-w-[140px] sm:min-w-[180px]"
                  >
                    Nama Peserta
                  </th>
                  <th colSpan={6} className="px-2 sm:px-4 py-2 text-center font-semibold text-blue-400 bg-blue-500/10 border-x border-slate-700">Hadir (30)</th>
                  <th colSpan={3} className="px-2 sm:px-4 py-2 text-center font-semibold text-emerald-400 bg-emerald-500/10 border-x border-slate-700">Tugas (30)</th>
                  <th colSpan={2} className="px-2 sm:px-4 py-2 text-center font-semibold text-amber-400 bg-amber-500/10 border-x border-slate-700">Aktif (20)</th>
                  <th colSpan={4} className="px-2 sm:px-4 py-2 text-center font-semibold text-purple-400 bg-purple-500/10 border-x border-slate-700">Etika (20)</th>
                  <th colSpan={6} className="px-2 sm:px-4 py-2 text-center font-semibold text-sky-400 bg-sky-500/10 border-l border-slate-700">Hasil</th>
                </tr>
                <tr className="bg-slate-800/70 text-slate-300">
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P1<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P2<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P3<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P4<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-blue-500/5">P5<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-blue-500/5">Mtg<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-emerald-500/5">Web<br/>(15)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-emerald-500/5">Video<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-emerald-500/5">SWOT<br/>(10)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-amber-500/5">Mentor<br/>(10)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-amber-500/5">Kader<br/>(10)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-purple-500/5">Syarat<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-purple-500/5">Sikap<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700/50 bg-purple-500/5">Mentor<br/>(5)</th>
                  <th className="px-2 py-2 border-r border-slate-700 bg-purple-500/5">Kader<br/>(5)</th>
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
                    <tr key={peserta.id} className={`${index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/50'} hover:bg-slate-700/30 transition-colors`}>
                      <td className="sticky left-0 z-20 bg-slate-900 px-2 sm:px-4 py-2 text-center font-medium text-slate-200 border-r border-slate-700 min-w-[56px]">{index + 1}</td>
                      <td className="sticky left-14 sm:left-16 z-20 bg-slate-900 px-2 sm:px-4 py-2 font-medium text-slate-200 border-r border-slate-700 min-w-[140px] sm:min-w-[180px]">{peserta.nama_peserta}</td>
                      {(['p1', 'p2', 'p3', 'p4', 'p5', 'mentoring'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-blue-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) => handleInputChange(peserta.id, field, e.target.value)}
                            disabled={!isEditMode}
                            className={inputClass}
                          />
                        </td>
                      ))}
                      {(['tugas_web', 'tugas_video', 'tugas_swot'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-emerald-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) => handleInputChange(peserta.id, field, e.target.value)}
                            disabled={!isEditMode}
                            className={inputClass}
                          />
                        </td>
                      ))}
                      {(['aktif_mentor', 'aktif_kader'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-amber-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) => handleInputChange(peserta.id, field, e.target.value)}
                            disabled={!isEditMode}
                            className={inputClass}
                          />
                        </td>
                      ))}
                      {(['etika_persyaratan', 'etika_sikap', 'etika_mentor', 'etika_kader'] as const).map((field) => (
                        <td key={field} className="px-1 py-2 border-r border-slate-700/50 bg-purple-500/5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max={MAX_VALUES[field]}
                            value={peserta[field]}
                            onChange={(e) => handleInputChange(peserta.id, field, e.target.value)}
                            disabled={!isEditMode}
                            className={inputClass}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold text-blue-400 border-r border-slate-700/50 bg-sky-500/10">{totals.totalHadir}</td>
                      <td className="px-2 py-2 text-center font-semibold text-emerald-400 border-r border-slate-700/50 bg-sky-500/10">{totals.totalTugas}</td>
                      <td className="px-2 py-2 text-center font-semibold text-amber-400 border-r border-slate-700/50 bg-sky-500/10">{totals.totalAktif}</td>
                      <td className="px-2 py-2 text-center font-semibold text-purple-400 border-r border-slate-700/50 bg-sky-500/10">{totals.totalEtika}</td>
                      <td className="px-2 py-2 text-center font-bold text-sky-400 text-base border-r border-slate-700/50 bg-sky-500/10">{totals.nilaiAkhir}</td>
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

        <AnimatePresence>
          {showPasswordModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
              >
                <h2 className="text-xl font-bold text-slate-100">Verifikasi Mentor</h2>
                <p className="mt-2 text-sm text-slate-400">Masukkan password untuk membuka mode edit.</p>

                <div className="mt-5 space-y-3">
                  <input
                    type="password"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleVerifyPassword();
                      }
                    }}
                    autoFocus
                    placeholder="Password mentor"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                  />

                  {passwordError && <p className="text-sm text-rose-400">{passwordError}</p>}

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setInputPassword('');
                        setPasswordError('');
                      }}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyPassword}
                      className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-sky-400"
                    >
                      Masuk
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-slate-500 text-xs sm:text-sm"
        >
          <p>
            Total Peserta: <span className="text-sky-400 font-semibold">{pesertaList.length}</span> |
            Lulus: <span className="text-emerald-400 font-semibold">{pesertaList.filter((p) => calculateTotals(p).status === 'LULUS').length}</span> |
            Tidak Lulus: <span className="text-rose-400 font-semibold">{pesertaList.filter((p) => calculateTotals(p).status === 'TIDAK LULUS').length}</span>
          </p>
          <p className="mt-2 text-xs text-slate-600">Nilai otomatis tersimpan 1 detik setelah Anda berhenti mengetik</p>
        </motion.div>
      </div>
    </div>
  );
}
