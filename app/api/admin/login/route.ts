import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }));

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin password not configured.' }, { status: 500 });
  }

  if (!password || password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
