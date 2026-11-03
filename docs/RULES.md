# Regras de desenvolvimento

**Aporta** · valem para quem escreve código aqui, pessoa ou agente

> As regras da casa (TypeScript sem `any`/`as`/`!`, SOLID, `Either`, validators, commits) estão em
> `_standards/` e valem integralmente. Este arquivo só **acrescenta** o que é deste projeto.
> Regra que serviria para qualquer projeto vai para `_standards/`, não aqui.

## 1. Antes de mudar

- Ler `docs/MEMORY.md` e a linha da tarefa em `docs/TASKS.md`.
- Mudança pequena, um assunto por commit; todo ajuste vem com teste.
- Procurar o que já existe antes de criar (`_standards/architecture.md` §1, item 10): o kit
  `frontend/src/components/common/` e `shared/` já têm o que as duas telas e a API compartilham.
- Ler `docs/DECISIONS.md` antes de uma escolha difícil de desfazer.

## 2. O agente não mexe sem perguntar

- Migration que já rodou em produção (cria uma nova).
- Dependência nova, ou troca de versão major.
- Teste que está falhando: investiga, não apaga nem pula.
- `docs/PRD.md` (escopo).
- Variável de ambiente de produção, segredo, configuração de deploy (`.github/workflows/`,
  `Dockerfile-production`, valores de `COOLIFY_*`).
- O grupo `/storages` em `backend/start/routes.ts`: abrir para o papel `OWNER` antes de existir a
  policy de posse por dono deixa um dono listar, concluir ou apagar arquivo de outro.
- Os papéis em `shared/src/enums/user-role.ts` e a lista `STAFF_USER_ROLES`: papel novo nasce fora
  da lista de equipe de propósito.
- Os telefones de exemplo (prefixo `5597999990`) e as coordenadas dos bairros em
  `backend/database/data/` (lidos pelos seeders; o frontend não guarda cópia): trocar por número ou ponto real sem conferência manda visitante a uma
  pessoa de verdade ou a um pin fora do lugar.
- `backend/infra/r2-cors.json` e qualquer política de CORS do bucket.
- O texto do selo "dono verificado" e a regra de quem o recebe: é promessa de confiança do produto
  (`PRD.md` §8 tem a pergunta aberta).
- O texto e a chave `whatsapp_message` das mensagens: o dono recebe esse texto em toda conversa.

## 3. Regras deste projeto

