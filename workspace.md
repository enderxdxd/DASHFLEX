Você está trabalhando no projeto DASHFLEX. Antes de codar, leia estes arquivos para entender o comportamento atual e preservar a lógica existente:
- src/hooks/useVendas.js
- src/hooks/useGroupedVendas.js
- src/pages/Dashboard.jsx
- src/pages/AnalyticsPage.jsx
- src/utils/correcaoDiarias.js
- src/utils/calculoRemuneracaoDuracao.js
- src/hooks/useDescontos.js
- functions/index.js

Objetivo:
Implementar um novo índice de ciclo do aluno com 3 classificações:
- matricula
- rematricula
- renovacao

Regras de negócio:
- Matrícula = primeira vez que a matrícula aparece no histórico de planos.
- Matrícula também = retorno após 6 meses ou mais sem plano ativo.
- Renovação = novo plano iniciado da data final do plano anterior até 30 dias depois.
- Rematrícula = novo plano iniciado após mais de 30 dias de inatividade, mas antes de completar 6 meses sem plano.
- Se houver sobreposição ou continuidade de planos, considerar como renovação.
- Diárias, produtos avulsos, taxa de matrícula, estorno, ajuste contábil e cancelamentos não entram nesse índice.
- O índice deve ser calculado por histórico da matrícula, não apenas pela venda isolada do mês.

Decisões técnicas obrigatórias:
- Reaproveitar a lógica já existente de correção/classificação de planos:
  - usar corrigirClassificacaoDiarias
  - usar ehPlanoAposCorrecao
- Não criar uma regra paralela diferente para identificar plano.
- Não usar apenas useGroupedVendas para esse cálculo, porque o agrupamento atual é mensal e pode esconder eventos diferentes do mesmo aluno.
- Partir de vendasOriginais do useVendas.
- Criar uma consolidação específica de “evento de plano” para o ciclo do aluno.

Como consolidar eventos antes da classificação:
- Preferir agrupar por numeroContrato quando existir.
- Se numeroContrato não existir, agrupar por:
  - matricula normalizada
  - dataInicio efetiva
  - dataFim efetiva
  - plano/produto
- Se houver múltiplas linhas do mesmo evento por parcelamento, somar valor, mas contar como 1 evento de ciclo.
- Ignorar registros sem matrícula válida.
- Normalizar matrícula como somente dígitos, usando o mesmo padrão já adotado nos arquivos de desconto.
- Ignorar manualmente registros sem data suficiente para classificação, em vez de chutar.

Datas e fallback:
- Data principal do evento = dataInicio.
- Se dataInicio não existir, usar dataFormatada.
- Se ainda não existir, usar dataCadastro.
- Data final efetiva = dataFim ou dataTermino.
- Se data final não existir mas duracaoMeses existir, derivar a data final com base na data inicial + duracaoMeses.
- Para a regra de 6 meses, usar 6 meses de calendário, não 180 dias fixos.
- Para a regra de renovação, usar 30 dias corridos.

Como classificar:
- Ordenar todos os eventos válidos de cada matrícula por data do evento.
- Para cada evento, localizar o evento de plano imediatamente anterior da mesma matrícula.
- Se não houver anterior: classificacao = matricula.
- Se houver anterior:
  - se dataAtual <= dataFimAnterior + 30 dias: classificacao = renovacao
  - se dataAtual > dataFimAnterior + 30 dias e dataAtual < dataFimAnterior + 6 meses: classificacao = rematricula
  - se dataAtual >= dataFimAnterior + 6 meses: classificacao = matricula

Escopo funcional:
- Criar um utilitário puro, por exemplo em src/utils/studentLifecycle.js, contendo:
  - normalizeMatricula
  - getDataEvento
  - getDataFimEfetiva
  - consolidarEventosDePlano
  - classificarHistoricoPorMatricula
  - calcularIndicesDeCiclo
- Criar um hook reutilizável, por exemplo src/hooks/useStudentLifecycle.js, que receba:
  - vendasOriginais
  - unidade atual
  - selectedMonth
  - responsaveisOficiais
  - produtosSelecionados
- O cálculo do tipo do evento deve usar o histórico global por matrícula.
- A contagem exibida na tela deve considerar apenas os eventos do contexto atual da página:
  - mês selecionado
  - unidade atual
  - filtros globais de produto já usados no projeto
  - consultores oficiais quando a página já usa esse filtro

Onde integrar:
- No Dashboard:
  - usar src/pages/Dashboard.jsx
  - preferencialmente exibir os 3 índices em cards novos ou em uma seção própria perto de MetricCards
- Deixar o cálculo reutilizável para o AnalyticsPage também
- Não quebrar as métricas atuais de faturamento, comissão, descontos e produtos

Saída esperada do cálculo:
- resumo:
  - matriculas
  - rematriculas
  - renovacoes
  - totalEventosClassificados
  - percentualMatriculas
  - percentualRematriculas
  - percentualRenovacoes
- eventosDetalhados:
  - matricula
  - nome
  - unidade
  - responsavel
  - dataEvento
  - dataFimAnterior
  - diasInativo
  - classificacao
  - motivoClassificacao

Casos de teste obrigatórios:
- Primeiro plano da matrícula = matrícula
- Plano iniciado 15 dias após o fim do anterior = renovação
- Plano iniciado 45 dias após o fim do anterior = rematrícula
- Plano iniciado 6 meses ou mais após o fim do anterior = matrícula
- Parcelamento do mesmo contrato no mesmo mês deve contar uma única vez
- Diária não pode ser contada como matrícula/renovação/rematrícula
- Registro sem matrícula não pode entrar no índice

Importante:
- Preserve toda a lógica atual de comissão e desconto.
- Não duplique fetch no Firestore se useVendas já entrega os dados necessários.
- Prefira funções puras e um hook reutilizável.
- Se houver dúvida entre usar venda agrupada e venda original, use venda original para classificar o ciclo e só agregue depois.
