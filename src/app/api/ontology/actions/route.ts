import { NextResponse } from 'next/server';
import { executeAction } from '@/lib/ontology/service';
import type { ActionTypeName } from '@/lib/ontology/action-types';

export async function POST(req: Request) {
  const body = await req.json();
  const { actionType, inputs, actor } = body as {
    actionType: ActionTypeName;
    inputs: Record<string, unknown>;
    actor?: string;
  };

  if (!actionType || !inputs) {
    return NextResponse.json({ error: 'actionType and inputs are required' }, { status: 400 });
  }

  const result = await executeAction(actionType, inputs, actor || 'user');
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
