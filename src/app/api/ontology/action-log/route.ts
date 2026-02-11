import { NextResponse } from 'next/server';
import { getActionLog } from '@/lib/ontology/service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit') || '50');
  const entries = await getActionLog(limit);
  return NextResponse.json(entries);
}
