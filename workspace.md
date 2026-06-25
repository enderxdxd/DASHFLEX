Claro. Aqui está a documentação completa, já pensando em **Firebase + Pacto + RD Station**:

[Documento da integração Pacto → RD Station via Firebase]

## 1. Objetivo

Criar uma integração automática para buscar dados de alunos/clientes na **API da Pacto** e enviar esses dados para o **RD Station Marketing**, criando ou atualizando leads.

Fluxo:

```txt
Pacto API → Firebase Cloud Functions → RD Station API
```

## 2. Componentes necessários

Você precisa criar:

```txt
1. Projeto no Firebase
2. Cloud Function para sincronização
3. Firestore para logs e controle
4. Secret Manager para tokens
5. Integração/app no RD Station
6. Acesso à API da Pacto
```

## 3. API da Pacto

Você precisa solicitar/confirmar com a Pacto:

```txt
- URL base da API
- Token ou ApiKey
- Endpoint correto dos alunos/CRM
- Campos retornados pela API
- Paginação
- Filtros por data, unidade ou status
```

A documentação pública da Pacto indica uso de **ApiKey** para autenticação, mas os endpoints específicos podem depender do acesso da sua conta. ([Pacto API][1])

## 4. API do RD Station

Para enviar dados ao RD, use o endpoint de conversão:

```http
POST https://api.rd.services/platform/events?event_type=conversion
```

Esse evento pode criar ou atualizar contatos na Base de Leads do RD Station. ([RD Station Developers][2])

Também existe o endpoint antigo/alternativo via API Key:

```http
POST https://api.rd.services/platform/conversions?api_key=SUA_API_KEY
```

Mas o mais recomendado é usar OAuth/Bearer Token. ([RD Station Developers][3])

## 5. Campos personalizados no RD

Criar no RD Station campos como:

```txt
cf_plano
cf_unidade
cf_status_aluno
cf_fase_crm
cf_canal
cf_resultado
cf_data_sync
```

## 6. Estrutura no Firestore

Coleções sugeridas:

```txt
integrations/config
sync_logs/{id}
sync_state/pacto_rd
errors/{id}
```

Exemplo de `sync_state/pacto_rd`:

```json
{
  "lastSyncDate": "2026-06-21",
  "lastRunAt": "2026-06-21T10:00:00Z",
  "status": "success"
}
```

## 7. Payload enviado para o RD

```json
{
  "event_type": "CONVERSION",
  "event_family": "CDP",
  "payload": {
    "conversion_identifier": "Sync Pacto",
    "email": "cliente@email.com",
    "name": "Nome do Cliente",
    "mobile_phone": "62999999999",
    "tags": ["pacto", "aluno-ativo"],
    "cf_plano": "Premium",
    "cf_unidade": "Centro",
    "cf_status_aluno": "Ativo",
    "cf_data_sync": "2026-06-21"
  }
}
```

## 8. Regra da sincronização

A função deve:

```txt
1. Buscar dados na API da Pacto.
2. Percorrer as páginas de resultado.
3. Ignorar contatos sem e-mail.
4. Converter os campos da Pacto para campos do RD.
5. Enviar cada contato para o RD Station.
6. Salvar sucesso ou erro no Firestore.
7. Atualizar a data da última sincronização.
```

## 9. Cloud Function principal

