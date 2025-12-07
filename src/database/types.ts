/**
 * 🧩 Tipos do banco de dados
 * Valores em reais (convertidos para centavos no banco)
 */

export type Bairro = {
  id?: number;
  nome: string;
};

export type Rua = {
  id?: number;
  nome: string;
  bairroId: number;
};

export type Client = {
  id?: number;
  name: string;
  value: number; // Reais (API) - armazenado como value_cents (INTEGER) no banco
  bairro?: string | null; // ⚠️ DEPRECATED: usar ruaId
  numero?: string | null;
  referencia?: string | null;
  telefone?: string | null;
  next_charge?: string | null; // ISO: yyyy-mm-dd
  paid?: number; // Reais (API) - armazenado como paid_cents (INTEGER) no banco
  // ✅ Novos campos V3
  ruaId?: number | null;
  ordemVisita?: number;
  prioritario?: number; // 0 ou 1 (BOOLEAN)
  observacoes?: string | null;
  status?: "pendente" | "quitado" | null; // Status do pagamento
  proximaData?: string | null; // ISO: yyyy-mm-dd (data da próxima cobrança)
};

export type Payment = {
  id?: number;
  client_id: number;
  created_at: string; // ISO: yyyy-mm-ddTHH:mm:ss.sssZ
  valor: number; // Reais (API) - armazenado como value_cents (INTEGER) no banco
};

export type Log = {
  id?: number;
  clientId: number;
  created_at: string; // ISO: yyyy-mm-ddTHH:mm:ss.sssZ
  descricao: string;
};

// Tipos internos do banco (com centavos)
export type ClientDB = {
  id: number;
  name: string;
  value_cents: number;
  bairro: string | null;
  numero: string | null;
  referencia: string | null;
  telefone: string | null;
  next_charge: string | null;
  paid_cents: number;
  // ✅ Novos campos V3
  ruaId: number | null;
  ordemVisita: number;
  prioritario: number;
  observacoes: string | null;
  status: string | null;
  proximaData: string | null;
  updated_at?: string | null;
};

export type PaymentDB = {
  id: number;
  client_id: number;
  created_at: string;
  value_cents: number;
};

export type TopCliente = {
  id: number;
  name: string;
  totalPago: number;
};

export type CrediarioPorBairro = {
  bairro: string;
  total: number;
};

export type ClientesPorRua = {
  ruaId: number;
  ruaNome: string;
  bairroNome: string;
  clientes: Client[];
  totalClientes: number;
  totalPagos: number;
  totalPendentes: number;
};





