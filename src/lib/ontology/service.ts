// ========== PALANTIR ONTOLOGY — SERVICE LAYER ==========
// Orchestrates actions, derived property computation, and graph traversal.
// All writes go through executeAction() which validates → mutates → logs.

import { db } from '@/db';
import {
  clients,
  partners,
  contracts,
  revenueStreams,
  customerPartnerLinks,
  actionLog,
  receivables,
} from '@/db/schema';
import {
  dbRowToPartner,
  dbRowToContract,
  dbRowToRevenueStream,
  dbRowToCustomerPartnerLink,
  dbRowToClient,
  actionLogEntryToDbValues,
} from '@/db/mappers';
import { createActionLogEntry } from './action-log';
import type { ActionTypeName } from './action-types';
import type {
  Client,
  Contract,
  RevenueStream,
  Partner,
  CustomerPartnerLink,
  ActionLogEntry,
} from '@/lib/models/platform-types';
import type { ActionMutationRecord } from './action-log';
import { eq } from 'drizzle-orm';

// ── DERIVED PROPERTY: compute MRR from linked revenue streams ──

export async function computeCustomerMRR(customerId: string): Promise<number> {
  // Customer → Contracts → RevenueStreams (subscription, monthly)
  const customerContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.customerId, customerId));

  let totalMRR = 0;
  for (const contract of customerContracts) {
    if (contract.status !== 'active') continue;
    const streams = await db
      .select()
      .from(revenueStreams)
      .where(eq(revenueStreams.contractId, contract.id));

    for (const stream of streams) {
      if (stream.type === 'subscription' || stream.type === 'add_on' || stream.type === 'managed_service') {
        const amount = Number(stream.amount) || 0;
        const freq = stream.frequency;
        if (freq === 'monthly') totalMRR += amount;
        else if (freq === 'quarterly') totalMRR += amount / 3;
        else if (freq === 'annual') totalMRR += amount / 12;
      }
    }
  }
  return totalMRR;
}

export async function computeCustomerOneTimeRevenue(customerId: string): Promise<number> {
  const customerContracts = await db
    .select()
    .from(contracts)
    .where(eq(contracts.customerId, customerId));

  let total = 0;
  for (const contract of customerContracts) {
    const streams = await db
      .select()
      .from(revenueStreams)
      .where(eq(revenueStreams.contractId, contract.id));

    for (const stream of streams) {
      if (stream.type === 'one_time' || stream.frequency === 'one_time') {
        total += Number(stream.amount) || 0;
      }
    }
  }
  return total;
}

// ── GRAPH TRAVERSAL: get linked objects ──

export async function getCustomerContracts(customerId: string): Promise<Contract[]> {
  const rows = await db.select().from(contracts).where(eq(contracts.customerId, customerId));
  return rows.map((r) => dbRowToContract(r as Record<string, unknown>));
}

export async function getContractRevenueStreams(contractId: string): Promise<RevenueStream[]> {
  const rows = await db.select().from(revenueStreams).where(eq(revenueStreams.contractId, contractId));
  return rows.map((r) => dbRowToRevenueStream(r as Record<string, unknown>));
}

export async function getCustomerPartnerLink(customerId: string): Promise<CustomerPartnerLink | null> {
  const rows = await db.select().from(customerPartnerLinks).where(eq(customerPartnerLinks.customerId, customerId));
  if (rows.length === 0) return null;
  return dbRowToCustomerPartnerLink(rows[0] as Record<string, unknown>);
}

export async function getPartnerCustomers(partnerId: string): Promise<Client[]> {
  const links = await db.select().from(customerPartnerLinks).where(eq(customerPartnerLinks.partnerId, partnerId));
  const customerIds = links.map((l) => l.customerId);
  if (customerIds.length === 0) return [];

  const allClients = await db.select().from(clients);
  return allClients
    .filter((c) => customerIds.includes(c.id))
    .map((r) => dbRowToClient(r as Record<string, unknown>));
}

export async function getAllPartners(): Promise<Partner[]> {
  const rows = await db.select().from(partners);
  return rows.map((r) => dbRowToPartner(r as Record<string, unknown>));
}

export async function getAllContracts(): Promise<Contract[]> {
  const rows = await db.select().from(contracts);
  return rows.map((r) => dbRowToContract(r as Record<string, unknown>));
}

export async function getAllRevenueStreams(): Promise<RevenueStream[]> {
  const rows = await db.select().from(revenueStreams);
  return rows.map((r) => dbRowToRevenueStream(r as Record<string, unknown>));
}

export async function getAllCustomerPartnerLinks(): Promise<CustomerPartnerLink[]> {
  const rows = await db.select().from(customerPartnerLinks);
  return rows.map((r) => dbRowToCustomerPartnerLink(r as Record<string, unknown>));
}

// ── GET FULL CUSTOMER WITH ONTOLOGY ENRICHMENT ──

export interface EnrichedCustomer extends Client {
  derivedMRR: number;
  derivedOneTimeRevenue: number;
  derivedARR: number;
  contracts: Contract[];
  revenueStreams: RevenueStream[];
  partnerLink: CustomerPartnerLink | null;
  partnerName: string | null;
}

