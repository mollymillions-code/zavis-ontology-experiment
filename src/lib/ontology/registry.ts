// ========== PALANTIR ONTOLOGY — CENTRAL REGISTRY ==========
// Single entry-point to query the ontology schema: object types, link types, actions.

import { OBJECT_TYPES, type ObjectTypeName, type ObjectTypeDefinition } from './object-types';
import { LINK_TYPES, type LinkTypeName, type LinkTypeDefinition } from './link-types';
import { ACTION_TYPES, type ActionTypeName, type ActionTypeDefinition } from './action-types';

export interface OntologyRegistry {
  objectTypes: Record<ObjectTypeName, ObjectTypeDefinition>;
  linkTypes: Record<LinkTypeName, LinkTypeDefinition>;
  actionTypes: Record<ActionTypeName, ActionTypeDefinition>;
}

/** The full Zavis ontology schema */
export const ONTOLOGY: OntologyRegistry = {
  objectTypes: OBJECT_TYPES,
  linkTypes: LINK_TYPES,
  actionTypes: ACTION_TYPES,
};

// ── Convenience getters ──

export function getObjectType(name: ObjectTypeName): ObjectTypeDefinition {
  return ONTOLOGY.objectTypes[name];
}

export function getLinkType(name: LinkTypeName): LinkTypeDefinition {
  return ONTOLOGY.linkTypes[name];
}

export function getActionType(name: ActionTypeName): ActionTypeDefinition {
  return ONTOLOGY.actionTypes[name];
}

/** Get all outgoing link types for a given object type */
export function getLinksFrom(objectTypeName: string): LinkTypeDefinition[] {
  return Object.values(ONTOLOGY.linkTypes).filter(
    (lt) => lt.sourceObjectType === objectTypeName
  );
}

/** Get all incoming link types for a given object type */
export function getLinksTo(objectTypeName: string): LinkTypeDefinition[] {
  return Object.values(ONTOLOGY.linkTypes).filter(
    (lt) => lt.targetObjectType === objectTypeName
  );
}

/** Get all actions that mutate a given object type */
export function getActionsFor(objectTypeName: string): ActionTypeDefinition[] {
  return Object.values(ONTOLOGY.actionTypes).filter((at) =>
    at.mutations.some((m) => m.objectType === objectTypeName)
  );
}

/** Pretty-print the ontology for debugging */
export function describeOntology(): string {
  const lines: string[] = ['=== ZAVIS ONTOLOGY ===', ''];

  lines.push('OBJECT TYPES:');
  for (const ot of Object.values(ONTOLOGY.objectTypes)) {
    lines.push(`  ${ot.typeName} (${ot.backedByTable}) — ${ot.description}`);
    if (ot.derivedProperties.length > 0) {
      lines.push(`    Derived: ${ot.derivedProperties.map((d) => d.name).join(', ')}`);
    }
  }

  lines.push('');
  lines.push('LINK TYPES:');
  for (const lt of Object.values(ONTOLOGY.linkTypes)) {
    lines.push(`  ${lt.linkName}: ${lt.sourceObjectType} → ${lt.targetObjectType} [${lt.cardinality}]`);
  }

  lines.push('');
  lines.push('ACTION TYPES:');
  for (const at of Object.values(ONTOLOGY.actionTypes)) {
    lines.push(`  ${at.actionName}: ${at.description}`);
    lines.push(`    Mutates: ${at.mutations.map((m) => `${m.operation} ${m.objectType}`).join(', ')}`);
  }

  return lines.join('\n');
}

// Re-export types for convenience
export type { ObjectTypeName, ObjectTypeDefinition } from './object-types';
export type { LinkTypeName, LinkTypeDefinition } from './link-types';
export type { ActionTypeName, ActionTypeDefinition } from './action-types';
