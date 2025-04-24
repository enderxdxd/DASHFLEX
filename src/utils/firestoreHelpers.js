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

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  await batch.commit();

  return snapshot.size;
}
