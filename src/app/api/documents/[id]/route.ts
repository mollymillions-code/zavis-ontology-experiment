import { NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSignedDownloadUrl, deleteFromS3 } from '@/lib/s3';

// GET /api/documents/[id] — get a signed download URL
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await db.select().from(documents).where(eq(documents.id, params.id));
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = rows[0];
    const url = await getSignedDownloadUrl(doc.s3Key);

    return NextResponse.json({ ...doc, downloadUrl: url });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

// DELETE /api/documents/[id] — delete from S3 and DB
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const rows = await db.select().from(documents).where(eq(documents.id, params.id));
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const doc = rows[0];
    await deleteFromS3(doc.s3Key);
    await db.delete(documents).where(eq(documents.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
