/**
 * Formata uma data do JS no formato brasileiro DD/MM/YYYY.
 * Aceita múltiplos formatos: ISO (yyyy-mm-dd), pt-BR (dd/mm/yyyy), Date, timestamp
 */
export function formatDateBR(date: Date | string | number): string {
  try {
    // Se for string vazia ou null/undefined, retorna vazio
    if (!date) return "";
    
    // Se já estiver no formato pt-BR (dd/mm/yyyy), retorna direto
    if (typeof date === "string") {
      const ptBRPattern = /^\d{2}\/\d{2}\/\d{4}$/;
      if (ptBRPattern.test(date.trim())) {
        return date.trim();
      }
    }
    
    // Tenta parsear como ISO (yyyy-mm-dd)
    if (typeof date === "string" && date.includes("-")) {
      const parts = date.trim().split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts;
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(d.getTime())) {
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        }
      }
    }
    
    // Fallback: tenta parsear como Date ou timestamp
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    // Se tudo falhar, retorna o valor original como string
    return String(date);
  } catch {
    // Se houver erro, retorna o valor original como string
    return String(date || "");
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

/**
 * Formata timestamp ou Date para formato brasileiro com data e hora.
 * Formato: "DD/MM/YYYY às HH:MM"
 * @param timestamp - Timestamp (number) ou Date
 * @returns String formatada ou string vazia se inválido
 */
export function formatDateTime(timestamp: Date | string | number): string {
  try {
    const d = new Date(timestamp);

    if (isNaN(d.getTime())) return "";

    const dateStr = d.toLocaleDateString("pt-BR");
    const timeStr = d.toLocaleTimeString("pt-BR", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });

    return `${dateStr} às ${timeStr}`;
  } catch {
    return "";
  }
}

