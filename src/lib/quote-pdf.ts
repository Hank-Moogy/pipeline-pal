import { formatEur, type QuoteLineItems } from './quote-defaults';

const COMPANY_ADDRESS = [
  '112 avenue de Paris',
  'CS 60002 - CX 94306',
  '94300 VINCENNES, FRANCE',
  'hello@mago.studio',
];

export async function generateQuotePdf(quote: {
  quote_number: string;
  quote_name?: string | null;
  description?: string | null;
  quote_type?: string | null;
  company_name: string | null;
  contact_person: string | null;
  contact_email: string | null;
  hosting_model: string | null;
  line_items: QuoteLineItems;
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
  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // ── Logo (top-left) ──
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = '/images/mago-logo.png';
    });
    doc.addImage(img, 'PNG', 14, 10, 24, 24);
  } catch {
    // logo unavailable – skip
  }

  // ── Company address (top-right) ──
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  COMPANY_ADDRESS.forEach((line, i) => {
    doc.text(line, pageW - 14, 14 + i * 4, { align: 'right' });
  });
  doc.setTextColor(0, 0, 0);

  y = 42;

  // ── Quote title / name ──
  if (quote.quote_name) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(quote.quote_name, 14, y);
    y += 8;
  } else {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Quote', 14, y);
    y += 8;
  }

  // ── Description ──
  if (quote.description) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(quote.description, 170);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 4;
    doc.setTextColor(0, 0, 0);
  }

  const addRow = (label: string, value: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 14, y);
    doc.text(value, 120, y);
    y += 6;
  };

  const addSectionTitle = (text: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 14, y);
    y += 7;
  };

  // ── Meta ──
  addRow('Quote Number:', quote.quote_number);
  addRow('Date:', new Date(quote.created_at).toLocaleDateString('en-GB'));
  if (quote.valid_until) addRow('Valid Until:', new Date(quote.valid_until).toLocaleDateString('en-GB'));
  if (quote.creatorName) addRow('Created By:', quote.creatorName);
  y += 4;

  // ── Client info ──
  addSectionTitle('Client Information');
  if (quote.company_name) addRow('Company:', quote.company_name);
  if (quote.contact_person) addRow('Contact:', quote.contact_person);
  if (quote.contact_email) addRow('Email:', quote.contact_email);

  // ── Hosting ──
  addSectionTitle('1. Hosting');
  addRow('Model:', quote.line_items.hosting?.model || 'N/A');
  if (quote.line_items.hosting?.installation_fee) addRow('Installation Fee:', formatEur(quote.line_items.hosting.installation_fee));

  // ── Licenses ──
  if (quote.line_items.licenses?.length) {
    addSectionTitle('2. Licenses');
    quote.line_items.licenses.forEach(l => {
      addRow(`${l.type} × ${l.quantity}`, formatEur(l.total));
    });
  }

  // ── Credits ──
  if (quote.line_items.credits?.length) {
    addSectionTitle('3. Credits');
    quote.line_items.credits.forEach(c => {
      addRow(`${c.tier} × ${c.quantity} (${c.total_credits.toLocaleString()} credits)`, formatEur(c.total_price));
    });
  }

  // ── Support ──
  if (quote.line_items.support?.length) {
    addSectionTitle('4. Support & SLA');
    quote.line_items.support.forEach(s => {
      addRow(s.tier, formatEur(s.annual));
    });
  }

  // ── Services ──
  if (quote.line_items.services?.length) {
    addSectionTitle('5. Professional Services');
    quote.line_items.services.forEach(s => {
      addRow(`${s.name} × ${s.quantity}`, formatEur(s.total));
      if (s.name.toLowerCase().includes('discovery') || s.name.toLowerCase().includes('poc')) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Includes 1 onboarding session, 2 follow-up meetings, and Slack support', 18, y);
        y += 5;
        doc.setTextColor(0, 0, 0);
      }
    });
  }

  // ── Custom Dev ──
  if (quote.line_items.custom_dev?.length) {
    addSectionTitle('6. Custom Development');
    quote.line_items.custom_dev.forEach(c => {
      addRow(`${c.type} × ${c.quantity}`, formatEur(c.total));
    });
  }

  // ── Summary (no ARR) ──
  if (y > 240) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Quote Summary', 14, y);
  y += 8;

  const grossTotal = quote.total_year1 / (1 - quote.contract_discount / 100) || quote.total_year1;

  addRow('Total Before Discount:', formatEur(grossTotal));
  if (quote.contract_discount > 0) {
    addRow(`Discount (${quote.contract_discount}%):`, `- ${formatEur(grossTotal - quote.total_year1)}`);
  }
  y += 2;
  doc.setDrawColor(0);
  doc.line(14, y - 2, 196, y - 2);

  const isOneOff = quote.quote_type === 'one_off';
  const totalLabel = isOneOff ? 'Total' : 'Year 1 Total';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalLabel}: ${formatEur(quote.total_year1)}`, 14, y + 4);
  y += 10;

  // ── Notes ──
  if (quote.notes) {
    if (y > 250) { doc.addPage(); y = 20; }
    y += 6;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', 14, y);
    y += 6;
    const lines = doc.splitTextToSize(quote.notes, 170);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, 14, y);
  }

  doc.save(`${quote.quote_number}.pdf`);
}
