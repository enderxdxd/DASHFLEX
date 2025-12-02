const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const Busboy = require("busboy");
const XLSX = require("xlsx");
const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);

const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

app.post("/", (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = "";
  let unidade = "";
  let autoConvertAdmin = "true"; // default mantém comportamento atual

  // Captura campos simples
  // - unidade
  // - autoConvertAdmin (flag "true" | "false")
  busboy.on("field", (fieldname, val) => {
    if (fieldname === "unidade") {
      unidade = val.trim().toLowerCase();
      console.log(`Unidade recebida: ${unidade}`);
    } else if (fieldname === "autoConvertAdmin") {
      autoConvertAdmin = val.trim().toLowerCase();
    }
  });

  // Captura o arquivo Excel
  busboy.on("file", (fieldname, file, filename) => {
    if (fieldname === "file") {
      fileName = filename;
      const buffers = [];
      file.on("data", (data) => buffers.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(buffers);
      });
    }
  });

  busboy.on("finish", async () => {
    try {
      // Validações iniciais
      if (!fileBuffer) {
        return res.status(400).json({ success: false, error: "Nenhum arquivo recebido" });
      }
      const ext = fileName.split(".").pop().toLowerCase();
      if (!["xls", "xlsx"].includes(ext)) {
        return res.status(400).json({ success: false, error: "Apenas arquivos Excel permitidos" });
      }
      if (!unidade) {
        return res.status(400).json({ success: false, error: "Unidade não especificada" });
      }
      const unidadesValidas = ["alphaville", "buenavista", "marista", "palmas"];
      if (!unidadesValidas.includes(unidade)) {
        return res.status(400).json({ success: false, error: "Unidade inválida" });
      }

      // Lê o Excel
      let workbook;
      try {
        workbook = XLSX.read(fileBuffer, { type: "buffer" });
      } catch (err) {
        return res.status(400).json({ success: false, error: "Formato de arquivo inválido" });
      }
      const sheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      if (!rows.length) {
        return res.status(400).json({ success: false, error: "Nenhuma linha encontrada na planilha" });
      }

      const shouldConvert = autoConvertAdmin === "true";

      // Transforma linhas em objetos de venda válidos
      const sales = [];
      for (const row of rows) {
        const dataLancRaw = (row["Data Lançamento"] || "").trim();
        if (!dataLancRaw) continue;
        const parsed = dayjs(dataLancRaw, "DD/MM/YYYY");
        if (!parsed.isValid()) continue;

        const valor = Number(
          (row["Valor"] || "")
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
        ) || 0;

        // extrai Resp. Recebimento e Resp. Venda
        const respRecebimento = (
          row["Resp. Recebimento"] ||
          row["Resp Recebimento"] ||
          row["Responsável"] ||
          ""
        ).trim();

        const respVenda = (
          row["Resp. Venda"] ||
          row["Resp Venda"] ||
          ""
        ).trim();

        // Se o responsável for 'Administrador' e usuário optou pela conversão, usa o respVenda
        const responsavelFinal = shouldConvert && respRecebimento === 'Administrador' && respVenda ? respVenda : respRecebimento;

        // 🔧 NOVA LÓGICA: Usar campo "Duração" da planilha diretamente
        const duracaoRaw = (row["Duração"] || "").toString().trim();
        let duracaoMeses = 0;
        
        // Extrai número da duração (ex: "12" = 12 meses)
        if (duracaoRaw) {
          const duracaoNum = parseInt(duracaoRaw);
          if (!isNaN(duracaoNum) && duracaoNum > 0) {
            duracaoMeses = duracaoNum;
          }
        }
        
        // Processa datas apenas para referência (opcional)
        const dataInicioRaw = (row["Data Início"] || "").trim();
        const dataTerminoRaw = (row["Data Término"] || "").trim();
        
        let dataInicioFormatada = "";
        let dataTerminoFormatada = "";
        
        if (dataInicioRaw) {
          const parsedInicio = dayjs(dataInicioRaw, "DD/MM/YYYY");
          if (parsedInicio.isValid()) {
            dataInicioFormatada = parsedInicio.format("YYYY-MM-DD");
          }
        }
        
        if (dataTerminoRaw) {
          const parsedTermino = dayjs(dataTerminoRaw, "DD/MM/YYYY");
          if (parsedTermino.isValid()) {
            dataTerminoFormatada = parsedTermino.format("YYYY-MM-DD");
          }
        }

        sales.push({
          produto:            (row["Produto"]               || "").trim(),
          matricula:          (row["Matrícula"]             || "").trim(),
          nome:               (row["Nome"]                  || "").trim(),
          responsavel:        responsavelFinal,    // Usa o respVenda se for 'Administrador'
          respVenda,                              // mantém o respVenda original
          dataCadastro:       (row["Data de Cadastro"]      || "").trim(),
          numeroContrato:     (row["N° Contrato"]           || "").trim(),
          
          // 🔧 NOVA LÓGICA: Usar duração da planilha diretamente
          dataInicio:         dataInicioFormatada,          // Data formatada YYYY-MM-DD
          dataTermino:        dataTerminoFormatada,         // Data formatada YYYY-MM-DD
          dataFim:            dataTerminoFormatada,         // Para compatibilidade com frontend
          
          // Campo principal: duração em meses
          duracaoMeses:       duracaoMeses,                 // Número de meses (1, 3, 6, 12, 24, etc)
          
          // Campos originais para referência
          dataInicioOriginal: (row["Data Início"]           || "").trim(),
          dataTerminoOriginal:(row["Data Término"]          || "").trim(),
          duracao:            duracaoRaw,                   // Valor original da planilha
          modalidades:        (row["Modalidades"]           || "").trim(),
          plano:              (row["Plano"]                 || "").trim(),
          situacaoContrato:   (row["Situação de Contrato"]  || "").trim(),
          dataLancamento:     dataLancRaw,
          dataFormatada:      parsed.format("YYYY-MM-DD"),
          formaPagamento:     (row["Forma Pagamento"]       || "").trim(),
          condicaoPagamento:  (row["Condicao Pagamento"]    || "").trim(),
          valor,
          empresa:            (row["Empresa"]               || "").trim(),
          unidade
        });
      }

      if (!sales.length) {
        return res.status(200).json({
          success: true,
          message: "Nenhuma venda válida para importar.",
          fileName,
          unidade
        });
      }

      // Batch writes em grupos de até 500
      const vendasRef = db.collection("faturamento")
        .doc(unidade)
        .collection("vendas");

      const commits = [];
      let batch = db.batch();

      sales.forEach((sale, idx) => {
        const docRef = vendasRef.doc();
        batch.set(docRef, sale);

        if ((idx + 1) % 500 === 0) {
          commits.push(batch.commit());
          batch = db.batch();
        }
      });

      // Comita o batch restante
      commits.push(batch.commit());

      // Executa todos os commits em paralelo
      await Promise.all(commits);

      console.log(`Total de vendas salvas: ${sales.length}`);

      return res.status(200).json({
        success: true,
        message: `Arquivo processado com sucesso. Foram registradas ${sales.length} venda(s).`,
        fileName,
        unidade
      });
    } catch (err) {
      console.error("Erro no processamento:", err);
      return res.status(500).json({ success: false, error: "Erro interno no servidor" });
    }
  });

  // Dispara o parser
  req.rawBody ? busboy.end(req.rawBody) : req.pipe(busboy);
});

