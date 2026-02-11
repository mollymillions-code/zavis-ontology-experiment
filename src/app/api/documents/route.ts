import { NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadToS3, buildS3Key } from '@/lib/s3';

// GET /api/documents?entityType=client&entityId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.entityType, entityType), eq(documents.entityId, entityId)));

  return NextResponse.json(rows);
}

// POST /api/documents — upload a document to S3 and record in DB
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;
    const documentType = (formData.get('documentType') as string) || 'contract';
    const extractionDataStr = formData.get('extractionData') as string | null;

    if (!file || !entityType || !entityId) {
      return NextResponse.json({ error: 'file, entityType, and entityId required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = buildS3Key(entityType, entityId, file.name);

    await uploadToS3(s3Key, buffer, file.type);

    const docId = `doc-${Date.now()}`;
    const extractionData = extractionDataStr ? JSON.parse(extractionDataStr) : null;

    await db.insert(documents).values({
      id: docId,
      entityType,
      entityId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      s3Key,
      documentType,
      extractionData,
      uploadedAt: new Date(),
    });

    return NextResponse.json({ id: docId, s3Key });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Document upload error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