export async function getEnrichedCustomer(customerId: string): Promise<EnrichedCustomer | null> {
  const clientRows = await db.select().from(clients).where(eq(clients.id, customerId));
  if (clientRows.length === 0) return null;

  const client = dbRowToClient(clientRows[0] as Record<string, unknown>);
  const customerContracts = await getCustomerContracts(customerId);
  const allStreams: RevenueStream[] = [];
  for (const contract of customerContracts) {
    const streams = await getContractRevenueStreams(contract.id);
    allStreams.push(...streams);
  }
  const partnerLink = await getCustomerPartnerLink(customerId);
  let partnerName: string | null = null;
  if (partnerLink) {
    const partnerRows = await db.select().from(partners).where(eq(partners.id, partnerLink.partnerId));
    if (partnerRows.length > 0) partnerName = partnerRows[0].name;
  }

  const derivedMRR = await computeCustomerMRR(customerId);
  const derivedOneTimeRevenue = await computeCustomerOneTimeRevenue(customerId);

  return {
    ...client,
    derivedMRR,
    derivedOneTimeRevenue,
    derivedARR: derivedMRR * 12,
    contracts: customerContracts,
    revenueStreams: allStreams,
    partnerLink,
    partnerName,
  };
}

// ── ACTION EXECUTION ENGINE ──

export interface ActionResult {
  success: boolean;
  logEntry: ActionLogEntry;
  error?: string;
}

