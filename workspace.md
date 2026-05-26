
O DashFlex tem um módulo "Ciclo do Aluno" (`src/pages/CicloAluno.jsx`) que classifica vendas/planos em: **matrícula** (primeiro plano ou retorno após 6+ meses), **rematrícula** (retorno entre 31 dias e 6 meses) e **renovação** (continuidade ou retorno em até 30 dias).

A lógica está em `src/utils/studentLifecycle.js` (função `calcularIndicesDeCiclo`), que recebe vendas do Firebase via `src/hooks/useVendas.js` (collectionGroup "vendas" no Firestore).

**Problema:** se o Firebase não tem contratos antigos (ex: de 2023), um aluno que volta é classificado como "matrícula" ao invés de "rematrícula", pois o sistema não encontra o contrato anterior.

**Solução:** integrar a API do Sistema PACTO (sistema de gestão da academia) para buscar o histórico completo de contratos de cada aluno.

## API da PACTO — Endpoints Relevantes

**Base URL:** `https://apigw.pactosolucoes.com.br`  
**Auth:** `Authorization: Bearer {CHAVE_API}` (chave gerada no admin da Pacto > Configurações > Integrações > ADM > API Sistema Pacto)  
**Permissão necessária:** `adm:cadastros:clientes:consultar`

### Endpoint Principal: Contratos de uma Pessoa

```
GET /pessoas/{codPessoa}/contratos
```

**Parâmetros:**
- `codPessoa` (path, required, int32) — Código da pessoa
- `page` (query, int32) — Página (default: 0)
- `size` (query, int32) — Itens por página (default: 10)
- `sort` (query, string) — Ordenação. Atributos: `vigenciaAteAjustada`, `codigo`, `situacaoContrato`, `responsavelContrato`, `vigenciaDe`, `situacao`. Formato: `atributo,asc` ou `atributo,desc`

**Response 200 (campos relevantes):**
```json
{
  "content": [
    {
      "codigo": 3,
      "tipo": "MENSAL",
      "vigenciaDe": "2019-04-18T00:00:00Z",
      "vigenciaAte": "2020-04-18T00:00:00Z",
      "vigenciaAteAjustada": "2020-05-18T00:00:00Z",
      "situacao": "ATIVO",
      "pessoa": 12345,
      "pessoaDTO": {
        "codigo": 12345,
        "codCliente": 67890,
        "nome": "João Silva",
        "cpf": "123.456.789-00",
        "categoria": "ALUNO",
        "situacao": "ATIVO",
        "situacaoContrato": "VIGENTE",
        "matriculaCliente": "2024001"
      }
    }
  ],
  "last": false,
  "totalPages": 5,
  "totalElements": 47
}
```

### Endpoint Complementar: Índice de Renovação

```
POST /v2-indice-renovacao
```

**Body:**
```json
{
  "empresa": 1,
  "colaboradores": [0],
  "dataInicial": 1704067200000,
  "dataFinal": 1706745599000,
  "retornarContratos": false,
  "desconsiderarContratosRenovaveis": false,
  "token": "<string>"
}
```

**Response (campos relevantes):**
```json
{
  "content": {
    "nome": "INDICE_RENOVACAO",
    "jsonDados": {
      "previsaoMes": 85,
      "renovadosPrevisaoMes": 68,
      "naoRenovadosPrevisaoMes": 17,
      "renovadosDentroMes": 72,
      "renovadosTotal": 92,
      "contratosPrevisaoMes": [
        {
          "nomeCliente": "João Silva Santos",
          "situacaoCliente": "AT",
          "matriculaCliente": "2024001",
          "codigoCliente": 1001,
          "codigoContrato": 5001,
          "colaboradores": "João Silva, Maria Santos"
        }
      ]
    }
  }
}
```

## Mapeamento de Campos PACTO → DashFlex

| DashFlex (studentLifecycle) | PACTO API | Notas |
|---|---|---|
| `matricula` | `pessoaDTO.matriculaCliente` | Normalizar para só dígitos |
| `nome` | `pessoaDTO.nome` | Direto |
| `dataInicio` | `vigenciaDe` | ISO 8601 → dayjs |
| `dataFim` | `vigenciaAteAjustada` (fallback `vigenciaAte`) | Priorizar ajustada |
| `produto` / `plano` | `tipo` | MENSAL, TRIMESTRAL, etc. |
| `numeroContrato` | `codigo` | Chave de deduplicação |
| `valor` | N/A neste endpoint | Vem apenas das vendas locais |
| `responsavel` | N/A neste endpoint | Vem apenas das vendas locais |

## O que implementar

### 1. Cloud Function: proxy para PACTO API (proteger chave)

Criar `functions/pactoProxy.js` — A Cloud Function recebe uma lista de `codPessoa` (ou matriculas) do frontend, consulta a PACTO API paginando automaticamente, e retorna todos os contratos. A chave API fica em `functions.config().pacto.api_key`. Registrar como rota no `functions/index.js` existente (que já usa Express). Instalar `axios` nas dependencies do `functions/package.json`.

### 2. Service frontend: `src/services/pactoApi.js`

Função que chama a Cloud Function e normaliza cada contrato PACTO para o formato que `consolidarEventosDePlano()` em `studentLifecycle.js` espera (mesmos campos que uma venda do Firebase).

### 3. Hook: `src/hooks/usePactoContratos.js`

Hook React que recebe as matrículas das vendas locais, chama o service, faz cache em memória, e retorna os contratos normalizados. Deve ter um estado `enabled` (toggle) para poder desabilitar a integração.

### 4. Modificar `src/utils/studentLifecycle.js`

Na função `calcularIndicesDeCiclo`, aceitar um novo parâmetro `contratosPacto = []`. Antes da classificação:
- Consolidar vendas locais normalmente
- Consolidar contratos PACTO  
- Mesclar os dois, **priorizando dados locais** quando houver mesmo `numeroContrato`
- Classificar pelo histórico completo mesclado

A lógica de merge é: criar Set dos `numeroContrato` dos eventos locais, filtrar os PACTO que não estão nesse Set, concatenar.

### 5. Modificar `src/hooks/useStudentLifecycle.js`

Aceitar `contratosPacto` como parâmetro e passá-lo ao `calcularIndicesDeCiclo`.

### 6. Modificar `src/pages/CicloAluno.jsx`

Chamar `usePactoContratos` e passar o resultado ao `useStudentLifecycle`. Adicionar um indicador visual (badge/pill) mostrando se os dados PACTO estão ativos ou não.

## Considerações importantes

- **codPessoa vs matrícula:** o endpoint `/pessoas/{codPessoa}/contratos` usa o código interno da PACTO, não a matrícula. Pode ser necessário primeiro buscar o codPessoa via endpoint de Clientes ou manter mapeamento no Firestore. Avalie a melhor abordagem.
- **Cache:** implementar cache dos contratos PACTO no Firestore (TTL ~24h) para não bater na API a cada page load. 
- **Fallback:** se a PACTO estiver fora, o sistema funciona normalmente só com dados locais.
- **Rate limiting:** não fazer chamadas em paralelo excessivas. Implementar batch com concorrência limitada (ex: 5 simultâneas).
- **A Cloud Function existente** (`functions/index.js`) já usa Express com CORS e faz upload XLS para a mesma URL base (`https://southamerica-east1-chatpos-aff1a.cloudfunctions.net`). Seguir o mesmo padrão.