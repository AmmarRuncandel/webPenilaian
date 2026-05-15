import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

const TABLE = 'penilaian';

export async function GET() {
  try {
    if (!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured on server' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .order('kelompok_id', { ascending: true })
      .order('nama_peserta', { ascending: true });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
