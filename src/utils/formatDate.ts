/**
 * Formata uma data do JS no formato brasileiro DD/MM/YYYY.
 */
export function formatDateBR(date: Date | string | number): string {
  try {
    // Aceita Date, timestamp number, ou string (ex: "2025-12-03")  
    const d = new Date(date);

    if (isNaN(d.getTime())) return "";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

/**
 * Converte uma data brasileira "DD/MM/YYYY" em Date para salvar no banco.
 */
export function parseDateBR(dateStr: string): Date | null {
  try {
    const [day, month, year] = dateStr.split("/");
    if (!day || !month || !year) return null;

    const d = new Date(`${year}-${month}-${day}T00:00:00`);

    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

