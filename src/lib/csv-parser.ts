import Papa from 'papaparse';

export interface RawCsvRow {
  id: string;
  firstname: string;
  lastname: string;
  companies: string;
  jobTitle: string;
  Status: string;
  'Deal value': string;
  'Actual ACV': string;
  'Company size': string;
  'Company vertical': string;
  'Prospect owner': string;
  Where: string;
  'Next steps': string;
  'Closed date': string;
  'Lost reason': string;
  lastInteraction: string;
}

export interface ParsedDeal {
  external_id: string;
  first_name: string;
  last_name: string;
  company: string;
  job_title: string;
  status: string;
  deal_value: number;
  actual_acv: number;
  company_size: string;
  company_vertical: string;
  prospect_owner: string;
  country: string;
  next_steps: string;
  closed_date: string | null;
  lost_reason: string;
  last_interaction: string | null;
}

export function parseCsvFile(file: File): Promise<ParsedDeal[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const deals: ParsedDeal[] = results.data.map((row) => ({
          external_id: row.id || '',
          first_name: row.firstname || '',
          last_name: row.lastname || '',
          company: (row.companies || '').split(',')[0]?.trim() || '',
          job_title: row.jobTitle || '',
          status: (row.Status || '').trim(),
          deal_value: parseFloat(row['Deal value']) || 0,
          actual_acv: parseFloat(row['Actual ACV']) || 0,
          company_size: row['Company size'] || '',
          company_vertical: row['Company vertical'] || '',
          prospect_owner: row['Prospect owner'] || '',
          country: row.Where || '',
          next_steps: row['Next steps'] || '',
          closed_date: row['Closed date'] || null,
          lost_reason: row['Lost reason'] || '',
          last_interaction: row.lastInteraction || null,
        }));
        resolve(deals);
      },
      error(err) {
        reject(err);
      },
    });
  });
}
