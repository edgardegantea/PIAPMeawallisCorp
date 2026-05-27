/**
 * Descarga un array de objetos como archivo CSV.
 *
 * @param {object[]} rows     - Datos a exportar
 * @param {Array<{key:string, label:string}>} columns - Columnas: qué campo exportar y con qué encabezado
 * @param {string}   filename - Nombre del archivo sin extensión
 */
export function downloadCSV(rows, columns, filename) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
  };

  const header = columns.map((c) => escape(c.label)).join(',');
  const body   = rows.map((row) =>
    columns.map((c) => escape(c.transform ? c.transform(row[c.key]) : row[c.key])).join(',')
  ).join('\n');

  const csv  = '﻿' + header + '\n' + body; // BOM para Excel en Windows
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
