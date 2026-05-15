import { createClient } from '@supabase/supabase-js';

// Ambil environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Inisialisasi Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions untuk tabel penilaian
export interface PenilaianData {
  id: string;
  kelompok_id: number;
  nama_peserta: string;
  npm?: string | null;
  npm_peserta?: string | null;
  nama_mentor?: string | null;
  // Rumpun Hadir (Total 30)
  p1: number; // Maks 5
  p2: number; // Maks 5
  p3: number; // Maks 5
  p4: number; // Maks 5
  p5: number; // Maks 5
  mentoring: number; // Maks 5
  // Rumpun Tugas (Total 30)
  tugas_web: number; // Maks 15
  tugas_video: number; // Maks 5
  tugas_swot: number; // Maks 10
  // Rumpun Aktif (Total 20)
  aktif_mentor: number; // Maks 10
  aktif_kader: number; // Maks 10
  // Rumpun Etika (Total 20)
  etika_persyaratan: number; // Maks 5
  etika_sikap: number; // Maks 5
  etika_mentor: number; // Maks 5
  etika_kader: number; // Maks 5
}

type PenilaianNumericField = Exclude<keyof PenilaianData, 'id' | 'kelompok_id' | 'nama_peserta' | 'npm' | 'npm_peserta' | 'nama_mentor'>;

// Batas maksimal untuk setiap field (untuk validasi)
export const MAX_VALUES: Record<PenilaianNumericField, number> = {
  p1: 5,
  p2: 5,
  p3: 5,
  p4: 5,
  p5: 5,
  mentoring: 5,
  tugas_web: 15,
  tugas_video: 5,
  tugas_swot: 10,
  aktif_mentor: 10,
  aktif_kader: 10,
  etika_persyaratan: 5,
  etika_sikap: 5,
  etika_mentor: 5,
  etika_kader: 5,
};
