import { Client } from "../database/db";

// ✅ Tipos específicos para datas
export type DateFormat = string; // "DD/MM/YYYY"
export type ISODate = string; // "YYYY-MM-DD"

// ✅ Tipo para dados de cobrança agrupados por data
export type ChargesByDate = Record<DateFormat, Client[]>;

// ✅ Tipo para dados de cobrança de um dia
export interface ChargeData {
  date: Date;
  dateStr: DateFormat;
  weekday: string;
  count: number;
  clients: Client[];
  isToday: boolean;
}

// ✅ Tipo para resumo de um dia (usado na timeline)
export interface DaySummary {
  date: Date;
  dateStr: DateFormat;
  weekday: string;
  count: number;
  isToday: boolean;
}



