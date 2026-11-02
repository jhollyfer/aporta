# Fluxos do usuário

**Aporta** · cada passo do primeiro acesso até concluir a tarefa

> Um fluxo por funcionalidade do `PRD.md` §4. Tela nova ou fluxo novo entra aqui no mesmo
> commit. O teste de ponta a ponta segue estes passos (`TEST-PLAN.md`).
>
> Estado em 2026-11-01: as telas públicas leem dados de exemplo de `frontend/src/lib/data`, e a
> API ainda não tem anúncios. Cada fluxo diz o que já funciona e o que depende da API.

## Jornadas principais

| Fluxo | Quem | Tela inicial | Resultado | Estado |
|---|---|---|---|---|
| [Procuro onde morar](#procuro-onde-morar) | calouro, servidor, trabalhador, viajante | `/` | visitante abre o WhatsApp do dono com a mensagem pronta | Pronto, com dados de exemplo |
| [Guia da cidade](#guia-da-cidade) | turista, calouro | `/guide` | visitante acha um lugar e, se houver, fala no WhatsApp dele | Pronto, com dados de exemplo |
| [Tenho um imóvel para anunciar](#tenho-um-imóvel-para-anunciar) | dono | `/list-your-place` | anúncio enviado para revisão | Formulário pronto; o envio não grava |
| [Trocar de idioma](#trocar-de-idioma) | qualquer visitante | qualquer tela pública | a mesma tela em pt-BR, es ou en | Pronto |
| [Moderação futura](#moderação-futura) | equipe | a definir | anúncio aprovado ou arquivado | Não existe |

---

## Procuro onde morar

**Entrada:** a home `/` (busca em pílula, categorias por tipo, destaques) ou um link de `/listings` mandado por WhatsApp.
**Pré-condição:** nenhuma; não há login para buscar.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre o site | mostra a proposta, a busca em pílula (tipo, bairro, período), a faixa de categorias por tipo e os imóveis em destaque | `/` |
| 2 | escolhe tipo, bairro e período na pílula e toca em buscar (ou toca numa categoria) | abre a listagem já com esses filtros na URL | `/listings?type=&neighborhood=&period=` |
| 3 | ajusta tipo, bairro, período e faixa de preço na barra de filtros | atualiza a lista e o contador "Mostrar N imóveis"; os chips mostram o que restringe e o botão "Limpar" zera tudo | `/listings` |
| 4 | no celular, toca no botão flutuante para ver o mapa | alterna para o mapa (`view=map`); cada imóvel é um pin com o preço | `/listings?view=map` |
| 5 | toca num pin | marca o pin (`selected` na URL) e mostra o resumo do imóvel | `/listings?view=map&selected=` |
| 6 | abre um imóvel | mostra galeria com abas por ambiente (fachada, quarto, banheiro, cozinha, sala), preço, o que está incluso (água, luz, internet), disponibilidade, estadia mínima, períodos, endereço, descrição, regras, e o cartão do dono com selo "dono verificado" e "atualizado há X dias" | `/listings/$slug` |
| 7 | toca em "Chamar no WhatsApp" | abre `wa.me` em outra aba com a mensagem que cita o imóvel e o bairro; no celular o botão fica fixo no rodapé | WhatsApp |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Filtros sem resultado | estado vazio com cena do rio, texto que orienta e botão "Limpar filtros" |
| Valor inválido na URL (`?type=castelo`, bairro que não existe) | o campo é ignorado e a página abre sem esse filtro, sem tela de erro |
| Imóvel com `slug` que não existe | página 404 própria da área pública, com caminho de volta para a home |
| Imóvel sem foto de um ambiente | a galeria desenha a cena SVG do ambiente (ainda não há fotos reais) |
| Hotel que anuncia só diária | o card e a página mostram a diária; para a faixa de preço a diária conta como 30 vezes o valor |
| Link do WhatsApp aberto em desktop sem o app | o `wa.me` abre o WhatsApp Web; a falha do app do visitante é fora do site |
| Falha de rede ao carregar o mapa | o mapa pode ficar sem ladrilhos; a lista e os filtros não dependem dele |

Depende da API: trocar `lib/data` por consulta ao servidor, com filtro em `loaderDeps` e na chave da consulta, estados de carregando e de erro por bloco.

---

## Guia da cidade

**Entrada:** faixa de guia da home, menu do cabeçalho ou link com `?category=`.
**Pré-condição:** nenhuma.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre o guia | mostra a aba Comer (primeira) com os lugares dessa categoria | `/guide?category=EAT` |
| 2 | troca de aba (Beber, Eventos, Serviços úteis) | muda a categoria na URL e a lista; em Eventos os itens saem ordenados por data, com dia e mês em destaque | `/guide?category=EVENT` |
| 3 | toca em "Falar no WhatsApp" de um lugar | abre `wa.me` em outra aba com a mensagem que cita o lugar | WhatsApp |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| `category` inválida na URL | cai na aba Comer |
| Lugar sem WhatsApp cadastrado | o cartão aparece sem o botão |
| Categoria sem lugares | Não se aplica hoje: as quatro categorias têm lugares de exemplo; com a API, a aba vazia precisa de estado vazio (tarefa em `TASKS.md`) |

---

## Tenho um imóvel para anunciar

**Entrada:** botão "Anunciar imóvel" do cabeçalho (a partir de telas médias), da home ou da faixa do dono.
**Ação:** preenche seis etapas e envia.
**Sucesso:** tela "Anúncio pronto" com o título e o aviso de que o envio ainda não está no ar; o rascunho continua salvo e há "Voltar ao cadastro" e o caminho para a home.
**Falha:** mantém o formulário preenchido e leva o dono à primeira etapa com erro.

Hoje o cadastro não envia nada: o último passo só valida o formulário inteiro (`TASKS.md` 7.15). Ainda não existe a entrada do dono (login) na tela nem a conta `OWNER` por cadastro; quando existirem, o fluxo ganha o passo de entrar antes da etapa 1.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre o cadastro | mostra o indicador de progresso (6 etapas) e restaura o rascunho salvo neste aparelho, se houver | `/list-your-place` |
| 2 | etapa Tipo: escolhe casa, apartamento, kitnet, quarto ou hotel e se é mobiliado | valida os dois campos ao tocar em continuar | etapa 1 |
| 3 | etapa Local: informa bairro e endereço | valida; bairro vem da lista de bairros da cidade | etapa 2 |
| 4 | etapa Valores: aluguel mensal, diária (opcional), o que está incluso (água, luz, internet), períodos aceitos e estadia mínima em meses | valida faixa e inteiros; mostra dicas de transparência de valores | etapa 3 |
| 5 | etapa Fotos: vê a orientação por ambiente (fachada, quarto, banheiro, cozinha, sala) e escolhe arquivos | mostra dicas de foto; hoje os campos de arquivo não enviam nada | etapa 4 |
| 6 | etapa Regras: título, descrição e regras da casa | valida tamanhos (título 8 a 80, descrição 20 a 600, regras até 600) | etapa 5 |
| 7 | etapa Contato: nome e WhatsApp com DDD, só números | o campo aceita só dígitos; valida de 10 a 13 | etapa 6 |
| 8 | toca em "Finalizar cadastro" | valida o formulário inteiro; no sucesso mostra "Anúncio pronto", avisa que o envio não está no ar e mantém o rascunho | tela de anúncio pronto |

O rascunho é gravado no aparelho 400 ms depois da última tecla, na chave `aporta:listing-draft:v1`.

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Campo inválido ao continuar | mensagem no campo e a etapa não avança |
| Etapa anterior ficou inválida (o dono voltou e apagou um campo) | ao finalizar, a tela volta para a primeira etapa com erro |
| Dono sai no meio | o rascunho volta ao reabrir a página, no mesmo aparelho e navegador |
| Armazenamento do navegador bloqueado (janela privada) | o formulário funciona sem rascunho |
| Rascunho de formato antigo ou corrompido | cada campo inválido volta ao valor vazio; os demais são mantidos |
| Falha de rede no envio | Não se aplica hoje (não há envio); com a API, manter o formulário e oferecer "Tentar de novo" |
| Dono sem sessão ou sem papel `OWNER` (403) | Não se aplica hoje; com a API, levar à entrada e depois de volta ao formulário |

---

## Trocar de idioma

**Entrada:** seletor de idioma do cabeçalho.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | escolhe es ou en | abre a mesma tela com prefixo `/es` ou `/en`; o português é o idioma base e fica sem prefixo | qualquer tela pública |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Link antigo sem prefixo | abre em português |
| Texto do anúncio ou do guia (dado, não interface) | hoje está só em português nos dados de exemplo; tradução de conteúdo de dono é pergunta em aberto (`MEMORY.md`) |

---

## Moderação futura

Ainda não existe tela nem API. O fluxo abaixo é a intenção, e muda conforme a resposta às perguntas do `PRD.md` §8 (quem verifica o dono, moderação antes ou depois de publicar).

**Entrada:** a equipe (papéis `ADMINISTRATOR` e `MODERATOR`) entra no painel.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre a fila de anúncios novos e alterados | lista por data, com o dono e o selo de verificação | a definir |
| 2 | confere fotos, valores e sinais de golpe | mostra o anúncio como o visitante verá | a definir |
| 3 | aprova, pede ajuste ou arquiva | muda o estado do anúncio e registra quem decidiu | a definir |
| 4 | marca o dono como verificado | o selo passa a aparecer no cartão do dono | a definir |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Moderador tenta apagar de vez | recusado: só o `ADMINISTRATOR` apaga definitivamente (`RULES.md` §3) |
| Dono tenta ver anúncio de outro dono | 404, igual ao anúncio que não existe |

---

## Checklist de todo fluxo

- [ ] Entrada clara (de onde o usuário chega).
- [ ] Toda ação tem retorno: carregando, sucesso, erro.
- [ ] Dá para voltar ao passo anterior.
- [ ] Estados vazio e de erro desenhados.
- [ ] Sucesso visível (mensagem ou mudança na tela).
- [ ] Funciona no celular.
- [ ] O botão de contato continua no WhatsApp, sem chat interno.
- [ ] O texto aparece nos três idiomas.
