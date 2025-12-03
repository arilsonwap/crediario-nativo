// utils/formatPhone.ts

export function formatPhone(phone?: string): string {
  if (!phone) return "-";

  // remove caracteres não numéricos
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 11) {
    // Formato: (XX) 9XXXX-XXXX
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (digits.length === 10) {
    // Formato: (XX) XXXX-XXXX
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  // Caso não caiba em nenhum formato
  return phone;
}
