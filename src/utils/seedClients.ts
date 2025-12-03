import { addClient } from "../database/db";

// 🧍‍♂️ Nomes brasileiros variados
const nomes = [
  "Maria Silva", "João Souza", "Ana Beatriz", "Pedro Henrique", "Camila Oliveira",
  "Lucas Almeida", "Juliana Costa", "Felipe Santos", "Isabela Lima", "Rafael Pereira",
  "Larissa Martins", "André Rodrigues", "Fernanda Gomes", "Vinícius Ferreira", "Tatiane Nunes",
  "Gustavo Cardoso", "Amanda Ribeiro", "Bruno Moura", "Patrícia Azevedo", "Diego Castro"
];

// 🏘️ Bairros brasileiros e cidades
const bairros = [
  "Centro - São Paulo",
  "Boa Viagem - Recife",
  "Savassi - Belo Horizonte",
  "Icaraí - Niterói",
  "Copacabana - Rio de Janeiro",
  "Meireles - Fortaleza",
  "Asa Sul - Brasília",
  "Jardim das Américas - Curitiba",
  "Cambuí - Campinas",
  "Trindade - Florianópolis",
];

// 📞 Telefones regionais (com DDDs brasileiros)
const ddds = [11, 21, 31, 41, 47, 61, 62, 71, 81, 85, 92, 95];

function gerarTelefone() {
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const prefixo = 9 + Math.floor(Math.random() * 10);
  const meio = Math.floor(1000 + Math.random() * 9000);
  const fim = Math.floor(1000 + Math.random() * 9000);
  return `(${ddd}) ${prefixo}${meio}-${fim}`;
}

function gerarReferencia() {
  const opcoes = [
    "Próximo à escola municipal",
    "Perto do supermercado Bom Preço",
    "Ao lado da farmácia São João",
    "Atrás da igreja central",
    "Em frente ao posto de gasolina",
    "Próximo à praça principal",
    "Ao lado do ponto de ônibus",
  ];
  return opcoes[Math.floor(Math.random() * opcoes.length)];
}

function gerarDataCobranca() {
  const hoje = new Date();
  const dias = Math.floor(Math.random() * 45) + 1; // entre 1 e 45 dias
  const futura = new Date(hoje);
  futura.setDate(hoje.getDate() + dias);
  const y = futura.getFullYear();
  const m = (futura.getMonth() + 1).toString().padStart(2, "0");
  const d = futura.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`; // ISO: yyyy-mm-dd
}

export async function seedClients() {
  console.log("🟡 Inserindo clientes aleatórios...");

  for (let i = 0; i < 20; i++) {
    const nome = nomes[i];
    const valor = Math.floor(Math.random() * 1950) + 50; // R$50 - R$2000
    const bairro = bairros[Math.floor(Math.random() * bairros.length)];
    const numero = String(Math.floor(Math.random() * 500) + 1);
    const telefone = gerarTelefone();
    const referencia = gerarReferencia();
    const data = gerarDataCobranca();

    await addClient({
      name: nome,
      value: valor,
      bairro,
      numero,
      telefone,
      referencia,
      next_charge: data,
    });
  }

  console.log("✅ 20 clientes brasileiros aleatórios adicionados com sucesso!");
}

