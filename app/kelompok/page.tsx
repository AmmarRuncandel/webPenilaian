'use client';

import { motion } from 'framer-motion';
import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function KelompokPage() {
  const router = useRouter();
  const kelompokList = Array.from({ length: 20 }, (_, i) => i + 1);

  const handleKelompokClick = (id: number) => {
    router.push(`/kelompok/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Kembali</span>
            </motion.button>
          </Link>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
              Pilih Kelompok
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Pilih kelompok yang akan dinilai
            </p>
          </div>
        </motion.div>

        {/* Grid Kelompok */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
        >
          {kelompokList.map((kelompok, index) => (
            <motion.button
              key={kelompok}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleKelompokClick(kelompok)}
              className="group relative bg-gradient-to-br from-slate-800 to-slate-900 hover:from-sky-600 hover:to-blue-700 border border-slate-700 hover:border-sky-500 rounded-xl p-6 transition-all duration-300 shadow-lg hover:shadow-sky-500/30"
            >
              {/* Icon */}
              <div className="flex justify-center mb-3">
                <div className="bg-slate-700 group-hover:bg-white/20 p-3 rounded-full transition-colors">
                  <Users className="w-6 h-6 text-sky-400 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Nomor Kelompok */}
              <div className="text-center">
                <p className="text-xs text-slate-400 group-hover:text-sky-200 mb-1 transition-colors">
                  Kelompok
                </p>
                <p className="text-3xl font-bold text-slate-100 group-hover:text-white transition-colors">
                  {kelompok}
                </p>
              </div>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            </motion.button>
          ))}
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="inline-block bg-slate-800/50 border border-slate-700 rounded-lg px-6 py-3">
            <p className="text-slate-400 text-sm">
              Total: <span className="text-sky-400 font-semibold">20 Kelompok</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
