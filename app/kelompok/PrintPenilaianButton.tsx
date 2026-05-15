'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable, { type CellHookData } from 'jspdf-autotable';

type PenilaianReportRow = {
  id: string;
  kelompok_id: number | string | null;
  nama_peserta: string | null;
  npm?: string | null;
  npm_peserta?: string | null;
  nama_mentor?: string | null;
  p1?: number | string | null;
  p2?: number | string | null;
  p3?: number | string | null;
  p4?: number | string | null;
  p5?: number | string | null;
  mentoring?: number | string | null;
  tugas_web?: number | string | null;
  tugas_video?: number | string | null;
  tugas_swot?: number | string | null;
  aktif_mentor?: number | string | null;
  aktif_kader?: number | string | null;
  etika_persyaratan?: number | string | null;
  etika_sikap?: number | string | null;
  etika_mentor?: number | string | null;
  etika_kader?: number | string | null;
};

type ReportResponse = {
  data?: PenilaianReportRow[];
  error?: unknown;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeKelompokId = (value: number | string | null): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const calculateTotals = (row: PenilaianReportRow) => {
  const hadir = toNumber(row.p1) + toNumber(row.p2) + toNumber(row.p3) + toNumber(row.p4) + toNumber(row.p5) + toNumber(row.mentoring);
  const tugas = toNumber(row.tugas_web) + toNumber(row.tugas_video) + toNumber(row.tugas_swot);
  const aktif = toNumber(row.aktif_mentor) + toNumber(row.aktif_kader);
  const etika = toNumber(row.etika_persyaratan) + toNumber(row.etika_sikap) + toNumber(row.etika_mentor) + toNumber(row.etika_kader);
  const total = hadir + tugas + aktif + etika;
  const status = total >= 75 ? 'LULUS' : 'TIDAK LULUS';

  return { hadir, tugas, aktif, etika, total, status };
};

const getPesertaDisplay = (row: PenilaianReportRow) => {
  const nama = row.nama_peserta?.trim() || '-';
  const npm = row.npm?.trim() || row.npm_peserta?.trim() || '-';
  return `${nama}\n(${npm})`;
};

export default function PrintPenilaianButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch('/api/penilaian/laporan', {
        method: 'GET',
        cache: 'no-store',
      });

      const payload = (await response.json()) as ReportResponse;
      if (!response.ok) {
        throw new Error('Gagal mengambil data laporan dari server');
      }

      const rows = payload.data ?? [];

      const groupedByKelompok = new Map<number, PenilaianReportRow[]>();
      for (let kelompokId = 1; kelompokId <= 20; kelompokId += 1) {
        groupedByKelompok.set(kelompokId, []);
      }

      rows.forEach((row) => {
        const kelompokId = normalizeKelompokId(row.kelompok_id);
        if (!kelompokId || kelompokId < 1 || kelompokId > 20) {
          return;
        }

        groupedByKelompok.get(kelompokId)?.push(row);
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('LAPORAN AKHIR PENILAIAN LKM INFORMATIKA 2026', 105, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Rekap seluruh peserta (Kelompok 1-20)', 105, 21, { align: 'center' });

      let currentY = 27;

      for (let kelompokId = 1; kelompokId <= 20; kelompokId += 1) {
        if (currentY > 265) {
          doc.addPage();
          currentY = 15;
        }

        const pesertaKelompok = groupedByKelompok.get(kelompokId) ?? [];
        const mentorName = pesertaKelompok.find((item) => (item.nama_mentor ?? '').trim().length > 0)?.nama_mentor?.trim() || 'Belum ada mentor';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`KELOMPOK ${kelompokId} - Mentor: ${mentorName}`, 14, currentY);

        const bodyRows: Array<Array<string | number>> =
          pesertaKelompok.length > 0
            ? pesertaKelompok.map((row, index) => {
                const totals = calculateTotals(row);

                return [
                  index + 1,
                  getPesertaDisplay(row),
                  totals.hadir,
                  totals.tugas,
                  totals.aktif,
                  totals.etika,
                  totals.total,
                  totals.status,
                ];
              })
            : [[1, '-\n(-)', 0, 0, 0, 0, 0, 'TIDAK LULUS']];

        autoTable(doc, {
          startY: currentY + 2,
          theme: 'striped',
          head: [['NO', 'NAMA & NPM', 'HADIR', 'TUGAS', 'AKTIF', 'ETIKA', 'TOTAL', 'STATUS']],
          body: bodyRows,
          styles: {
            fontSize: 8.5,
            cellPadding: 1.8,
            valign: 'middle',
          },
          headStyles: {
            fillColor: [3, 105, 161],
            textColor: 255,
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { cellWidth: 66 },
            2: { halign: 'center', cellWidth: 16 },
            3: { halign: 'center', cellWidth: 16 },
            4: { halign: 'center', cellWidth: 16 },
            5: { halign: 'center', cellWidth: 16 },
            6: { halign: 'center', cellWidth: 16 },
            7: { halign: 'center', cellWidth: 24 },
          },
          didParseCell: (hookData: CellHookData) => {
            if (hookData.section !== 'body' || hookData.column.index !== 7) {
              return;
            }

            const rawStatus = String(hookData.cell.raw || '').toUpperCase();
            if (rawStatus === 'LULUS') {
              hookData.cell.styles.textColor = [22, 163, 74];
              hookData.cell.styles.fontStyle = 'bold';
            } else if (rawStatus === 'TIDAK LULUS') {
              hookData.cell.styles.textColor = [220, 38, 38];
              hookData.cell.styles.fontStyle = 'bold';
            }
          },
        });

        const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
        currentY = (finalY ?? currentY + 24) + 8;
      }

      doc.save('Rekap Nilai LKM 2026.pdf');
    } catch (error) {
      console.error('Error generating PDF report:', error);
      alert('Gagal membuat PDF laporan. Silakan coba lagi.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGeneratePdf}
      disabled={isGenerating}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Download className="h-4 w-4" />
      {isGenerating ? 'Menyiapkan PDF...' : 'Print Laporan Penilaian'}
    </button>
  );
}
