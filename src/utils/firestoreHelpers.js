// src/utils/firestoreHelpers.js
import { collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import dayjs from "dayjs";
import { db } from "../firebase";

/**
 * Deleta todas as vendas de um mês específico na subcoleção "vendas"
 * @param {string} unidade — nome da unidade (ex: "alphaville")
 * @param {string} mes — no formato "YYYY-MM" (ex: "2025-04")
 */
export async function deleteVendasDoMes(unidade, mes) {
  const vendasRef = collection(
    db,
    "faturamento",
    unidade.toLowerCase(),
    "vendas"
  );
  const primeiroDia = `${mes}-01`;
  const ultimoDia = dayjs(primeiroDia).endOf("month").format("YYYY-MM-DD");

  const vendasDoMesQ = query(
    vendasRef,
    where("dataFormatada", ">=", primeiroDia),
    where("dataFormatada", "<=", ultimoDia)
  );

  const snapshot = await getDocs(vendasDoMesQ);
  if (snapshot.empty) {
    console.log(`Nenhuma venda encontrada para ${mes}`);
    return 0;
  }

  // Firestore tem limite de 500 operações por batch
  const BATCH_SIZE = 500;
  const docs = snapshot.docs;
  const totalDocs = docs.length;
  
  console.log(`Deletando ${totalDocs} vendas em batches de ${BATCH_SIZE}...`);
  
  // Processar em lotes de 500
  for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchDocs = docs.slice(i, Math.min(i + BATCH_SIZE, totalDocs));
    
    batchDocs.forEach((docSnap) => batch.delete(docSnap.ref));
    
    await batch.commit();
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1} concluído (${batchDocs.length} documentos)`);
  }

  return totalDocs;
}
