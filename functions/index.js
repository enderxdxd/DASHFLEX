const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const Busboy = require("busboy"); // Usado sem .default se a versão instalada permite
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

  // Captura os campos de texto
  busboy.on("field", (fieldname, val) => {
    if (fieldname === "unidade") {
      unidade = val.trim();
      console.log(`Unidade recebida: ${unidade}`);
    }
  });

  // Captura o arquivo enviado no campo "file"
  busboy.on("file", (fieldname, file, filename) => {
    if (fieldname === "file") {
      fileName = filename;
      console.log(`Arquivo recebido: ${filename}`);
      const buffers = [];
      file.on("data", (data) => {
        buffers.push(data);
      });
      file.on("end", () => {
        fileBuffer = Buffer.concat(buffers);
        console.log(`Tamanho do arquivo: ${fileBuffer.length} bytes`);
      });
    }
  });

  busboy.on("finish", async () => {
    try {
      // Validações iniciais
      if (!fileBuffer) {
        return res.status(400).json({ success: false, error: "Nenhum arquivo recebido" });
      }
      const fileExt = fileName.split(".").pop().toLowerCase();
      if (!["xls", "xlsx"].includes(fileExt)) {
        return res.status(400).json({ success: false, error: "Apenas arquivos Excel permitidos" });
      }
      if (!unidade) {
        return res.status(400).json({ success: false, error: "Unidade não especificada" });
      }
      const unidadesValidas = ["alphaville", "buenavista", "marista"];
      if (!unidadesValidas.includes(unidade.toLowerCase())) {
        return res.status(400).json({ success: false, error: "Unidade inválida" });
      }

      // Processa o arquivo Excel
      let workbook;
      try {
        workbook = XLSX.read(fileBuffer, { type: "buffer" });
      } catch (error) {
        console.error("Erro ao processar Excel:", error);
        return res.status(400).json({ success: false, error: "Formato de arquivo inválido" });
      }

      // Seleciona a primeira planilha e converte para JSON
      const sheetName = workbook.SheetNames[0];
      const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      console.log("Sheet Data:", sheetData);
      if (!sheetData || sheetData.length === 0) {
        return res.status(400).json({ success: false, error: "Nenhuma linha encontrada na planilha" });
      }

      let totalSales = 0;
      // Itera sobre cada linha e salva cada venda individualmente
      for (const [index, row] of sheetData.entries()) {
        console.log(`Processando linha ${index + 1}:`, row);
        // Normaliza os campos removendo espaços extras
        const produto = (row["Produto"] || "").trim();
        const matricula = (row["Matrícula"] || "").trim();
        const nome = (row["Nome"] || "").trim();
        // Observe: pode ocorrer erro de digitação; aqui tentamos ambas as variantes:
        const responsavelRaw = row["Responsável"] || row["Reponsável "] || "";
        const responsavel = responsavelRaw.trim();
        const dataCadastro = (row["Data de Cadastro"] || "").trim();
        const numeroContrato = (row["N° Contrato"] || "").trim();
        const dataInicio = (row["Data Início"] || "").trim();
        const dataTermino = (row["Data Término"] || "").trim();
        const duracao = (row["Duração"] || "").trim();
        const modalidades = (row["Modalidades"] || "").trim();
        const plano = (row["Plano"] || "").trim();
        const situacaoContrato = (row["Situação de Contrato"] || "").trim();
        const dataLancamentoRaw = row["Data Lançamento"] || "";
        const dataLancamento = dataLancamentoRaw.trim();
        const formaPagamento = (row["Forma Pagamento"] || "").trim();
        const condicaoPagamento = (row["Condicao Pagamento"] || "").trim();
        // Para o valor, removemos "R$" e substituímos vírgula por ponto, se necessário.
        const valorStr = (row["Valor"] || "")
          .replace("R$", "")
          .replace(/\./g, "")
          .replace(",", ".")
          .trim();
        const valor = Number(valorStr) || 0;
        const empresa = (row["Empresa"] || "").trim();

        // Se a data de lançamento estiver ausente, ignoramos a linha.
        if (!dataLancamento) {
          console.warn(`Linha ${index + 1} ignorada: Data Lançamento ausente.`);
          continue;
        }
        // Faz o parse da data (formato DD/MM/YYYY)
        const parsedDate = dayjs(dataLancamento, "DD/MM/YYYY");
        if (!parsedDate.isValid()) {
          console.warn(`Linha ${index + 1} ignorada: Data Lançamento inválida (${dataLancamento}).`);
          continue;
        }
        const dataFormatada = parsedDate.format("YYYY-MM-DD");

        // Monta o objeto de venda com todos os campos
        const sale = {
          produto,
          matricula,
          nome,
          responsavel,
          dataCadastro,
          numeroContrato,
          dataInicio,
          dataTermino,
          duracao,
          modalidades,
          plano,
          situacaoContrato,
          dataLancamento,
          dataFormatada,
          formaPagamento,
          condicaoPagamento,
          valor,
          empresa,
          unidade: unidade.toLowerCase()
        };

        try {
          // Salva a venda individualmente na coleção "vendas"
          await db
            .collection("faturamento")
            .doc(unidade.toLowerCase())
            .collection("vendas")
            .add(sale);
          totalSales++;
          console.log(`Venda registrada na linha ${index + 1} para ${responsavel}`);
        } catch (writeError) {
          console.error(`Erro ao salvar venda na linha ${index + 1}:`, writeError);
        }
      }

      console.log("Total de vendas salvas:", totalSales);
      return res.status(200).json({
        success: true,
        message: `Arquivo processado com sucesso. Foram registradas ${totalSales} venda(s).`,
        fileName,
        unidade
      });
    } catch (error) {
      console.error("Erro no processamento:", error);
      return res.status(500).json({ success: false, error: "Erro interno no servidor" });
    }
  });

  req.rawBody ? busboy.end(req.rawBody) : req.pipe(busboy);
});

exports.uploadXLS = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 480, memory: "1GB" })
  .https.onRequest(app);