| Tema | Regra | Por quê |
|---|---|---|
| Contato | O contato com o dono é só pelo WhatsApp (`wa.me`), e o botão principal é "Chamar no WhatsApp". Não existe chat interno | a cidade já está no WhatsApp e o dono responde de onde estiver (`DECISIONS.md` #7) |
| Número de WhatsApp | Guardado só com dígitos, com DDD e código do país (ex.: `5597...`); o link remove qualquer outro caractere. O cadastro aceita de 10 a 13 dígitos | `wa.me` recusa `+`, espaço e parêntese, e o link quebrado só aparece quando alguém toca |
| Link externo | Todo link que abre WhatsApp ou outro site usa `target="_blank"` com `rel="noopener noreferrer"` | a página do Aporta não fica referenciada pelo destino |
| Valor | Em reais inteiros, sem centavos. Aluguel mensal de 1 a 100.000, diária de 1 a 10.000. O preço mostrado é o total do aluguel; água, luz e internet inclusos vêm à parte | erro de zero a mais é o defeito comum em campo de aluguel, e o visitante precisa saber o que está incluso antes de abrir o anúncio |
| Hotel e faixa de preço | Hotel anuncia diária; só para filtrar e ordenar a diária vale 30 vezes. O card mostra o valor na unidade em que o dono anunciou | sem converter, todo hotel pareceria o imóvel mais barato |
| Período | Os períodos seguem o calendário da UFAM: semestre, ano letivo, mensal e diária | é como quem chega planeja a estadia |
| Bairro | Bairro é o filtro principal e o mapa é apoio. Os seis bairros atuais e suas coordenadas são aproximados | nem todo endereço da cidade tem ponto preciso, e quem procura pergunta "perto da UFAM?", não "a quantos metros?" |
| Fotos | Uma foto por ambiente (fachada, quarto, banheiro, cozinha, sala). Sem foto real, a tela mostra um quadro neutro com "Foto em breve" (`url: null` no registro). Ilustração de imóvel e foto gerada por IA não entram | anúncio que mostra só uma cama ou um canto é sinal de golpe; a foto de verdade vem do dono |
| Frescor | O anúncio mostra "atualizado há X dias" a partir da data de atualização e nunca um número negativo | anúncio parado é imóvel já alugado ou golpe, os dois defeitos dos grupos de WhatsApp |
| Estado na URL | Filtros, aba do guia e vista lista/mapa vivem na URL e são validados com `.catch`; valor inválido vira "sem filtro" | o link mandado por WhatsApp abre igual, e o F5 não perde a busca |
| Idiomas | pt-BR é a base e não leva prefixo na URL; es e en têm prefixo. Todo texto de interface existe nos três idiomas; rótulo de valor fechado é função em `frontend/src/lib/labels.ts` | quem chega pela fronteira lê es e en, e uma string resolvida no carregamento congelaria o idioma da primeira requisição |
| Papéis | `ADMINISTRATOR` nasce só do seeder e é o único que apaga de vez; `MODERATOR` revisa e arquiva, sem apagar de vez nem gerir contas; `OWNER` gere só o que é dele e não opera o painel | limita o dano de uma conta de moderação ou de dono tomada |
| Escopo do dono | Recurso de outro dono responde 404, igual ao inexistente; o escopo vem da sessão, nunca de id enviado pelo cliente | não confirma a quem sonda que o id existe |
| Rascunho do cadastro | Fica só no navegador, na chave `aporta:listing-draft:v1`; mudar a forma do rascunho é trocar a versão da chave. O validator do rascunho é frouxo de propósito | rascunho meio digitado falharia o validator real e seria descartado inteiro |
| Validator do cadastro | O formulário e a API validam com o mesmo `OwnerListingCreateValidator` (par VineJS no backend, conferido por `validators:check`) | a tela não pode aceitar o que a API recusa |
| Pin do mapa | O texto do pin é só o preço formatado; nada digitado por dono ou visitante entra no HTML do pin | o pin é HTML puro, fora do React, e texto de usuário ali vira injeção |
| Dados de exemplo | Telefone de exemplo usa o prefixo `5597999990`; dado de exemplo nunca se apresenta como real | o exemplo não pode mandar ninguém a um número verdadeiro |
| Fuso | O backend roda em `TZ=UTC`; datas de dados são `AAAA-MM-DD` e a conversão para quem lê é da tela | a mesma consulta daria datas diferentes conforme o fuso da máquina |
| Arquivos gerados | `backend/openapi.json` e `frontend/src/routeTree.gen.ts` são commitados e o CI reprova se estiverem desatualizados; `frontend/src/paraglide/` não é commitado | o documento da API e a árvore de rotas são contrato lido por outras ferramentas |
| Portas locais | Postgres 5435, MinIO 9006 e 9007, app 3000, API 3333; as portas padrão ficam livres | outros projetos da casa usam 5432 a 5434 e 9000 a 9005 na mesma máquina |

## 4. Estrutura

Tela em `frontend/`, regra em `backend/` (entidade em `app/domain/`, operação em
`app/features/` em módulo, recurso e ação), contrato de endpoint, validator e enum em `shared/`;
nada solto na raiz. A árvore é a de `_standards/architecture.md` §3, §4 e §9. O que diverge dela é
desvio e se corrige; regra que não serve muda no `maiyu-pattern` (`documentation.md`, "Quem manda em quê").

## 5. Definição de pronto

- [ ] Lint, typecheck, `pattern:check` e testes rodados no `HEAD` atual, com o resultado à mão
      (critério completo em `TEST-PLAN.md` §6).
- [ ] Teste novo cobre o comportamento e entra na matriz de `TEST-PLAN.md` §3.
- [ ] Estados de carregando, vazio, erro e sucesso tratados na tela (`DESIGN.md` §8, `USER-FLOWS.md`).
- [ ] Texto visível por chave i18n nos três idiomas (`_standards/i18n.md`).
- [ ] `docs/` atualizado no mesmo commit (`_standards/documentation.md` §5).
- [ ] Sem segredo, `console.log`, código comentado ou `TODO` sem dono no diff.

## Histórico

| Data | Mudança |
|---|---|
| 2026-11-01 | Primeira versão |
