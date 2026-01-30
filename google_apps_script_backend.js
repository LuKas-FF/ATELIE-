
/**
 * OMNISTOCK ENTERPRISE - BACKEND CORE
 * Versão: 1.1.0 - Módulo de Exportação
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Ateliê 7 Divas - ERP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Exporta todos os dados do dia para uma nova aba na planilha
 */
function saveDailyReport(data) {
  // data: { transactions: [], products: [], rawMaterials: [], date: string }
  const dateStr = data.date || new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
  const sheetName = `RELAT_DIA_${dateStr}`;
  
  let reportSheet = SS.getSheetByName(sheetName);
  if (reportSheet) {
    SS.deleteSheet(reportSheet);
  }
  reportSheet = SS.insertSheet(sheetName);

  // Estilo de Cabeçalho
  const headerStyle = SpreadsheetApp.newCellStyle()
    .setBackground('#000000')
    .setFontColor('#D4AF37')
    .setFontWeight('bold')
    .setHorizontalAlignment(SpreadsheetApp.HorizontalAlignment.CENTER)
    .build();

  // --- SEÇÃO 1: RESUMO FINANCEIRO ---
  reportSheet.getRange('A1').setValue('RESUMO DO DIA: ' + dateStr).setFontWeight('bold').setFontSize(14);
  
  const summaryHeaders = [['Total Faturado', 'Qtd Saídas', 'Investimento Insumos']];
  reportSheet.getRange('A3:C3').setValues(summaryHeaders).setStyles([Array(3).fill(headerStyle)]);
  
  const totalRevenue = data.transactions.filter(t => t.type === 'SALE').reduce((s, t) => s + t.totalValue, 0);
  const totalQty = data.transactions.filter(t => t.type === 'SALE').reduce((s, t) => s + t.quantity, 0);
  const totalInsumos = data.rawMaterials.reduce((s, t) => s + (t.value || 0), 0);
  
  reportSheet.getRange('A4:C4').setValues([[totalRevenue, totalQty, totalInsumos]]);
  reportSheet.getRange('A4:C4').setNumberFormat('R$ #,##0.00');

  // --- SEÇÃO 2: DETALHAMENTO DE TRANSAÇÕES (SAÍDAS) ---
  reportSheet.getRange('A6').setValue('DETALHAMENTO DE SAÍDAS / VENDAS').setFontWeight('bold');
  const txHeaders = [['ID', 'Hora', 'Produto', 'Qtd', 'Valor Unit.', 'Valor Total', 'Loja']];
  reportSheet.getRange('A7:G7').setValues(txHeaders).setStyles([Array(7).fill(headerStyle)]);
  
  const txRows = data.transactions.map(t => [
    t.id, 
    new Date(t.timestamp).toLocaleTimeString(), 
    t.productName || t.productId, 
    t.quantity, 
    t.unitPrice, 
    t.totalValue, 
    t.storeName || 'N/A'
  ]);
  
  if (txRows.length > 0) {
    reportSheet.getRange(8, 1, txRows.length, 7).setValues(txRows);
  }

  // --- SEÇÃO 3: ENTRADA DE INSUMOS ---
  const insumosStartRow = 8 + txRows.length + 2;
  reportSheet.getRange(insumosStartRow, 1).setValue('ENTRADAS DE INSUMOS (TECIDOS)').setFontWeight('bold');
  const insHeaders = [['Item', 'Fornecedor', 'Quantidade', 'Unidade', 'Valor']];
  reportSheet.getRange(insumosStartRow + 1, 1, 1, 5).setValues(insHeaders).setStyles([Array(5).fill(headerStyle)]);
  
  const insRows = data.rawMaterials.map(rm => [
    rm.item, rm.supplier, rm.quantity, rm.unit, rm.value || 0
  ]);
  
  if (insRows.length > 0) {
    reportSheet.getRange(insumosStartRow + 2, 1, insRows.length, 5).setValues(insRows);
  }

  // Ajuste automático de colunas
  reportSheet.autoResizeColumns(1, 10);
  
  return { success: true, url: SS.getUrl() };
}

function logAudit(userId, action, details) {
  const auditSheet = SS.getSheetByName('MOVIMENTACOES');
  if (!auditSheet) return;
  auditSheet.appendRow([new Date(), userId, action, details]);
}
