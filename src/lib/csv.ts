export function parseCsv(texto: string): Record<string, string>[] {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lineas.length < 2) return [];

  const separador = lineas[0].includes(";") ? ";" : ",";
  const partir = (linea: string) =>
    linea.split(separador).map((v) => v.trim().replace(/^"|"$/g, ""));

  const cabecera = partir(lineas[0]).map((h) => h.toLowerCase());

  return lineas.slice(1).map((linea) => {
    const valores = partir(linea);
    const fila: Record<string, string> = {};
    cabecera.forEach((h, i) => {
      fila[h] = valores[i] ?? "";
    });
    return fila;
  });
}