export async function executeAction(
  actionType: ActionTypeName,
  inputs: Record<string, unknown>,
  actor: string = 'system',
): Promise<ActionResult> {
  const mutations: ActionMutationRecord[] = [];

  try {
    switch (actionType) {
      case 'SignNewCustomer': {
        const now = new Date().toISOString();
        const customerId = inputs.customerId as string || `client_${Date.now()}`;
        const contractId = `contract_${Date.now()}`;

        // Create Customer
        const clientValues = {
          id: customerId,
          name: inputs.name as string,
          salesPartner: null as string | null,
          status: 'active',
          pricingModel: inputs.pricingModel as string,
          perSeatCost: inputs.perSeatCost != null ? String(inputs.perSeatCost) : null,
          seatCount: (inputs.seatCount as number) ?? null,
          billingCycle: (inputs.billingCycle as string) ?? null,
          plan: (inputs.plan as string) ?? null,
          discount: '0',
          mrr: String(inputs.mrr ?? 0),
          oneTimeRevenue: String(inputs.oneTimeRevenue ?? 0),
          annualRunRate: String((Number(inputs.mrr ?? 0)) * 12),
          onboardingDate: (inputs.onboardingDate as string) ?? now.slice(0, 10),
          notes: (inputs.notes as string) ?? null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        };
        await db.insert(clients).values(clientValues);
        mutations.push({ objectType: 'Customer', objectId: customerId, operation: 'create' });

        // Create Contract
        const contractValues = {
          id: contractId,
          customerId,
          startDate: (inputs.onboardingDate as string) ?? now.slice(0, 10),
          endDate: null as string | null,
          billingCycle: (inputs.billingCycle as string) ?? null,
          plan: (inputs.plan as string) ?? null,
          terms: null,
          status: 'active',
          createdAt: new Date(now),
        };
        await db.insert(contracts).values(contractValues);
        mutations.push({ objectType: 'Contract', objectId: contractId, operation: 'create' });

        // Create RevenueStream(s)
        const mrr = Number(inputs.mrr ?? 0);
        if (mrr > 0) {
          const streamId = `rs_sub_${Date.now()}`;
          await db.insert(revenueStreams).values({
            id: streamId,
            contractId,
            type: 'subscription',
            amount: String(mrr),
            frequency: 'monthly',
            startDate: contractValues.startDate,
            endDate: null,
            createdAt: new Date(now),
          });
          mutations.push({ objectType: 'RevenueStream', objectId: streamId, operation: 'create' });
        }

        const oneTime = Number(inputs.oneTimeRevenue ?? 0);
        if (oneTime > 0) {
          const streamId = `rs_ot_${Date.now()}`;
          await db.insert(revenueStreams).values({
            id: streamId,
            contractId,
            type: 'one_time',
            amount: String(oneTime),
            frequency: 'one_time',
            startDate: contractValues.startDate,
            endDate: null,
            createdAt: new Date(now),
          });
          mutations.push({ objectType: 'RevenueStream', objectId: streamId, operation: 'create' });
        }

        // Link partner
        if (inputs.partnerId) {
          const linkId = `cpl_${Date.now()}`;
          await db.insert(customerPartnerLinks).values({
            id: linkId,
            customerId,
            partnerId: inputs.partnerId as string,
            attributionPct: String(inputs.attributionPct ?? 100),
            createdAt: new Date(now),
          });
          mutations.push({ objectType: 'CustomerPartnerLink', objectId: linkId, operation: 'create' });
        }
        break;
      }

      case 'UpdateCustomerPricing': {
        const customerId = inputs.customerId as string;
        const newAmount = Number(inputs.newAmount);

        // Find active contract, update its subscription stream
        const customerContracts = await db.select().from(contracts)
          .where(eq(contracts.customerId, customerId));
        const activeContract = customerContracts.find((c) => c.status === 'active');
        if (!activeContract) throw new Error(`No active contract for customer ${customerId}`);

        const streams = await db.select().from(revenueStreams)
          .where(eq(revenueStreams.contractId, activeContract.id));
        const subStream = streams.find((s) => s.type === 'subscription');

        if (subStream) {
          await db.update(revenueStreams)
            .set({ amount: String(newAmount) })
            .where(eq(revenueStreams.id, subStream.id));
          mutations.push({ objectType: 'RevenueStream', objectId: subStream.id, operation: 'update', after: { amount: newAmount } });
        }

        // Update denormalized MRR on client row (backward compatibility)
        await db.update(clients)
          .set({ mrr: String(newAmount), annualRunRate: String(newAmount * 12), updatedAt: new Date() })
          .where(eq(clients.id, customerId));
        mutations.push({ objectType: 'Customer', objectId: customerId, operation: 'update' });
        break;
      }

      case 'ProcessChurn': {
        const customerId = inputs.customerId as string;
        const effectiveDate = inputs.effectiveDate as string;

        await db.update(clients)
          .set({ status: 'inactive', updatedAt: new Date() })
          .where(eq(clients.id, customerId));
        mutations.push({ objectType: 'Customer', objectId: customerId, operation: 'update', after: { status: 'inactive' } });

        const customerContracts = await db.select().from(contracts)
          .where(eq(contracts.customerId, customerId));
        for (const contract of customerContracts) {
          if (contract.status === 'active') {
            await db.update(contracts)
              .set({ status: 'terminated', endDate: effectiveDate })
              .where(eq(contracts.id, contract.id));
            mutations.push({ objectType: 'Contract', objectId: contract.id, operation: 'update', after: { status: 'terminated' } });
          }
        }
        break;
      }

      case 'RecordPayment': {
        const invoiceId = inputs.invoiceId as string;
        await db.update(receivables)
          .set({ status: 'paid' })
          .where(eq(receivables.id, invoiceId));
        mutations.push({ objectType: 'Invoice', objectId: invoiceId, operation: 'update', after: { status: 'paid' } });
        break;
      }

      case 'CaptureSnapshot': {
        // Snapshot logic is handled by existing snapshot utilities
        mutations.push({ objectType: 'Snapshot', objectId: inputs.month as string, operation: 'create' });
        break;
      }

      case 'AssignPartner': {
        const customerId = inputs.customerId as string;
        const partnerId = inputs.partnerId as string;
        const now = new Date().toISOString();

        // Remove existing link
        const existing = await db.select().from(customerPartnerLinks)
          .where(eq(customerPartnerLinks.customerId, customerId));
        for (const link of existing) {
          await db.delete(customerPartnerLinks).where(eq(customerPartnerLinks.id, link.id));
          mutations.push({ objectType: 'CustomerPartnerLink', objectId: link.id, operation: 'delete' });
        }

        // Create new link
        const linkId = `cpl_${Date.now()}`;
        await db.insert(customerPartnerLinks).values({
          id: linkId,
          customerId,
          partnerId,
          attributionPct: String(inputs.attributionPct ?? 100),
          createdAt: new Date(now),
        });
        mutations.push({ objectType: 'CustomerPartnerLink', objectId: linkId, operation: 'create' });

        // Update denormalized salesPartner on client row
        const partnerRows = await db.select().from(partners).where(eq(partners.id, partnerId));
        if (partnerRows.length > 0) {
          await db.update(clients)
            .set({ salesPartner: partnerRows[0].name, updatedAt: new Date() })
            .where(eq(clients.id, customerId));
        }
        break;
      }
    }

    // Log the action
    const logEntry = createActionLogEntry(actionType, inputs, mutations, actor);
    await db.insert(actionLog).values(actionLogEntryToDbValues(logEntry));

    return { success: true, logEntry };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const logEntry = createActionLogEntry(actionType, inputs, mutations, actor, { error: errorMessage });
    try {
      await db.insert(actionLog).values(actionLogEntryToDbValues(logEntry));
    } catch {
      // If even logging fails, just return the error
    }
    return { success: false, logEntry, error: errorMessage };
  }
}

// ── ACTION LOG QUERIES ──

export async function getActionLog(limit: number = 50): Promise<ActionLogEntry[]> {
  const rows = await db.select().from(actionLog);
  const entries = rows.map((r) => ({
    id: r.id,
    actionType: r.actionType,
    actor: r.actor,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
    inputs: r.inputs as Record<string, unknown>,
    mutations: r.mutations as ActionMutationRecord[],
    metadata: (r.metadata as Record<string, unknown>) || undefined,
  }));
  // Sort newest first, limit
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return entries.slice(0, limit);
}