// ==========================================
// FUNÇÃO PARA PERSONAL 
// ==========================================
const appPersonal = express();
appPersonal.use(cors({ origin: true }));

appPersonal.post("/", (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = "";
  let unidade = "";

  busboy.on("field", (fieldname, val) => {
    if (fieldname === "unidade") {
      unidade = val.trim().toLowerCase();
      console.log(`Unidade recebida para Personal: ${unidade}`);
    }
  });

  busboy.on("file", (fieldname, file, filename) => {
    if (fieldname === "file") {
      fileName = filename;
      const buffers = [];
      file.on("data", (data) => buffers.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(buffers);
      });
    }
  });

  busboy.on("finish", async () => {
    try {
      // Validações iniciais
      if (!fileBuffer) {
        return res.status(400).json({ 
          success: false, 
          error: "Nenhum arquivo recebido" 
        });
      }

      const ext = fileName.split(".").pop().toLowerCase();
      if (!["xls", "xlsx"].includes(ext)) {
        return res.status(400).json({ 
          success: false, 
          error: "Apenas arquivos Excel (.xls, .xlsx) são permitidos" 
        });
      }

      if (!unidade) {
        return res.status(400).json({ 
          success: false, 
          error: "Unidade não especificada" 
        });
      }

      const unidadesValidas = ["alphaville", "buenavista", "marista"];
      if (!unidadesValidas.includes(unidade)) {
        return res.status(400).json({ 
          success: false, 
          error: `Unidade inválida. Valores aceitos: ${unidadesValidas.join(", ")}` 
        });
      }

      // Lê o Excel
      let workbook;
      try {
        workbook = XLSX.read(fileBuffer, { 
          type: "buffer",
          cellStyles: true,
          cellFormulas: true,
          cellDates: true
        });
      } catch (err) {
        console.error("Erro ao ler Excel:", err);
        return res.status(400).json({ 
          success: false, 
          error: "Formato de arquivo Excel inválido" 
        });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converte para array de arrays para análise da estrutura
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!rawData || rawData.length < 3) {
        return res.status(400).json({ 
          success: false, 
          error: "Planilha vazia ou sem dados suficientes" 
        });
      }

      // Detecta estrutura da planilha de personal
      let dataStartRow = 2; // dados começam na linha 3 (índice 2)
      let headers = rawData[1]; // Headers na linha 2 (índice 1)

      if (!headers || !Array.isArray(headers)) {
        return res.status(400).json({ 
          success: false, 
          error: "Estrutura de planilha inválida - headers não encontrados" 
        });
      }

      // Estrutura específica para a planilha de personal
      // A planilha tem headers fixos: ["personal", "aluno", "produto", "valor", "desconto", "valorFinal", "situacao"]
      
      console.log("Headers da planilha:", headers);
      console.log("Número de colunas:", headers.length);
      
      // Verifica se tem pelo menos 7 colunas
      if (!headers || headers.length < 7) {
        return res.status(400).json({ 
          success: false, 
          error: `Planilha deve ter pelo menos 7 colunas. Encontradas: ${headers?.length || 0}` 
        });
      }

      // Assume posições fixas baseadas na estrutura da planilha
      const headerMap = {
        personal: 0,      // Coluna A
        aluno: 1,         // Coluna B  
        produto: 2,       // Coluna C
        valor: 3,         // Coluna D
        desconto: 4,      // Coluna E
        valorFinal: 5,    // Coluna F
        situacao: 6       // Coluna G
      };

      console.log("Usando mapeamento fixo:", headerMap);

      // Verifica se as colunas têm os nomes esperados (opcional, só para log)
      const expectedNames = ["personal", "aluno", "produto", "valor", "desconto", "valorFinal", "situacao"];
      expectedNames.forEach((name, index) => {
        const actualHeader = headers[index];
        console.log(`Coluna ${index}: esperado "${name}", encontrado "${actualHeader}"`);
      });

      // Processa os dados usando o mapeamento correto
      const personals = [];
      const currentDate = new Date().toISOString();

      for (let i = dataStartRow; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length < 7) continue;

        // Usa o mapeamento para acessar as colunas corretas
        const personal = (row[headerMap.personal] || "").toString().trim();
        const aluno = (row[headerMap.aluno] || "").toString().trim();
        const produto = (row[headerMap.produto] || "").toString().trim();
        const valor = parseFloat(row[headerMap.valor]) || 0;
        const desconto = parseFloat(row[headerMap.desconto]) || 0;
        const valorFinal = parseFloat(row[headerMap.valorFinal]) || valor - desconto;
        const situacao = (row[headerMap.situacao] || "").toString().trim();

        // Filtra registros válidos
        if (!personal || personal === "-" || !aluno || aluno === "-") {
          continue;
        }

        // Determina se é um contrato ou aluno real
        const isContrato = aluno.toLowerCase().includes("assinar contrato");
        const isAtivo = situacao.toLowerCase() === "pago";
        const hasValue = valorFinal > 0;

        personals.push({
          personal,
          aluno,
          produto: produto === "-" ? "" : produto,
          valor,
          desconto,
          valorFinal,
          situacao: situacao || "Livre",
          
          // Campos adicionais
          isContrato,
          isAtivo,
          hasValue,
          dataImportacao: currentDate,
          unidade,
          
          // Metadados
          fileName,
          rowIndex: i + 1,
          
          // Campos calculados
          personalNormalizado: personal.toLowerCase().trim(),
          alunoNormalizado: aluno.toLowerCase().trim(),
          
          // Data de processamento
          processedAt: dayjs().format("YYYY-MM-DD HH:mm:ss")
        });
      }

      if (!personals.length) {
        return res.status(200).json({
          success: true,
          message: "Nenhum registro válido encontrado na planilha.",
          fileName,
          unidade,
          totalProcessed: 0
        });
      }

      // Salva no Firestore
      const personalsRef = db.collection("faturamento")
        .doc(unidade)
        .collection("personals");

      // Processa em batches de 500
      const batchSize = 500;
      const commits = [];
      
      for (let i = 0; i < personals.length; i += batchSize) {
        const batch = db.batch();
        const batchData = personals.slice(i, i + batchSize);
        
        batchData.forEach((personal) => {
          const docRef = personalsRef.doc();
          batch.set(docRef, personal);
        });
        
        commits.push(batch.commit());
      }

      // Executa todos os commits
      await Promise.all(commits);

      // Estatísticas para retorno
      const statistics = {
        totalRegistros: personals.length,
        personalsUnicos: [...new Set(personals.map(p => p.personal))].length,
        alunosUnicos: [...new Set(personals.filter(p => !p.isContrato).map(p => p.aluno))].length,
        registrosPagos: personals.filter(p => p.isAtivo).length,
        registrosComValor: personals.filter(p => p.hasValue).length,
        valorTotalFaturamento: personals.reduce((sum, p) => sum + p.valorFinal, 0),
        situacoes: [...new Set(personals.map(p => p.situacao))],
        produtos: [...new Set(personals.filter(p => p.produto).map(p => p.produto))]
      };

      console.log(`Personal Import - Unidade: ${unidade}`);
      console.log(`Total de registros salvos: ${personals.length}`);
      console.log(`Personals únicos: ${statistics.personalsUnicos}`);
      console.log(`Valor total: R$ ${statistics.valorTotalFaturamento.toFixed(2)}`);

      return res.status(200).json({
        success: true,
        message: `Arquivo processado com sucesso! ${personals.length} registro(s) de personal importado(s).`,
        fileName,
        unidade,
        statistics,
        totalProcessed: personals.length
      });

    } catch (err) {
      console.error("Erro no processamento da planilha de personal:", err);
      return res.status(500).json({ 
        success: false, 
        error: "Erro interno no servidor: " + err.message 
      });
    }
  });

  req.rawBody ? busboy.end(req.rawBody) : req.pipe(busboy);
});