```js
import { onRequest } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import admin from "firebase-admin";

admin.initializeApp();

const db = getFirestore();

export const syncPactoToRD = onRequest(async (req, res) => {
  try {
    const PACTO_TOKEN = process.env.PACTO_TOKEN;
    const RD_ACCESS_TOKEN = process.env.RD_ACCESS_TOKEN;

    const DATA_ALVO = req.query.date || new Date().toISOString().slice(0, 10);

    let pagina = 0;
    let totalPaginas = 1;
    let enviados = 0;
    let ignorados = 0;
    let erros = 0;

    while (pagina < totalPaginas) {
      const filtros = {
        empresas: [1],
        dataInicioMeta: DATA_ALVO,
        dataTerminoMeta: DATA_ALVO
      };

      const url =
        `https://apigw.pactosolucoes.com.br/historico-contato` +
        `?filters=${encodeURIComponent(JSON.stringify(filtros))}` +
        `&page=${pagina}&size=50`;

      const pactoRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${PACTO_TOKEN}`
        }
      });

      const pactoJson = await pactoRes.json();

      totalPaginas = pactoJson.totalPages || 1;

      for (const contato of pactoJson.content || []) {
        if (!contato.emailAluno) {
          ignorados++;
          continue;
        }

        const rdPayload = {
          event_type: "CONVERSION",
          event_family: "CDP",
          payload: {
            conversion_identifier: "Sync Pacto",
            email: contato.emailAluno,
            name: contato.nomeAluno,
            mobile_phone: contato.telefone,
            tags: ["pacto", `fase-${contato.fase}`],
            cf_fase_crm: contato.fase || "",
            cf_canal: contato.tipoContato || "",
            cf_resultado: contato.resultado || "",
            cf_data_sync: DATA_ALVO
          }
        };

        const rdRes = await fetch(
          "https://api.rd.services/platform/events?event_type=conversion",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RD_ACCESS_TOKEN}`
            },
            body: JSON.stringify(rdPayload)
          }
        );

        if (!rdRes.ok) {
          erros++;

          await db.collection("errors").add({
            source: "rd_station",
            contato,
            status: rdRes.status,
            response: await rdRes.text(),
            createdAt: new Date()
          });

          continue;
        }

        enviados++;
      }

      pagina++;
    }

    await db.collection("sync_logs").add({
      integration: "pacto_rd",
      date: DATA_ALVO,
      enviados,
      ignorados,
      erros,
      createdAt: new Date()
    });

    await db.collection("sync_state").doc("pacto_rd").set({
      lastSyncDate: DATA_ALVO,
      lastRunAt: new Date(),
      status: erros > 0 ? "partial_success" : "success"
    });

    res.json({
      success: true,
      enviados,
      ignorados,
      erros
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

## 10. Agendamento automático

Usar **Cloud Scheduler** para chamar a função todos os dias.

Exemplo:

```txt
Todo dia às 08:00
```

A URL chamada seria algo como:

```txt
https://sua-cloud-function-url/syncPactoToRD
```

## 11. Segurança

Não deixar tokens no código.

Guardar em:

```txt
Firebase Secret Manager
```

Variáveis necessárias:

```txt
PACTO_TOKEN
RD_ACCESS_TOKEN
RD_REFRESH_TOKEN
RD_CLIENT_ID
RD_CLIENT_SECRET
```

## 12. Refresh token do RD

O `access_token` do RD pode expirar. Por isso, o ideal é salvar também o `refresh_token` e criar uma função para renovar o token antes de enviar os dados.

## 13. O que você NÃO precisa usar

Você não precisa configurar webhook no RD para essa integração.

Webhook do RD é para:

```txt
RD Station → outro sistema
```

Seu caso é:

```txt
Pacto → Firebase → RD Station
```

## 14. Checklist final

```txt
[ ] Ter acesso à API da Pacto
[ ] Confirmar endpoint correto da Pacto
[ ] Criar app no RD Station
[ ] Obter access_token e refresh_token do RD
[ ] Criar campos personalizados no RD
[ ] Criar projeto Firebase
[ ] Criar Cloud Function
[ ] Salvar tokens no Secret Manager
[ ] Criar logs no Firestore
[ ] Testar com 1 aluno
[ ] Testar com uma data específica
[ ] Ativar agendamento diário
```

Essa é a base completa da integração.

[1]: https://api-docs.pactosolucoes.com.br/?utm_source=chatgpt.com "PACTO API"
[2]: https://developers.rdstation.com/reference/evento-de-conversao-padrao?utm_source=chatgpt.com "Evento de conversão padrão"
[3]: https://developers.rdstation.com/reference/conversao?utm_source=chatgpt.com "Conversão via API Key"
