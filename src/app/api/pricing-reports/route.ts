import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { pricingReports } from '@/db/schema';

export async function GET() {
  try {
    const rows = await db.select().from(pricingReports).orderBy(desc(pricingReports.createdAt));
    const reports = rows.map((r) => ({
      id: r.id as string,
      prospectName: r.prospectName as string,
      report: r.report,
      conversation: r.conversation,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      createdBy: r.createdBy as string | null,
    }));
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching pricing reports:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prospectName, report, conversation } = body;

    if (!prospectName || !report) {
      return NextResponse.json({ error: 'prospectName and report are required' }, { status: 400 });
    }

    const id = `pr-${Date.now()}`;
    await db.insert(pricingReports).values({
      id,
      prospectName,
      report,
      conversation: conversation || [],
      createdAt: new Date(),
      createdBy: body.createdBy || null,
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Error saving pricing report:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
