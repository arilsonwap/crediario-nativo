/**
 * 🎲 Gerador de Cliente Aleatório
 * 
 * Gera dados aleatórios realistas para testes e desenvolvimento
 */

// 📋 Dados para geração aleatória

const FIRST_NAMES = [
  // Masculinos
  "João", "José", "Carlos", "Francisco", "Antonio", "Paulo", "Pedro", "Lucas",
  "Luiz", "Marcos", "Luis", "Gabriel", "Rafael", "Daniel", "Marcelo", "Bruno",
  "Fernando", "Ricardo", "Roberto", "André", "Eduardo", "Fábio", "Rodrigo",
  "Thiago", "Felipe", "Gustavo", "Renato", "Vinicius", "Diego", "Leonardo",
  "Matheus", "Rafael", "Guilherme", "Henrique", "Igor", "Lucas", "Nathan",
  "Otávio", "Pablo", "Quirino", "Rogério", "Sérgio", "Tiago", "Ubirajara",
  "Vagner", "Wagner", "Xavier", "Yuri", "Zeca",
  
  // Femininos
  "Maria", "Ana", "Patricia", "Juliana", "Fernanda", "Mariana", "Camila",
  "Amanda", "Bruna", "Larissa", "Vanessa", "Cristina", "Sandra", "Adriana",
  "Simone", "Renata", "Beatriz", "Carolina", "Daniela", "Eliane", "Fabiana",
  "Gabriela", "Helena", "Isabela", "Jéssica", "Karina", "Letícia", "Michele",
  "Natália", "Olivia", "Priscila", "Quitéria", "Raquel", "Sabrina", "Tatiana",
  "Ursula", "Verônica", "Wanessa", "Yasmin", "Zuleika"
];

const LAST_NAMES = [
  "Silva", "Souza", "Costa", "Santos", "Oliveira", "Pereira", "Rodrigues",
  "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes",
  "Martins", "Rocha", "Ribeiro", "Alves", "Monteiro", "Mendes", "Barros",
  "Freitas", "Cardoso", "Teixeira", "Cavalcanti", "Dias", "Castro", "Correia",
  "Moraes", "Ramos", "Reis", "Nunes", "Moreira", "Torres", "Lopes", "Pires",
  "Azevedo", "Barbosa", "Campos", "Dias", "Ferreira", "Gonçalves", "Machado",
  "Mendes", "Nogueira", "Pinto", "Ribeiro", "Sousa", "Vieira", "Xavier",
  "Amaral", "Borges", "Cunha", "Duarte", "Espírito Santo", "Fonseca", "Garcia",
  "Henriques", "Inácio", "Junqueira", "Klein", "Lacerda", "Macedo", "Nascimento",
  "Oliveira", "Pacheco", "Queiroz", "Ramos", "Siqueira", "Tavares", "Uchoa",
  "Viana", "Werneck", "Ximenes", "Yamamoto", "Zanetti"
];

const BAIRROS = [
  "Centro", "Jardim América", "Boa Vista", "Vila Nova", "Santa Cruz",
  "São José", "Nova Esperança", "Parque Industrial", "Vila Rica", "Bela Vista",
  "Jardim das Flores", "Alto da Boa Vista", "Vila Esperança", "Centro Histórico",
  "Jardim Primavera", "Vila São Paulo", "Bairro Novo", "Parque das Águas",
  "Vila Progresso", "São Cristóvão", "Jardim Bela Vista", "Vila União",
  "Parque Residencial", "Vila dos Pescadores", "Centro Comercial", "Alto Alegre",
  "Jardim Europa", "Vila Mariana", "Bela Vista", "Copacabana", "Ipanema",
  "Leblon", "Barra da Tijuca", "Tijuca", "Botafogo", "Flamengo", "Laranjeiras",
  "Catete", "Glória", "Santa Teresa", "Lapa", "Centro", "São Cristóvão",
  "Méier", "Tijuca", "Vila Isabel", "Grajaú", "Andaraí", "Piedade", "Engenho Novo",
  "Inhaúma", "Ramos", "Olaria", "Penha", "Brás de Pina", "Vigário Geral",
  "Parada de Lucas", "Bonsucesso", "Manguinhos", "Benfica", "São Francisco Xavier",
  "Rocha", "Maracanã", "Vila Isabel", "Grajaú", "Andaraí", "Piedade",
  "Jardim Botânico", "Gávea", "Lagoa", "Humaitá", "Urca", "Cosme Velho",
  "Santa Teresa", "Laranjeiras", "Catete", "Glória", "Flamengo", "Botafogo"
];

