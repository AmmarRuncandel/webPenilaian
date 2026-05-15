import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import supabaseAdmin from '@/lib/supabaseAdmin';

type KelompokMentorRow = {
  kelompok_id: number | string | null;
  nama_mentor: string | null;
};

type KelompokCard = {
  kelompok_id: number;
  nama_mentor: string;
};

const getKelompokList = async (): Promise<KelompokCard[]> => {
  const { data, error } = await supabaseAdmin
    .from('penilaian')
    .select('kelompok_id, nama_mentor')
    .order('kelompok_id', { ascending: true });

  if (error) {
    console.error('Error fetching kelompok list:', error);
    return [];
  }

  const uniqueKelompok = new Map<number, string>();

  (data ?? []).forEach((row) => {
    const currentRow = row as KelompokMentorRow;
    const kelompokId =
      typeof currentRow.kelompok_id === 'string'
        ? parseInt(currentRow.kelompok_id, 10)
        : currentRow.kelompok_id;

    if (!Number.isFinite(kelompokId as number)) {
      return;
    }

    const mentorName = currentRow.nama_mentor?.trim() || 'Belum ada mentor';

    if (!uniqueKelompok.has(kelompokId as number) || mentorName !== 'Belum ada mentor') {
      uniqueKelompok.set(kelompokId as number, mentorName);
    }
  });

  return Array.from(uniqueKelompok.entries())
    .map(([kelompok_id, nama_mentor]) => ({ kelompok_id, nama_mentor }))
    .sort((a, b) => a.kelompok_id - b.kelompok_id);
};

export default async function KelompokPage() {
  const kelompokList = await getKelompokList();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <span className="mb-6 inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-sky-400">
              <ArrowLeft className="w-5 h-5" />
              <span>Kembali</span>
            </span>
          </Link>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2">
              Pilih Kelompok
            </h1>
            <p className="text-slate-400 text-sm md:text-base">
              Pilih kelompok yang akan dinilai
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {kelompokList.map((kelompok) => (
            <Link
              key={kelompok.kelompok_id}
              href={`/kelompok/${kelompok.kelompok_id}`}
              className="group relative flex min-h-[220px] flex-col justify-between rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-left shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-sky-500 hover:from-sky-600 hover:to-blue-700 hover:shadow-sky-500/30"
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
                <p className="text-2xl font-bold text-slate-100 group-hover:text-white transition-colors">
                  {kelompok.kelompok_id}
                </p>
                <p className="mt-1 px-2 text-[10px] font-medium text-slate-400 text-center md:text-xs line-clamp-2 group-hover:text-slate-100/90">
                  {kelompok.nama_mentor}
                </p>
              </div>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 opacity-0 group-hover:opacity-10 transition-opacity" />
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-slate-800/50 border border-slate-700 rounded-lg px-6 py-3">
            <p className="text-slate-400 text-sm">
              Total: <span className="text-sky-400 font-semibold">{kelompokList.length} Kelompok</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
