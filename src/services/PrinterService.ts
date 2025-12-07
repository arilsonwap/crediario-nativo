/**
 * ✅ Serviço de Impressão Nativa do Android
 * 
 * Usa react-native-print para abrir o painel de impressão do sistema
 * Funciona com qualquer impressora (Bluetooth, Wi-Fi, PDF, etc.)
 */

import RNPrint from "react-native-print";
import { Client, Payment } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDateBR } from "../utils/formatDate";
import { getPaymentsByClient } from "../database/db";

/**
 * ✅ Imprime recibo simples do cliente (nome + valor pendente)
 */
export async function imprimirReciboSimples(cliente: Client): Promise<void> {
  try {
    const restante = Math.max(0, (cliente.value || 0) - (cliente.paid || 0));
    
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              max-width: 300px;
              margin: 0 auto;
            }
            h2 {
              text-align: center;
              margin-bottom: 16px;
              color: #333;
            }
            hr {
              border: none;
              border-top: 1px solid #ddd;
              margin: 16px 0;
            }
            p {
              margin: 8px 0;
              font-size: 14px;
            }
            strong {
              color: #333;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              opacity: 0.7;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <h2>RECIBO DE PAGAMENTO</h2>
          <hr />
          
          <p><strong>Cliente:</strong> ${cliente.name || "—"}</p>
          ${cliente.bairro ? `<p><strong>Bairro:</strong> ${cliente.bairro}</p>` : ""}
          
          <hr />
          
          <p><strong>Valor Pendente:</strong> ${formatCurrency(restante)}</p>
          
          <hr />
          
          <div class="footer">
            App Crediário - ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `;

    await RNPrint.print({ html });
  } catch (error) {
    console.error("❌ Erro ao imprimir recibo simples:", error);
    throw new Error("Não foi possível imprimir. Verifique se há uma impressora disponível.");
  }
}

/**
 * ✅ Imprime recibo detalhado do cliente (com histórico de pagamentos)
 */
export async function imprimirReciboDetalhado(cliente: Client): Promise<void> {
  try {
    const restante = Math.max(0, (cliente.value || 0) - (cliente.paid || 0));
    const totalPago = cliente.paid || 0;
    const pagamentos = await getPaymentsByClient(cliente.id || 0);
    
    // Formatar histórico de pagamentos
    let historicoHTML = "";
    if (pagamentos.length === 0) {
      historicoHTML = "<p style='color: #666;'>Nenhum pagamento registrado</p>";
    } else {
      const pagamentosLimitados = pagamentos.slice(0, 10); // Limitar a 10 para não exceder
      historicoHTML = pagamentosLimitados
        .map((pagamento: Payment) => {
          const data = formatDateBR(pagamento.created_at);
          return `<p>${data}: ${formatCurrency(pagamento.valor)}</p>`;
        })
        .join("");
      
      if (pagamentos.length > 10) {
        historicoHTML += `<p style='color: #666;'>... e mais ${pagamentos.length - 10} pagamento(s)</p>`;
      }
    }
    
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              max-width: 400px;
              margin: 0 auto;
            }
            h2 {
              text-align: center;
              margin-bottom: 16px;
              color: #333;
            }
            h3 {
              margin-top: 16px;
              margin-bottom: 8px;
              color: #333;
              font-size: 16px;
            }
            hr {
              border: none;
              border-top: 1px solid #ddd;
              margin: 16px 0;
            }
            p {
              margin: 6px 0;
              font-size: 14px;
            }
            strong {
              color: #333;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              opacity: 0.7;
              margin-top: 24px;
            }
            .historico {
              background-color: #f9f9f9;
              padding: 12px;
              border-radius: 4px;
              margin: 12px 0;
            }
          </style>
        </head>
        <body>
          <h2>RECIBO DETALHADO</h2>
          <hr />
          
          <p><strong>Cliente:</strong> ${cliente.name || "—"}</p>
          ${cliente.telefone ? `<p><strong>Telefone:</strong> ${cliente.telefone}</p>` : ""}
          ${cliente.bairro ? `<p><strong>Bairro:</strong> ${cliente.bairro}</p>` : ""}
          ${cliente.numero ? `<p><strong>Número:</strong> ${cliente.numero}</p>` : ""}
          
          <hr />
          
          <h3>HISTÓRICO DE PAGAMENTOS</h3>
          <div class="historico">
            ${historicoHTML}
          </div>
          
          <hr />
          
          <p><strong>Total Pago:</strong> ${formatCurrency(totalPago)}</p>
          <p><strong>Total Pendente:</strong> ${formatCurrency(restante)}</p>
          
          ${cliente.observacoes ? `
            <hr />
            <h3>OBSERVAÇÕES</h3>
            <p>${cliente.observacoes}</p>
          ` : ""}
          
          <hr />
          
          <div class="footer">
            App Crediário - ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `;

    await RNPrint.print({ html });
  } catch (error) {
    console.error("❌ Erro ao imprimir recibo detalhado:", error);
    throw new Error("Não foi possível imprimir. Verifique se há uma impressora disponível.");
  }
}

/**
 * ✅ Imprime recibo de pagamento específico
 */
export async function imprimirRecibo(
  cliente: Client,
  pagamento: { valor: number; data: string; proximaData?: string | null }
): Promise<void> {
  try {
    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 24px;
              max-width: 300px;
              margin: 0 auto;
            }
            h2 {
              text-align: center;
              margin-bottom: 16px;
              color: #333;
            }
            hr {
              border: none;
              border-top: 1px solid #ddd;
              margin: 16px 0;
            }
            p {
              margin: 8px 0;
              font-size: 14px;
            }
            strong {
              color: #333;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              opacity: 0.7;
              margin-top: 24px;
            }
          </style>
        </head>
        <body>
          <h2>RECIBO DE PAGAMENTO</h2>
          <hr />
          
          <p><strong>Cliente:</strong> ${cliente.name || "—"}</p>
          ${cliente.bairro ? `<p><strong>Bairro:</strong> ${cliente.bairro}</p>` : ""}
          ${cliente.numero ? `<p><strong>Endereço:</strong> ${cliente.numero}</p>` : ""}
          
          <br />
          
          <p><strong>Valor Pago:</strong> ${formatCurrency(pagamento.valor)}</p>
          <p><strong>Data:</strong> ${pagamento.data}</p>
          
          ${pagamento.proximaData ? `
            <p><strong>Próxima Data:</strong> ${pagamento.proximaData}</p>
          ` : ""}
          
          <hr />
          
          <div class="footer">
            App Crediário - ${new Date().getFullYear()}
          </div>
        </body>
      </html>
    `;

    await RNPrint.print({ html });
  } catch (error) {
    console.error("❌ Erro ao imprimir recibo:", error);
    throw new Error("Não foi possível imprimir. Verifique se há uma impressora disponível.");
  }
}