const REFERENCIAS = [
  "Próximo ao mercado", "Ao lado da escola", "Em frente à farmácia",
  "Próximo à praça", "Ao lado do posto de gasolina", "Em frente ao supermercado",
  "Próximo à igreja", "Ao lado da padaria", "Em frente à clínica",
  "Próximo ao banco", "Ao lado da lanchonete", "Em frente à loja",
  "Próximo ao hospital", "Ao lado do açougue", "Em frente à sorveteria",
  "Próximo à delegacia", "Ao lado da praça de esportes", "Em frente ao parque",
  "Próximo à rodoviária", "Ao lado do shopping", "Em frente à estação",
  "Próximo ao terminal de ônibus", "Ao lado da biblioteca", "Em frente ao cinema",
  "Próximo à universidade", "Ao lado do restaurante", "Em frente à academia",
  "Próximo ao estádio", "Ao lado do hotel", "Em frente à agência dos correios",
  "Próximo à prefeitura", "Ao lado da delegacia", "Em frente à igreja matriz",
  "Próximo ao centro de saúde", "Ao lado da creche", "Em frente ao posto médico",
  "Próximo à feira livre", "Ao lado do açougue", "Em frente à banca de jornal",
  "Próximo à loja de materiais", "Ao lado da oficina", "Em frente à lavanderia",
  "Próximo ao pet shop", "Ao lado da papelaria", "Em frente à loja de roupas",
  "Próximo ao salão de beleza", "Ao lado da barbearia", "Em frente à ótica"
];

const DDDS = [
  "11", "12", "13", "14", "15", "16", "17", "18", "19", // SP
  "21", "22", "24", // RJ
  "27", "28", // ES
  "31", "32", "33", "34", "35", "37", "38", // MG
  "41", "42", "43", "44", "45", "46", // PR
  "47", "48", "49", // SC
  "51", "53", "54", "55", // RS
  "61", // DF
  "62", "64", // GO
  "63", // TO
  "65", "66", // MT
  "67", // MS
  "68", // AC
  "69", // RO
  "71", "73", "74", "75", "77", // BA
  "79", // SE
  "81", "87", // PE
  "82", // AL
  "83", // PB
  "84", // RN
  "85", "88", // CE
  "86", "89", // PI
  "91", "93", "94", // PA
  "92", "97", // AM
  "95", // RR
  "96", // AP
  "98", "99" // MA
];

/**
 * Gera um cliente aleatório completo
 */
export function generateRandomClient() {
  // Nome completo
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const name = `${firstName} ${lastName}`;

  // Valor inteiro (sem centavos) entre 100 e 10000
  const value = Math.floor(Math.random() * 9900 + 100);

  // Bairro aleatório
  const bairro = BAIRROS[Math.floor(Math.random() * BAIRROS.length)];

  // Número da casa entre 1 e 9999
  const numero = String(Math.floor(Math.random() * 9999 + 1));

  // Referência aleatória
  const referencia = REFERENCIAS[Math.floor(Math.random() * REFERENCIAS.length)];

  // Telefone aleatório com DDD e número (9 dígitos para celular brasileiro)
  const ddd = DDDS[Math.floor(Math.random() * DDDS.length)];
  const phoneNumber = String(Math.floor(Math.random() * 900000000 + 100000000)); // 9 dígitos
  const telefone = `(${ddd}) ${phoneNumber.slice(0, 5)}-${phoneNumber.slice(5)}`;

  // Data aleatória entre hoje e 90 dias à frente
  const today = new Date();
  const randomDate = new Date(today);
  randomDate.setDate(today.getDate() + Math.floor(Math.random() * 90 + 1));

  return {
    name,
    value: value.toLocaleString("pt-BR"),
    bairro,
    numero,
    referencia,
    telefone,
    nextChargeDate: randomDate,
  };
}




