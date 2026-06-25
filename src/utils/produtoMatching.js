export const normalizarProdutoTexto = (valor) =>
  String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

export const ehVendaPlano = (venda) => {
  if (!venda) return false;

  const produto = normalizarProdutoTexto(venda.produto);
  const plano = normalizarProdutoTexto(venda.plano);
  const duracaoMeses = Number(venda.duracaoMeses || venda.duracao || 0);

  if (produto.includes("diaria") || plano.includes("diaria")) return false;
  if (produto === "plano") return true;

  return duracaoMeses >= 1 && Boolean(plano) && produto.includes("plano");
};

export const produtoSelecionadoCombina = (venda, produtoSelecionado) => {
  const selecionado = normalizarProdutoTexto(produtoSelecionado);
  const produtoVenda = normalizarProdutoTexto(venda?.produto);
  const planoVenda = normalizarProdutoTexto(venda?.plano);

  if (!selecionado) return false;
  if (selecionado === produtoVenda) return true;
  if (selecionado === planoVenda) return true;
  if (selecionado === "plano" && ehVendaPlano(venda)) return true;

  return false;
};

export const vendaCombinaProdutosSelecionados = (venda, produtosSelecionados = []) => {
  if (!produtosSelecionados.length) return true;
  return produtosSelecionados.some((produto) => produtoSelecionadoCombina(venda, produto));
};
