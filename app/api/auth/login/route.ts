import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: 'Direct login is disabled on test subdomain. Login on main app first.',
    },
    { status: 403 }
  );
}
