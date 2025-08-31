import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Log client-reported errors on the server
    // Intentionally minimal for now per requirements
    // eslint-disable-next-line no-console
    console.error('[client-error-report]', body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[client-error-report] Failed to parse body', e);
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
}

