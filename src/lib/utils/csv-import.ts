import type { Client, ClientStatus, PricingModel } from '../models/platform-types';

interface ImportResult {
  imported: Client[];
  errors: string[];
}

const VALID_STATUSES: ClientStatus[] = ['active', 'inactive'];
const VALID_MODELS: PricingModel[] = ['per_seat', 'flat_mrr', 'one_time_only'];

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Import clients from a CSV string.
 * Expected columns (header row required):
 * name, sales_partner, status, pricing_model, per_seat_cost, seat_count, mrr, one_time_revenue, onboarding_date, notes
 */
export function importClientsFromCSV(csvText: string): ImportResult {
  const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { imported: [], errors: ['CSV must have a header row and at least one data row'] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const imported: Client[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] || '';
    });

    const name = row.name;
    if (!name) {
      errors.push(`Row ${i + 1}: Missing name`);
      continue;
    }

    const status = (row.status || 'active').toLowerCase() as ClientStatus;
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Row ${i + 1}: Invalid status "${row.status}"`);
      continue;
    }

    const pricingModel = (row.pricing_model || 'per_seat').toLowerCase().replace(/\s+/g, '_') as PricingModel;
    const validModel = VALID_MODELS.includes(pricingModel) ? pricingModel : 'per_seat';

    const perSeatCost = Number(row.per_seat_cost) || null;
    const seatCount = Number(row.seat_count) || null;
    const mrr = Number(row.mrr) || (perSeatCost && seatCount ? perSeatCost * seatCount : 0);
    const oneTimeRevenue = Number(row.one_time_revenue) || 0;

    const now = new Date().toISOString();
    const client: Client = {
      id: `cli-import-${Date.now()}-${i}`,
      name,
      salesPartner: row.sales_partner || null,
      status,
      pricingModel: validModel,
      perSeatCost,
      seatCount,
      mrr,
      oneTimeRevenue,
      annualRunRate: mrr * 12 + oneTimeRevenue,
      onboardingDate: row.onboarding_date || null,
      notes: row.notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    imported.push(client);
  }

  return { imported, errors };
}
