import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';

const TABLE = 'penilaian';

export async function POST(request: NextRequest) {
  // Add new peserta
  try {
    const body = await request.json();
    const { kelompok_id, nama_peserta } = body;

    if (!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured on server' }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin.from(TABLE).insert([
      {
        kelompok_id,
        nama_peserta,
      },
    ]);

    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const kelompokId = url.searchParams.get('kelompok_id');

    if (!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured on server' }, { status: 500 });
    }

    if (!kelompokId) {
      return NextResponse.json({ error: 'kelompok_id is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('*')
      .eq('kelompok_id', parseInt(kelompokId))
      .order('nama_peserta', { ascending: true });

    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Update single field for a peserta (debounced auto-save)
  try {
    const body = await request.json();
    const { id, field, value } = body;

    if (!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured on server' }, { status: 500 });
    }

    const { error } = await supabaseAdmin.from(TABLE).update({ [field]: value }).eq('id', id);
    if (error) return NextResponse.json({ error }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Bulk update (used when user clicks Save Perubahan)
  try {
    const body = await request.json();
    const { pesertaList } = body;

    if (!process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key not configured on server' }, { status: 500 });
    }

    // perform updates sequentially to keep code simple
    for (const peserta of pesertaList) {
      const { id, ...fields } = peserta;
      const { error } = await supabaseAdmin.from(TABLE).update(fields).eq('id', id);
      if (error) return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
