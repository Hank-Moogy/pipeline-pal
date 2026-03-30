import { formatEur, type QuoteLineItems } from './quote-defaults';

export async function generateQuotePdf(quote: {
  quote_number: string;
  company_name: string | null;
  contact_person: string | null;
  contact_email: string | null;
  hosting_model: string | null;
  line_items: QuoteLineItems;
  total_arr: number;
  total_onetime: number;
  total_year1: number;
  contract_discount: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  creatorName?: string;
}) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  let y = 20;

  const addLine = (text: string, fontSize = 10, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(text, 14, y);
    y += fontSize * 0.5 + 2;
  };

  const addRow = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 14, y);
    doc.text(value, 120, y);
    y += 6;
  };

  addLine('Mago — Quote', 18, true);
  y += 4;

  addRow('Quote Number:', quote.quote_number);
  addRow('Date:', new Date(quote.created_at).toLocaleDateString('en-GB'));
  if (quote.valid_until) addRow('Valid Until:', new Date(quote.valid_until).toLocaleDateString('en-GB'));
  if (quote.creatorName) addRow('Created By:', quote.creatorName);
  y += 4;

  addLine('Client Information', 12, true);
  if (quote.company_name) addRow('Company:', quote.company_name);
  if (quote.contact_person) addRow('Contact:', quote.contact_person);
  if (quote.contact_email) addRow('Email:', quote.contact_email);
  y += 4;

  // Hosting
  addLine('1. Hosting', 12, true);
  addRow('Model:', quote.line_items.hosting?.model || 'N/A');
  if (quote.line_items.hosting?.installation_fee) addRow('Installation Fee:', formatEur(quote.line_items.hosting.installation_fee));
  y += 2;

  // Licenses
  if (quote.line_items.licenses?.length) {
    addLine('2. Licenses', 12, true);
    quote.line_items.licenses.forEach(l => {
      addRow(`${l.type} × ${l.quantity}`, formatEur(l.total));
    });
    y += 2;
  }

  // Credits
  if (quote.line_items.credits?.length) {
    addLine('3. Credits', 12, true);
    quote.line_items.credits.forEach(c => {
      addRow(`${c.tier} × ${c.quantity}`, formatEur(c.total_price));
    });
    y += 2;
  }

  // Support
  if (quote.line_items.support?.length) {
    addLine('4. Support & SLA', 12, true);
    quote.line_items.support.forEach(s => {
      addRow(s.tier, formatEur(s.annual));
    });
    y += 2;
  }

  // Services
  if (quote.line_items.services?.length) {
    addLine('5. Professional Services', 12, true);
    quote.line_items.services.forEach(s => {
      addRow(`${s.name} × ${s.quantity}`, formatEur(s.total));
    });
    y += 2;
  }

  // Custom Dev
  if (quote.line_items.custom_dev?.length) {
    addLine('6. Custom Development', 12, true);
    quote.line_items.custom_dev.forEach(c => {
      addRow(`${c.type} × ${c.quantity}`, formatEur(c.total));
    });
    y += 2;
  }

  // Check if we need a new page
  if (y > 240) { doc.addPage(); y = 20; }

  // Summary
  y += 4;
  addLine('Quote Summary', 14, true);
  y += 2;
  addRow('Total ARR:', formatEur(quote.total_arr));
  addRow('Total One-Time:', formatEur(quote.total_onetime));
  if (quote.contract_discount > 0) addRow('Discount:', `${quote.contract_discount}%`);
  y += 2;
  doc.setDrawColor(0);
  doc.line(14, y - 2, 196, y - 2);
  addLine(`Year 1 Total: ${formatEur(quote.total_year1)}`, 14, true);

  if (quote.notes) {
    y += 6;
    addLine('Notes', 12, true);
    const lines = doc.splitTextToSize(quote.notes, 170);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, 14, y);
  }

  doc.save(`${quote.quote_number}.pdf`);
}
