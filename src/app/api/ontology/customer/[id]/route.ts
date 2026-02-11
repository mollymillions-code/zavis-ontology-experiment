import { NextResponse } from 'next/server';
import { getEnrichedCustomer } from '@/lib/ontology/service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const enriched = await getEnrichedCustomer(id);
  if (!enriched) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }
  return NextResponse.json(enriched);
}