// ==========================================
// FUNÇÃO PARA DESCONTOS
// ==========================================

const appDescontos = express();
appDescontos.use(cors({ origin: true }));

appDescontos.post("/", (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = "";
  let unidade = "";

  busboy.on("field", (fieldname, val) => {
    if (fieldname === "unidade") {
      unidade = val.trim().toLowerCase();
      console.log(`Unidade recebida: ${unidade}`);
    }
  });

  busboy.on("file", (fieldname, file, filename) => {
    if (fieldname === "file") {
      fileName = filename;
      const buffers = [];
      file.on("data", (data) => buffers.push(data));
      file.on("end", () => {
        fileBuffer = Buffer.concat(buffers);
      });
    }
  });

  busboy.on("finish", async () => {
    try {
      // Validações básicas
      if (!fileBuffer) {
        return res.status(400).json({
          success: false,
          error: "Arquivo não encontrado"
        });
      }

      const ext = fileName.split(".").pop()?.toLowerCase();
      if (!["xls", "xlsx"].includes(ext)) {
        return res.status(400).json({
          success: false,
          error: "Apenas arquivos Excel (.xls, .xlsx) são permitidos"
        });
      }

      if (!unidade) {
        return res.status(400).json({
          success: false,
          error: "Unidade não especificada"
        });
      }

      const unidadesValidas = ["alphaville", "buenavista", "marista"];
      if (!unidadesValidas.includes(unidade)) {
        return res.status(400).json({
          success: false,
          error: `Unidade inválida. Valores aceitos: ${unidadesValidas.join(", ")}`
        });
      }

      // Lê o Excel
      let workbook;
      try {
        workbook = XLSX.read(fileBuffer, {
          type: "buffer",
          cellStyles: true,
          cellFormulas: true,
          cellDates: true
        });
      } catch (err) {
        console.error("Erro ao ler Excel:", err);
        return res.status(400).json({
          success: false,
          error: "Formato de arquivo Excel inválido"
        });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converte para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Planilha vazia ou sem dados"
        });
      }

      // Processa os dados de desconto baseado na estrutura real da planilha
      const descontosRaw = [];
      const currentDate = new Date().toISOString();

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Extrai dados conforme estrutura real: Matrícula, Nome, Responsável, Tipo, Convênio, Lançamento, Valor
        const matricula = (row["Matrícula"] || row["Matricula"] || "").toString().trim();
        const nome = (row["Nome"] || "").toString().trim();
        const responsavel = (row["Responsável"] || row["Responsavel"] || "").toString().trim();
        const tipo = (row["Tipo"] || "").toString().trim().toUpperCase(); // PLANO ou MATRÍCULA
        const convenio = (row["Convênio"] || row["Convenio"] || "").toString().trim();
        const lancamento = row["Lançamento"] || row["Lancamento"] || currentDate;
        // 🔧 CORREÇÃO: Usar a mesma lógica de limpeza de valores da função principal
        const valorDesconto = Number(
          (row["Valor"] || "")
            .toString()
            .replace("R$", "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim()
        ) || 0;

        // Filtra registros válidos
        if (!matricula || !nome || !tipo || valorDesconto <= 0) {
          continue;
        }

        // Normaliza a data de lançamento
        let dataLancamentoFormatada;
        try {
          // Tenta parsear diferentes formatos de data
          const dataParseada = dayjs(lancamento);
          dataLancamentoFormatada = dataParseada.isValid() ? 
            dataParseada.format("YYYY-MM-DD") : 
            dayjs().format("YYYY-MM-DD");
        } catch {
          dataLancamentoFormatada = dayjs().format("YYYY-MM-DD");
        }

        descontosRaw.push({
          matricula,
          nome,
          responsavel,
          tipo, // "PLANO" ou "MATRÍCULA"
          convenio,
          valorDesconto,
          dataLancamento: dataLancamentoFormatada,
          
          // Campos de controle
          unidade,
          dataImportacao: currentDate,
          fileName,
          rowIndex: i + 1,
          
          // Campos normalizados para busca
          matriculaNormalizada: matricula.toLowerCase().trim(),
          nomeNormalizado: nome.toLowerCase().trim(),
          responsavelNormalizado: responsavel.toLowerCase().trim(),
          
          // Data de processamento
          processedAt: dayjs().format("YYYY-MM-DD HH:mm:ss")
        });
      }

      // Agrupa por matrícula + nome para consolidar PLANO e MATRÍCULA
      const descontosConsolidados = {};
      
      descontosRaw.forEach(item => {
        const chave = `${item.matricula}_${item.nomeNormalizado}`;
        
        if (!descontosConsolidados[chave]) {
          descontosConsolidados[chave] = {
            matricula: item.matricula,
            nome: item.nome,
            responsavel: item.responsavel,
            convenio: item.convenio,
            dataLancamento: item.dataLancamento,
            
            // Valores separados
            descontoPlano: 0,
            descontoMatricula: 0,
            totalDesconto: 0,
            
            // Detalhes dos itens
            itensDesconto: [],
            
            // Campos de controle
            unidade: item.unidade,
            dataImportacao: item.dataImportacao,
            fileName: item.fileName,
            
            // Campos normalizados
            matriculaNormalizada: item.matriculaNormalizada,
            nomeNormalizado: item.nomeNormalizado,
            responsavelNormalizado: item.responsavelNormalizado,
            
            processedAt: item.processedAt
          };
        }
        
        const consolidado = descontosConsolidados[chave];
        
        // Adiciona o valor conforme o tipo
        if (item.tipo === "PLANO") {
          consolidado.descontoPlano += item.valorDesconto;
        } else if (item.tipo === "MATRÍCULA") {
          consolidado.descontoMatricula += item.valorDesconto;
        }
        
        // Adiciona aos itens detalhados
        consolidado.itensDesconto.push({
          tipo: item.tipo,
          valor: item.valorDesconto,
          rowIndex: item.rowIndex
        });
        
        // Atualiza total
        consolidado.totalDesconto = consolidado.descontoPlano + consolidado.descontoMatricula;
      });

      const descontos = Object.values(descontosConsolidados).map(item => ({
        ...item,
        // Calcula percentual baseado no total (será recalculado quando cruzar com vendas)
        percentualEstimado: 0, // Será calculado na análise
        temDescontoPlano: item.descontoPlano > 0,
        temDescontoMatricula: item.descontoMatricula > 0,
        
        // Classificação
        tipoDesconto: item.totalDesconto > 1000 ? "Alto" : 
                     item.totalDesconto > 300 ? "Médio" : "Baixo"
      }));

      if (!descontos.length) {
        return res.status(200).json({
          success: true,
          message: "Nenhum registro válido de desconto encontrado na planilha.",
          fileName,
          unidade,
          totalProcessed: 0
        });
      }

      // Salva no Firestore
      const descontosRef = db.collection("faturamento")
        .doc(unidade)
        .collection("descontos");

      // Processa em batches de 500
      const batchSize = 500;
      const commits = [];

      for (let i = 0; i < descontos.length; i += batchSize) {
        const batch = db.batch();
        const batchData = descontos.slice(i, i + batchSize);

        batchData.forEach((desconto) => {
          const docRef = descontosRef.doc();
          batch.set(docRef, desconto);
        });

        commits.push(batch.commit());
      }

      // Executa todos os commits
      await Promise.all(commits);

      // Estatísticas para retorno
      const statistics = {
        totalRegistros: descontos.length,
        registrosOriginais: descontosRaw.length,
        matriculasUnicas: [...new Set(descontos.map(d => d.matricula))].length,
        responsaveisUnicos: [...new Set(descontos.filter(d => d.responsavel).map(d => d.responsavel))].length,
        totalDescontoPlano: descontos.reduce((sum, d) => sum + d.descontoPlano, 0),
        totalDescontoMatricula: descontos.reduce((sum, d) => sum + d.descontoMatricula, 0),
        totalDescontoGeral: descontos.reduce((sum, d) => sum + d.totalDesconto, 0),
        descontosPorTipo: {
          alto: descontos.filter(d => d.tipoDesconto === "Alto").length,
          medio: descontos.filter(d => d.tipoDesconto === "Médio").length,
          baixo: descontos.filter(d => d.tipoDesconto === "Baixo").length
        },
        distribuicao: {
          comDescontoPlano: descontos.filter(d => d.temDescontoPlano).length,
          comDescontoMatricula: descontos.filter(d => d.temDescontoMatricula).length,
          comAmbos: descontos.filter(d => d.temDescontoPlano && d.temDescontoMatricula).length
        },
        descontoMedioPorMatricula: descontos.length > 0 ? 
          descontos.reduce((sum, d) => sum + d.totalDesconto, 0) / descontos.length : 0
      };

      console.log(`Desconto Import - Unidade: ${unidade}`);
      console.log(`Total de registros consolidados: ${descontos.length}`);
      console.log(`Registros originais na planilha: ${statistics.registrosOriginais}`);
      console.log(`Matrículas únicas: ${statistics.matriculasUnicas}`);
      console.log(`Desconto total: R$ ${statistics.totalDescontoGeral.toFixed(2)}`);
      console.log(`- Desconto em planos: R$ ${statistics.totalDescontoPlano.toFixed(2)}`);
      console.log(`- Desconto em matrículas: R$ ${statistics.totalDescontoMatricula.toFixed(2)}`);

      return res.status(200).json({
        success: true,
        message: `Arquivo processado com sucesso! ${descontos.length} registro(s) de desconto importado(s).`,
        fileName,
        unidade,
        statistics,
        totalProcessed: descontos.length
      });

    } catch (err) {
      console.error("Erro no processamento da planilha de descontos:", err);
      return res.status(500).json({
        success: false,
        error: "Erro interno no servidor: " + err.message
      });
    }
  });

  req.rawBody ? busboy.end(req.rawBody) : req.pipe(busboy);
});





exports.uploadXLS = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(app);



exports.uploadPersonal = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(appPersonal);

exports.uploadDescontos = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(appDescontos);
