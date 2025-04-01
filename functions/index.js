const functions = require("firebase-functions/v1");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const dayjs = require("dayjs");
const admin = require("firebase-admin");

// Inicialização do Firebase com tratamento de erro
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Configuração do Express
const app = express();

// Configuração do CORS com opções seguras
const corsOptions = {
  origin: true,
  methods: 'POST',
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Configuração do Multer para upload na memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
    fields: 5
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.ms-excel' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Apenas arquivos Excel são permitidos.'), false);
    }
  }
});

// Middleware para validação básica da requisição
const validateRequest = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return res.status(400).json({ 
      success: false,
      error: "Content-Type deve ser multipart/form-data"
    });
  }
  next();
};

// Middleware global para tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no middleware:', err);

  if (err instanceof multer.MulterError) {
    // Erros específicos do Multer
    const errorMap = {
      'LIMIT_FILE_SIZE': 'O arquivo excede o tamanho máximo de 5MB',
      'LIMIT_FILE_COUNT': 'Apenas um arquivo pode ser enviado por vez',
      'LIMIT_UNEXPECTED_FILE': 'Campo de arquivo inválido ou ausente'
    };
    
    return res.status(400).json({
      success: false,
      error: errorMap[err.code] || 'Erro no upload do arquivo'
    });
  } else if (err.message.includes('Tipo de arquivo não suportado')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  res.status(500).json({ 
    success: false,
    error: 'Erro interno no servidor'
  });
});

// Rota principal com tratamento de erros completo
app.post("/", validateRequest, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return next(err);
    }
    next();
  });
}, async (req, res, next) => {
  try {
    // Verificação do arquivo
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: "Nenhum arquivo foi enviado" 
      });
    }

    // Verificação da unidade
    if (!req.body.unidade) {
      return res.status(400).json({ 
        success: false,
        error: "Unidade não especificada" 
      });
    }

    const unidade = req.body.unidade.toLowerCase();
    const unidadesValidas = ['alphaville', 'buenavista', 'marista'];
    
    if (!unidadesValidas.includes(unidade)) {
      return res.status(400).json({ 
        success: false,
        error: "Unidade inválida. Valores aceitos: " + unidadesValidas.join(', ') 
      });
    }

    // Processamento do arquivo XLS
    let workbook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    } catch (err) {
      console.error('Erro na leitura do arquivo Excel:', err);
      return res.status(400).json({ 
        success: false,
        error: "Formato de arquivo inválido ou arquivo corrompido" 
      });
    }

    if (!workbook.SheetNames.length) {
      return res.status(400).json({ 
        success: false,
        error: "Nenhuma planilha encontrada no arquivo" 
      });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let jsonData;
    try {
      jsonData = XLSX.utils.sheet_to_json(sheet);
    } catch (err) {
      console.error('Erro na conversão da planilha:', err);
      return res.status(400).json({ 
        success: false,
        error: "Erro ao processar os dados da planilha" 
      });
    }

    if (!jsonData.length) {
      return res.status(400).json({ 
        success: false,
        error: "Nenhum dado encontrado na planilha" 
      });
    }

    const vendasPorData = {};
    let linhasComErro = 0;

    // Processamento das linhas com tratamento individual
    jsonData.forEach((linha, index) => {
      try {
        const dataStr = linha["Data Lançamento"];
        if (!dataStr) {
          linhasComErro++;
          return;
        }

        const data = dayjs(dataStr, "DD/MM/YYYY");
        if (!data.isValid()) {
          linhasComErro++;
          return;
        }

        const dataFormatada = data.format("YYYY-MM-DD");
        
        let valor = 0;
        if (linha["Valor"]) {
          try {
            valor = parseFloat(
              linha["Valor"].toString()
                .replace(/[^\d,.-]/g, "")
                .replace(".", "")
                .replace(",", ".")
            ) || 0;
          } catch (e) {
            console.warn(`Erro ao converter valor na linha ${index + 1}`);
            valor = 0;
          }
        }

        if (!vendasPorData[dataFormatada]) {
          vendasPorData[dataFormatada] = [];
        }

        vendasPorData[dataFormatada].push({
          produto: linha["Produto"] || "Não especificado",
          nome: linha["Nome"] || "Não especificado",
          responsavel: linha["Reponsável"] || "Não especificado",
          dataCadastro: linha["Data de Cadastro"] || null,
          plano: linha["Plano"] || "Não especificado",
          formaPagamento: linha["Forma Pagamento"] || "Não especificado",
          valor: valor
        });
      } catch (err) {
        console.error(`Erro ao processar linha ${index + 1}:`, err);
        linhasComErro++;
      }
    });

    // Verificação se houve dados válidos
    if (Object.keys(vendasPorData).length === 0) {
      return res.status(400).json({ 
        success: false,
        error: "Nenhum dado válido encontrado no arquivo" 
      });
    }

    // Salvamento no Firestore com transação segura
    try {
      const batch = db.batch();
      const promises = [];
      
      for (const [data, vendas] of Object.entries(vendasPorData)) {
        const date = dayjs(data);
        const ref = db
          .collection("faturamento")
          .doc(unidade)
          .collection(date.format("YYYY"))
          .doc(date.format("MM"))
          .collection("dias")
          .doc(date.format("DD"));

        batch.set(ref, {
          data,
          vendas,
          criadoEm: admin.firestore.FieldValue.serverTimestamp(),
          processadoEm: new Date().toISOString()
        });
      }

      await batch.commit();
      
      const response = { 
        success: true, 
        message: "Vendas salvas com sucesso",
        estatisticas: {
          totalLinhas: jsonData.length,
          linhasProcessadas: jsonData.length - linhasComErro,
          linhasComErro: linhasComErro,
          diasProcessados: Object.keys(vendasPorData).length
        }
      };

      if (linhasComErro > 0) {
        response.aviso = "Algumas linhas contiveram erros e foram ignoradas";
      }

      res.status(200).json(response);

    } catch (firestoreError) {
      console.error('Erro no Firestore:', firestoreError);
      throw new Error("Erro ao salvar dados no banco de dados");
    }

  } catch (error) {
    console.error("Erro no processamento:", error);
    next(error);
  }
});

// Exportação da Cloud Function
module.exports = {
  uploadXLS: functions
    .region('southamerica-east1') // Escolha sua região
    .runWith({
      timeoutSeconds: 120,
      memory: '1GB',
      maxInstances: 3
    })
    .https.onRequest(app)
};