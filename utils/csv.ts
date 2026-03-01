export function toCSV(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const head = headers.join(',');
  const body = rows
    .map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? '';
          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(',')
    )
    .join('\n');
  return `${head}\n${body}`;
}

export function downloadCSV(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSV(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((item) => item.trim()));
}
