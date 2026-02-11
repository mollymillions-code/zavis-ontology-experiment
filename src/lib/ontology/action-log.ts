// ========== PALANTIR ONTOLOGY — IMMUTABLE ACTION AUDIT LOG ==========
// Every mutation goes through an Action → gets logged here.
// The action_log table is append-only (immutable audit trail).

import type { ActionTypeName } from './action-types';
import type {
  ActionLogEntry,
  ActionMutationRecord,
} from '@/lib/models/platform-types';

// Re-export for convenience
export type { ActionLogEntry, ActionMutationRecord };

/** Generate a unique ID for an action log entry */
export function generateActionId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a new action log entry */
export function createActionLogEntry(
  actionType: ActionTypeName,
  inputs: Record<string, unknown>,
  mutations: ActionMutationRecord[],
  actor: string = 'system',
  metadata?: Record<string, unknown>,
): ActionLogEntry {
  return {
    id: generateActionId(),
    actionType,
    actor,
    timestamp: new Date().toISOString(),
    inputs,
    mutations,
    metadata,
  };
}
