'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl w-full text-center"
      >
        {/* Icon Header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          <div className="bg-sky-500/10 p-4 rounded-full border-2 border-sky-500/30">
            <img src="/Logo_LKM.png" alt="Logo LKM" className="w-24 h-24 object-contain" />
          </div>
        </motion.div>

        {/* Judul Utama */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent"
        >
          Penilaian Digital
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl md:text-3xl font-semibold text-slate-200 mb-3"
        >
          LKM Informatika 2026
        </motion.h2>

        {/* Jargon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <p className="text-lg md:text-xl text-sky-400 font-medium italic">
            "Erat Persatuan, Kokoh Pembaharuan"
          </p>
        </motion.div>

        {/* Deskripsi */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed max-w-xl mx-auto"
        >
          Platform digital untuk memudahkan mentor dalam melakukan penilaian
          peserta LKM secara real-time, akurat, dan terstruktur.
        </motion.p>

        {/* Tombol Utama */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Link href="/kelompok">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group bg-gradient-to-r from-sky-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 transition-all duration-300 flex items-center gap-3 mx-auto"
            >
              <Users className="w-6 h-6" />
              Masuk ke Penilaian
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowRight className="w-6 h-6" />
              </motion.div>
            </motion.button>
          </Link>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 pt-8 border-t border-slate-800"
        >
          <p className="text-slate-500 text-sm">
            Sistem Penilaian LKM © 2026 | Informatika
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
