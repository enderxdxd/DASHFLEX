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

exports.uploadXLS = functions
  .region("southamerica-east1")
  .runWith({ timeoutSeconds: 540, memory: "2GB" })
  .https.onRequest(app);
