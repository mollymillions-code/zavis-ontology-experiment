import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { hashPassword, isEmailAllowed, getAllowedDomain, createSession } from '@/lib/auth';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!isEmailAllowed(trimmedEmail)) {
      return NextResponse.json(
        { error: `Only @${getAllowedDomain()} email addresses can sign up` },
        { status: 403 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await db.select().from(users).where(eq(users.email, trimmedEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const id = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await db.insert(users).values({
      id,
      email: trimmedEmail,
      passwordHash,
      name: name.trim(),
    });

    await createSession({ userId: id, email: trimmedEmail, name: name.trim() });

    return NextResponse.json({ success: true, user: { id, email: trimmedEmail, name: name.trim() } });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
