import type { Client } from '../models/platform-types';

/** Get MRR for a client (stored directly on the record) */
export function getClientMRR(client: Client): number {
  return client.mrr;
}

/** Get ARR for a client */
export function getClientARR(client: Client): number {
  return client.mrr * 12;
}

/** Check if a client uses per-seat pricing */
export function isPerSeatClient(client: Client): boolean {
  return client.pricingModel === 'per_seat' && client.perSeatCost != null && client.seatCount != null;
}

/** Compute what MRR would be at a different per-seat price */
export function computeMRRAtPrice(client: Client, newPerSeatPrice: number): number {
  if (!isPerSeatClient(client)) return client.mrr;
  return newPerSeatPrice * (client.seatCount || 0);
}
