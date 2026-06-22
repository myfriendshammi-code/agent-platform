export type CsvLeadRow = {
  email: string;
  name?: string;
  shopName?: string;
  shopUrl?: string;
  niche?: string;
  notes?: string;
};

const HEADER_ALIASES: Record<string, keyof CsvLeadRow> = {
  email: "email",
  "e-mail": "email",
  name: "name",
  "contact name": "name",
  "owner name": "name",
  shop_name: "shopName",
  shopname: "shopName",
  shop: "shopName",
  "shop name": "shopName",
  shop_url: "shopUrl",
  shopurl: "shopUrl",
  url: "shopUrl",
  "shop url": "shopUrl",
  website: "shopUrl",
  niche: "niche",
  category: "niche",
  notes: "notes",
  note: "notes",
};

function normalizeHeader(header: string): keyof CsvLeadRow | null {
  const key = header.trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[key] ?? null;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type CsvParseResult = {
  rows: CsvLeadRow[];
  errors: string[];
  skipped: number;
};

export function parseLeadsCsv(csvText: string, maxRows = 50): CsvParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["CSV is empty"], skipped: 0 };
  }

  const headerFields = parseCsvLine(lines[0]!);
  const columnMap: (keyof CsvLeadRow | null)[] = headerFields.map(normalizeHeader);

  if (!columnMap.includes("email")) {
    return {
      rows: [],
      errors: ["CSV must include an email column (email, e-mail, etc.)"],
      skipped: 0,
    };
  }

  const rows: CsvLeadRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  const dataLines = lines.slice(1);

  for (let i = 0; i < dataLines.length; i++) {
    if (rows.length >= maxRows) {
      skipped += dataLines.length - i;
      errors.push(`Only the first ${maxRows} leads are imported per batch.`);
      break;
    }

    const fields = parseCsvLine(dataLines[i]!);
    const row: CsvLeadRow = { email: "" };

    columnMap.forEach((key, index) => {
      if (!key) return;
      const value = fields[index]?.trim();
      if (value) {
        row[key] = value;
      }
    });

    const email = row.email.trim().toLowerCase();
    if (!email) {
      skipped++;
      continue;
    }

    if (!isValidEmail(email)) {
      errors.push(`Row ${i + 2}: invalid email "${email}"`);
      skipped++;
      continue;
    }

    row.email = email;
    rows.push(row);
  }

  return { rows, errors, skipped };
}
