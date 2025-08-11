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
      const unidadesValidas = ["alphaville", "buenavista", "marista"];
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

        sales.push({
          produto:            (row["Produto"]               || "").trim(),
          matricula:          (row["Matrícula"]             || "").trim(),
          nome:               (row["Nome"]                  || "").trim(),
          responsavel:        responsavelFinal,    // Usa o respVenda se for 'Administrador'
          respVenda,                              // mantém o respVenda original
          dataCadastro:       (row["Data de Cadastro"]      || "").trim(),
          numeroContrato:     (row["N° Contrato"]           || "").trim(),
          dataInicio:         (row["Data Início"]           || "").trim(),
          dataTermino:        (row["Data Término"]          || "").trim(),
          duracao:            (row["Duração"]               || "").trim(),
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





exports.uploadXLS = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(app);



exports.uploadPersonal = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(appPersonal);
