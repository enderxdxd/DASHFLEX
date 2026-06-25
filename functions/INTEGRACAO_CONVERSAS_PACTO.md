# Integração RD Station Conversas → Pacto (Simples Registro)

Documento de referência para a sincronização que pega as conversas do **RD Station
Conversas** (cliente + bot + operador) e grava como **Simples Registro** dentro das
metas diárias do Pacto. Espelha o padrão de `pactoRdSync.js` (firebase-functions v1,
axios, Firestore), sem alterar nenhum fluxo existente.

Direção: `RD Conversas → Cloud Function → Pacto (meta-crm/simples-registro)`
(o inverso do `pactoRdSync.js`, que faz Pacto → RD Marketing).

---

## 1. Lado RD Station Conversas (LER as conversas)

- Base URL: `https://api.tallos.com.br`
- Auth: `Authorization: Bearer <JWT>` (gerado em **Apps e Integrações → API**)
- Plano necessário: **Advanced** (histórico) + **criptografia** (chaves RSA geradas no painel)

### 1.1 Achar o contato pelo telefone
`GET /v2/contacts/{cel_phone}/exists?channel=whatsapp`
- `cel_phone` em E.164: `5562984327894` (CC+DDD+numero, só dígitos)
- Resposta `data`: `{ _id, full_name, cpf, email, cel_phone, tags, last_message_data{channel,content,created_at,type}, ... }`
- `_id` = **customer_id** usado no histórico.

### 1.2 Buscar o histórico da conversa
`GET /v2/messages/history`
- Query: `customer_id` (obrigatório), `channel` (default whatsapp),
  `sent_by` = `customer,operator,bot`, `start_date`, `end_date`,
  `limit` (máx 100), `page` (offset, começa em 1).
- Resposta: `{ "messages": "<STRING CRIPTOGRAFADA>" }`.

### 1.3 Descriptografar
- Pacote: `node-jose`. As chaves (pública/privada JWK) são geradas no painel do
  Conversas (Apps e Integrações → API → Gerar Chave).
- `messages` é um JWE compacto → `jose.JWE.createDecrypt(key).decrypt(jwe)` →
  `JSON.parse(plaintext)` → array de mensagens `{ sent_by, type, content, created_at }`.

---

## 2. Lado Pacto (GRAVAR o registro) — backend `zw-boot`

> ⚠️ O CRM (tela Meta Diária) NÃO usa o `apigw`. Ele usa o backend
> `https://zw801.pactosolucoes.com.br/zw-boot/...`.
> Auth observada: header `Authorization: Bearer <token>` + header `empresaId`.
> A definir: usar a API key do apigw (estável, server-side) vs. token zw-boot.

Datas em **epoch ms** (meia-noite local). Ex.: 19/06/2026 = `1781852400000`.

### 2.1 Listar metas do dia (pega os codigosFecharMeta + fase)
`GET /zw-boot/meta-crm?dataInicio={ms}&dataFim={ms}&colaboradores={cod},{cod}...`
- Resposta `content[]` (por fase): `{ descricaoFase, descricaoFaseResumida,
  tiposMeta[]{ codigosFecharMeta[], faseEnum, labelMeta, ... } }`

### 2.2 Listar os contatos/alunos (pega codigoFecharMetaDetalhado + telefone)
`GET /zw-boot/meta-crm/detalhada?codigosFecharMeta={a}&codigosFecharMeta={b}...&offset=0&limit=N`
- Resposta `content[]`:
  `{ codigo, codigoCliente, telefone, faseMeta, matricula, nome, nomeColaborador,
     dataMeta, dataNasc, idade, situacao, situacaoContrato, situacaoMeta, repescagem }`
- **`codigo`** = `codigoFecharMetaDetalhado` (a chave do registro).
- **`telefone`** = usado para casar com o RD Conversas.
- **`faseMeta`** = vai no campo `fase` do registro.

### 2.3 Gravar o Simples Registro  ← endpoint capturado ao vivo
`POST /zw-boot/meta-crm/simples-registro`
```json
{
  "codigoFecharMetaDetalhado": 3952443,
  "observacao": "<resumo + transcrição da conversa>",
  "fase": "HO",
  "tipoContato": "TE"
}
```
- `tipoContato: "TE"` = Contato Telefônico (NÃO dispara mensagem ao cliente).
- Resposta: 200 + toast "Simples Registro gravado!". Incrementa o contador de Ligações.

---

## 3. Fluxo da sincronização (lote diário, junto da sync das 08:00)

1. Para cada empresa (1=Buena Vista, 2=Alphaville, 3=Marista, 4=Palmas) e a data alvo:
2. Listar metas → coletar todos os `codigosFecharMeta` (+ faseEnum).
3. `detalhada` → lista de contatos com `codigo`, `telefone`, `faseMeta`.
4. Normalizar telefone → E.164 → `RD /v2/contacts/{tel}/exists` → `customer_id`.
   - Sem contato no Conversas → pula (conta "semConversa").
5. `RD /v2/messages/history` → descriptografar → mensagens do dia (ou desde o último sync).
   - Sem mensagens novas → pula.
6. Montar `observacao`: **resumo** (gerado por IA/heurística) + **transcrição** completa
   (`[hora] Cliente/Bot/Operador: texto`).
7. `POST meta-crm/simples-registro` com `{codigoFecharMetaDetalhado: codigo, observacao,
   fase: faseMeta, tipoContato: "TE"}`.
8. Dedup no Firestore: `conversas_rd_sync/{codigo}` guarda o hash/última msg processada
   para não gravar a mesma conversa 2x. Logs em `sync_logs` (integration: "conversas_rd").

## 4. Configuração (firebase functions:config:set)
```
rdconversas.jwt="<token JWT do Conversas>"
rdconversas.jwk_private="<chave privada JWK em JSON>"
# Pacto write:
pacto.api_key="..."         (já existe; se apigw aceitar a escrita)
# ou, se for via zw-boot:
pactozw.base_url="https://zw801.pactosolucoes.com.br/zw-boot"
pactozw.token="..."         (credencial estável / API)
integration.conversas_rd_enabled="true"   (trava do agendamento)
```

## 5. Pendência única antes de codar a escrita
Confirmar a autenticação server-side da escrita:
- (A) **apigw + API key** já existente (preferido p/ job agendado) — depende de o apigw
  expor `meta-crm/simples-registro` e o `detalhada` retornar `codigo`.
- (B) **zw-boot + credencial de API estável** (a "Credenciais de API" do Pacto).

> Registro de teste criado em 19/06/2026, aluno Alessandra Corrente (Mat. 051114),
> observação "TESTE - integracao RD Conversas (Claude). Pode apagar." — pode excluir.
