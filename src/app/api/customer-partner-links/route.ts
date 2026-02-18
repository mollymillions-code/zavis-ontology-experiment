import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customerPartnerLinks } from '@/db/schema';
import { dbRowToCustomerPartnerLink } from '@/db/mappers';

export async function GET() {
  try {
    const rows = await db.select().from(customerPartnerLinks);
    return NextResponse.json(rows.map(r => dbRowToCustomerPartnerLink(r as Record<string, unknown>)));
  } catch (error) {
    console.error('Error fetching customer-partner links:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
