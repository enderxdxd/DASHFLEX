// src/utils/pdfGenerator.js
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Gera PDF a partir dos dados da análise de comissões
 * @param {Object} dados - Dados da análise
 * @param {string} consultor - Nome do consultor
 * @param {string} unidade - Unidade selecionada
 * @param {string} periodo - Período da análise
 * @param {Function} onProgress - Callback para progresso (opcional)
 */
export const gerarPDFComissoes = async (dados, consultor, unidade, periodo, onProgress = null) => {
  try {
    console.log('🔄 Iniciando geração de PDF...');
    
    if (onProgress) onProgress(10, 'Preparando dados...');
    
    // Para PDF, não precisamos dos dados detalhados das vendas
    const { resultados, estatisticas } = dados;
    const totalVendas = resultados.length;
    
    if (onProgress) onProgress(20, 'Criando layout...');
    
    // Usar setTimeout para não bloquear a UI
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Criar elemento temporário para renderização
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm'; // A4 width
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '12px';
    tempContainer.style.lineHeight = '1.4';
    tempContainer.style.color = '#000000';
    
    if (onProgress) onProgress(30, 'Gerando conteúdo HTML...');
    
    // Criar conteúdo HTML para o PDF (apenas resumo)
    tempContainer.innerHTML = criarConteudoPDF(
      { resultados, estatisticas }, 
      consultor, 
      unidade, 
      periodo,
      totalVendas
    );
    
    // Adicionar ao DOM temporariamente
    document.body.appendChild(tempContainer);
    
    if (onProgress) onProgress(50, 'Renderizando PDF...');
    
    // Usar setTimeout para permitir que a UI atualize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Configurações otimizadas do html2canvas
    const canvasOptions = {
      scale: 1.5, // Reduzido para melhor performance
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: tempContainer.scrollWidth,
      height: tempContainer.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      logging: false, // Desabilitar logs para performance
      removeContainer: true
    };
    
    if (onProgress) onProgress(70, 'Capturando imagem...');
    
    // Capturar como canvas
    const canvas = await html2canvas(tempContainer, canvasOptions);
    
    // Remover elemento temporário
    document.body.removeChild(tempContainer);
    
    if (onProgress) onProgress(85, 'Criando arquivo PDF...');
    
    // Criar PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;
    
    // Adicionar primeira página
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    // Adicionar páginas adicionais se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    if (onProgress) onProgress(95, 'Salvando arquivo...');
    
    // Gerar nome do arquivo
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const nomeArquivo = `analise_comissoes_${consultor.replace(/\s+/g, '_')}_${periodo}_${timestamp}.pdf`;
    
    // Salvar PDF
    pdf.save(nomeArquivo);
    
    if (onProgress) onProgress(100, 'Concluído!');
    
    console.log('✅ PDF gerado com sucesso:', nomeArquivo);
    return { 
      success: true, 
      filename: nomeArquivo,
      totalVendas: resultados.length
    };
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cria o conteúdo HTML formatado para o PDF
 */
const criarConteudoPDF = (dados, consultor, unidade, periodo, totalVendas = 0) => {
  const { resultados, estatisticas } = dados;
  
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 750px; margin: 0 auto; padding: 15px; color: #333; line-height: 1.4; font-size: 12px;">
      <!-- Cabeçalho -->
      <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; page-break-after: avoid;">
        <h1 style="color: #1f2937; font-size: 24px; margin: 0 0 8px 0; font-weight: bold;">📊 RELATÓRIO DE COMISSÕES</h1>
        <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
          <strong>${consultor.nome}</strong> • ${unidade.nome}
        </div>
        <div style="color: #6b7280; font-size: 12px;">
          ${new Date().toLocaleDateString('pt-BR')} • Gerado em ${new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>

      <!-- Resumo Executivo -->
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h2 style="color: #1f2937; font-size: 16px; margin-bottom: 12px; border-left: 3px solid #3b82f6; padding-left: 8px;">
          📈 Resumo Executivo
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <div style="flex: 1; min-width: 200px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: #0c4a6e; margin-bottom: 4px; font-weight: 500;">TOTAL VENDAS</div>
            <div style="font-size: 20px; font-weight: bold; color: #0284c7;">${estatisticas.totalVendas}</div>
          </div>
          <div style="flex: 1; min-width: 200px; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: #15803d; margin-bottom: 4px; font-weight: 500;">VALOR TOTAL DA COMISSÃO</div>
            <div style="font-size: 20px; font-weight: bold; color: #16a34a;">R$ ${Number(estatisticas.totalComissao || estatisticas.comissaoTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <!-- Breakdown por Categoria -->
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h2 style="color: #1f2937; font-size: 16px; margin-bottom: 12px; border-left: 3px solid #3b82f6; padding-left: 8px;">
          📊 Breakdown por Categoria
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <div style="flex: 1; min-width: 160px; background: #eff6ff; border: 1px solid #3b82f6; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: #1e40af; margin-bottom: 4px; font-weight: 500;">PLANOS</div>
            <div style="font-size: 18px; font-weight: bold; color: #2563eb; margin-bottom: 2px;">${estatisticas.planos}</div>
            <div style="font-size: 9px; color: #64748b;">R$ ${Number(estatisticas.valorTotalPlanos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style="flex: 1; min-width: 160px; background: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: #15803d; margin-bottom: 4px; font-weight: 500;">PRODUTOS</div>
            <div style="font-size: 18px; font-weight: bold; color: #16a34a; margin-bottom: 2px;">${estatisticas.produtos}</div>
            <div style="font-size: 9px; color: #64748b;">R$ ${Number(estatisticas.valorTotalProdutos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style="flex: 1; min-width: 160px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: #dc2626; margin-bottom: 4px; font-weight: 500;">NÃO COMISSIONÁVEIS</div>
            <div style="font-size: 18px; font-weight: bold; color: #dc2626; margin-bottom: 2px;">${estatisticas.naoComissionaveis}</div>
            <div style="font-size: 9px; color: #64748b;">R$ ${Number(estatisticas.valorTotalNaoComissionaveis || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <!-- Status da Meta -->
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h2 style="color: #1f2937; font-size: 16px; margin-bottom: 12px; border-left: 3px solid #3b82f6; padding-left: 8px;">
          🎯 Status das Metas
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <div style="flex: 1; min-width: 180px; background: ${estatisticas.bateuMetaIndividual ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${estatisticas.bateuMetaIndividual ? '#d1fae5' : '#fecaca'}; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: ${estatisticas.bateuMetaIndividual ? '#065f46' : '#dc2626'}; margin-bottom: 4px; font-weight: 500;">META INDIVIDUAL</div>
            <div style="font-size: 16px; font-weight: bold; color: ${estatisticas.bateuMetaIndividual ? '#059669' : '#dc2626'}; margin-bottom: 2px;">${(estatisticas.percentualMeta || 0).toFixed(1)}%</div>
            <div style="font-size: 9px; color: #64748b;">R$ ${Number(estatisticas.metaIndividual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div style="flex: 1; min-width: 180px; background: ${estatisticas.unidadeBatida ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${estatisticas.unidadeBatida ? '#d1fae5' : '#fecaca'}; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 10px; color: ${estatisticas.unidadeBatida ? '#065f46' : '#dc2626'}; margin-bottom: 4px; font-weight: 500;">META DA UNIDADE</div>
            <div style="font-size: 16px; font-weight: bold; color: ${estatisticas.unidadeBatida ? '#059669' : '#dc2626'}; margin-bottom: 2px;">${(estatisticas.percentualMetaUnidade || 0).toFixed(1)}%</div>
            <div style="font-size: 9px; color: #64748b;">R$ ${Number(estatisticas.metaUnidadeCalculada || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      <!-- Detalhamento dos Planos -->
      ${estatisticas.planos > 0 ? `
      <div style="margin-bottom: 25px; page-break-inside: avoid;">
        <h2 style="color: #1f2937; font-size: 16px; margin-bottom: 12px; border-left: 3px solid #3b82f6; padding-left: 8px;">
          📋 Detalhamento dos Planos
        </h2>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; page-break-inside: avoid;">
          <div style="text-align: center; margin-bottom: 15px;">
            <h3 style="margin: 0 0 4px 0; color: #1f2937; font-size: 16px; font-weight: bold;">TOTAL PLANOS VENDIDOS</h3>
            <div style="font-size: 24px; font-weight: bold; color: #3b82f6; margin: 8px 0;">${estatisticas.planos}</div>
          </div>
          
          <!-- Tabela com layout melhorado -->
          <div style="overflow: hidden; border-radius: 4px; border: 1px solid #cbd5e1; margin-bottom: 15px;">
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="width: 40%; padding: 8px 6px; text-align: left; font-weight: bold; color: #475569; border-right: 1px solid #e2e8f0; font-size: 10px;">TIPO</th>
                  <th style="width: 30%; padding: 8px 6px; text-align: center; font-weight: bold; color: #dc2626; border-right: 1px solid #e2e8f0; font-size: 10px;">COM DESCONTO</th>
                  <th style="width: 30%; padding: 8px 6px; text-align: center; font-weight: bold; color: #059669; font-size: 10px;">SEM DESCONTO</th>
                </tr>
              </thead>
              <tbody>
                ${criarLinhasPlanos(resultados)}
              </tbody>
            </table>
          </div>
          
          <!-- Resumo com layout flex -->
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="flex: 1; text-align: center; min-width: 100px; padding: 6px; background: #fee2e2; border-radius: 4px;">
              <div style="font-size: 10px; color: #dc2626; font-weight: bold;">📉 Com Desconto</div>
              <div style="font-size: 14px; color: #dc2626; font-weight: bold; margin-top: 2px;">${contarPlanosComDesconto(resultados)}</div>
            </div>
            <div style="flex: 1; text-align: center; min-width: 100px; padding: 6px; background: #dcfce7; border-radius: 4px;">
              <div style="font-size: 10px; color: #059669; font-weight: bold;">📈 Sem Desconto</div>
              <div style="font-size: 14px; color: #059669; font-weight: bold; margin-top: 2px;">${contarPlanosSemDesconto(resultados)}</div>
            </div>
            <div style="flex: 1; text-align: center; min-width: 100px; padding: 6px; background: #dbeafe; border-radius: 4px;">
              <div style="font-size: 10px; color: #3b82f6; font-weight: bold;">📊 % com Desconto</div>
              <div style="font-size: 14px; color: #3b82f6; font-weight: bold; margin-top: 2px;">${calcularPercentualDesconto(resultados)}%</div>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Informação sobre Dados Detalhados -->
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 12px; text-align: center;">
          <h3 style="margin: 0 0 6px 0; color: #0c4a6e; font-size: 14px;">📊 Dados Detalhados</h3>
          <p style="margin: 0; color: #0369a1; font-size: 11px; line-height: 1.4;">
            Para visualizar a lista completa de vendas com detalhes individuais,<br>
            consulte a tabela na tela ou exporte para Excel.
          </p>
        </div>
      </div>

      <!-- Rodapé -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 11px;">
        <p style="margin: 0;">
          Este relatório foi gerado automaticamente pelo sistema DASHFLEX em ${new Date().toLocaleString('pt-BR')}
        </p>
        <p style="margin: 5px 0 0 0;">
          Dados baseados na análise de comissões para o período de ${periodo} - Unidade ${unidade.toUpperCase()}
        </p>
      </div>
    </div>
  `;
};

/**
 * Funções auxiliares para processamento dos planos
 */
const criarLinhasPlanos = (resultados) => {
  const planosData = {};
  
  // Processar vendas de planos
  resultados.forEach(venda => {
    if (venda.ehPlano && venda.plano) {
      const tipoPlano = classificarTipoPlano(venda);
      
      if (!planosData[tipoPlano]) {
        planosData[tipoPlano] = { comDesconto: 0, semDesconto: 0 };
      }
      
      if (venda.temDesconto) {
        planosData[tipoPlano].comDesconto++;
      } else {
        planosData[tipoPlano].semDesconto++;
      }
    }
  });
  
  // Ordenar tipos de plano
  const tiposOrdenados = ['Octomestral', 'Mensal', 'Trimestral', 'Semestral', 'Anual', 'Bianual'];
  
  return tiposOrdenados.map(tipo => {
    const dados = planosData[tipo] || { comDesconto: 0, semDesconto: 0 };
    const total = dados.comDesconto + dados.semDesconto;
    
    if (total === 0) return '';
    
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 6px; color: #1f2937; font-weight: 500; font-size: 10px; border-right: 1px solid #e2e8f0;">${tipo}</td>
        <td style="padding: 6px; text-align: center; background: ${dados.comDesconto > 0 ? '#fee2e2' : '#f9fafb'}; color: ${dados.comDesconto > 0 ? '#dc2626' : '#6b7280'}; font-weight: bold; font-size: 10px; border-right: 1px solid #e2e8f0;">
          ${dados.comDesconto}
        </td>
        <td style="padding: 6px; text-align: center; background: ${dados.semDesconto > 0 ? '#dcfce7' : '#f9fafb'}; color: ${dados.semDesconto > 0 ? '#059669' : '#6b7280'}; font-weight: bold; font-size: 10px;">
          ${dados.semDesconto}
        </td>
      </tr>
    `;
  }).join('');
};

const classificarTipoPlano = (venda) => {
  // Usar a mesma lógica do ComissaoDetalhes.jsx (linhas 594-601)
  const duracao = Number(venda.duracaoMeses || 0);
  let categoria = 'Mensal';
  
  if (duracao >= 24) categoria = 'Bianual';
  else if (duracao >= 12) categoria = 'Anual';
  else if (duracao >= 8) categoria = 'Octomestral';
  else if (duracao >= 6) categoria = 'Semestral';
  else if (duracao >= 3) categoria = 'Trimestral';
  
  return categoria;
};

const contarPlanosComDesconto = (resultados) => {
  return resultados.filter(v => v.ehPlano && v.temDesconto).length;
};

const contarPlanosSemDesconto = (resultados) => {
  return resultados.filter(v => v.ehPlano && !v.temDesconto).length;
};

const calcularPercentualDesconto = (resultados) => {
  const totalPlanos = resultados.filter(v => v.ehPlano).length;
  const planosComDesconto = contarPlanosComDesconto(resultados);
  
  if (totalPlanos === 0) return '0.0';
  return ((planosComDesconto / totalPlanos) * 100).toFixed(1);
};

/**
 * Gera PDF simplificado apenas com estatísticas
 */
export const gerarPDFResumo = async (estatisticas, consultor, unidade, periodo) => {
  try {
    console.log('🔄 Gerando PDF resumido...');
    
    const dados = { resultados: [], estatisticas };
    const resultado = await gerarPDFComissoes(dados, consultor, unidade, periodo);
    
    return resultado;
  } catch (error) {
    console.error('❌ Erro ao gerar PDF resumido:', error);
    return { success: false, error: error.message };
  }
};
