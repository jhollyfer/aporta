# Fluxos do usuário

**Aporta** · cada passo do primeiro acesso até concluir a tarefa

> Um fluxo por funcionalidade do `PRD.md` §4. Tela nova ou fluxo novo entra aqui no mesmo
> commit. O teste de ponta a ponta segue estes passos (`TEST-PLAN.md`).
>
> Estado em 2026-11-02: as telas públicas leem a API pública (`/storefront`), que hoje serve o
> catálogo de exemplo semeado no banco. Cada fluxo diz o que já funciona e o que ainda falta.

## Jornadas principais

| Fluxo | Quem | Tela inicial | Resultado | Estado |
|---|---|---|---|---|
| [Procuro onde morar](#procuro-onde-morar) | calouro, servidor, trabalhador, viajante | `/` | visitante abre o WhatsApp do dono com a mensagem pronta | Pronto, lendo a API com catálogo de exemplo |
| [Guia da cidade](#guia-da-cidade) | turista, calouro | `/guide` | visitante acha um lugar e, se houver, fala no WhatsApp dele | Pronto, lendo a API com catálogo de exemplo |
| [Tenho um imóvel para anunciar](#tenho-um-imóvel-para-anunciar) | dono | `/list-your-place` | anúncio enviado para revisão | Formulário pronto; o envio não grava |
| [Trocar de idioma](#trocar-de-idioma) | qualquer visitante | qualquer tela pública | a mesma tela em pt-BR, es ou en | Pronto |
| [Moderação futura](#moderação-futura) | equipe | a definir | anúncio aprovado ou arquivado | Não existe |

---

## Procuro onde morar

**Entrada:** a home `/` (busca em pílula, categorias por tipo, destaques) ou um link de `/listings` mandado por WhatsApp.
**Pré-condição:** nenhuma; não há login para buscar.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre o site | mostra a proposta, a busca em pílula (tipo, bairro, período), a faixa de categorias por tipo e os 6 imóveis atualizados há menos tempo; sem nenhum anúncio publicado, a seção "Disponíveis agora" some | `/` |
| 2 | escolhe tipo, bairro e período na pílula e toca em buscar (ou toca numa categoria) | abre a listagem já com esses filtros na URL | `/listings?type=&neighborhood=&period=` |
| 3 | ajusta tipo, bairro, período e faixa de preço na barra de filtros | atualiza a lista e o contador "Mostrar N imóveis"; os chips mostram o que restringe e o botão "Limpar" zera tudo | `/listings` |
| 4 | no celular, toca no botão flutuante para ver o mapa | alterna para o mapa (`view=map`); cada imóvel é um pin com o preço | `/listings?view=map` |
| 5 | toca num pin | marca o pin (`selected` na URL) e mostra o resumo do imóvel | `/listings?view=map&selected=` |
| 6 | abre um imóvel | mostra galeria com abas por ambiente (fachada, quarto, banheiro, cozinha, sala), preço, o que está incluso (água, luz, internet), disponibilidade, estadia mínima, períodos, endereço, descrição, regras, e o cartão do dono com selo "dono verificado" e "atualizado há X dias" | `/listings/$slug` |
| 7 | toca em "Chamar no WhatsApp" | abre `wa.me` em outra aba com a mensagem que cita o imóvel e o bairro; no celular o botão fica fixo no rodapé | WhatsApp |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Filtros sem resultado | estado vazio com cena do rio, texto que orienta e botão "Limpar filtros"; vale também para um bairro de endereço que a API não conhece, que volta lista vazia |
| API fora do ar ou lenta demais (15 s) | tela "Algo deu errado" com "Tentar de novo" e "Voltar ao início"; o botão refaz o carregamento. No navegador a API é tentada de novo até 2 vezes antes do erro, e no servidor não |
| Valor inválido na URL (`?type=castelo`, bairro que não existe) | o campo é ignorado e a página abre sem esse filtro, sem tela de erro |
| Imóvel com `slug` que não existe | página 404 própria da área pública, com caminho de volta para a home; só o erro `LISTING_NOT_FOUND` da API vira 404, e API fora do ar é a tela de erro |
| Imóvel sem foto de um ambiente | a galeria desenha a cena SVG do ambiente (ainda não há fotos reais) |
| Hotel que anuncia só diária | o card e a página mostram a diária; para a faixa de preço a API conta a diária como 30 vezes o valor |
| Link do WhatsApp aberto em desktop sem o app | o `wa.me` abre o WhatsApp Web; a falha do app do visitante é fora do site |
| Falha de rede ao carregar o mapa | o mapa pode ficar sem ladrilhos; a lista e os filtros não dependem dele |

A lista e o mapa mostram até 100 anúncios de uma vez; acima disso falta paginação (`TASKS.md` 3.9). A foto real continua fora: a galeria desenha a cena SVG.

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
| Categoria sem lugares | Não verificado: as quatro categorias têm lugares no catálogo semeado, então a aba vazia nunca foi vista |
| API fora do ar | a mesma tela "Algo deu errado" da busca |

---

## Crio minha conta e entro

**Entrada:** "Entrar" no cabeçalho, ou o portão de uma página privada.
**Ação:** cria a conta com nome, e-mail e senha (com confirmação) e entra.
**Sucesso:** a pessoa chega em "Minha conta", ou na página que tentou abrir (o destino viaja em `?redirect=` e só aceita caminho interno do app). "Sair" encerra a sessão.
**Falha:** erro em português junto do campo; e-mail já usado (409); excesso de tentativas mostra o tempo de espera; quem já tem sessão e abre `/sign-in` vai direto para a conta.

## Tenho um imóvel para anunciar

**Entrada:** botão "Anunciar imóvel" do cabeçalho (a partir de telas médias), da home ou da faixa do dono.
**Ação:** preenche seis etapas e envia.
**Sucesso:** o anúncio é criado em análise (nunca no ar sozinho), as fotos sobem e a tela diz que a equipe vai revisar; o rascunho é apagado e há o caminho para "Meus anúncios".
**Falha:** mantém o formulário preenchido e leva o dono à primeira etapa com erro. Sem sessão no último passo, o rascunho é guardado e a pessoa vai para o login, voltando ao cadastro depois. Se as fotos falharem, o anúncio já existe e a tela repete só o envio das fotos.

As fotos escolhidas não ficam no rascunho (o arquivo não cabe no `localStorage`): quem é mandado ao login no último passo escolhe as fotos de novo. Em "Meus anúncios" o dono edita os dados, adiciona fotos e arquiva; remover ou reordenar foto ainda não existe na API.

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
| Texto do anúncio ou do guia (dado, não interface) | hoje está só em português no catálogo semeado; tradução de conteúdo de dono é pergunta em aberto (`MEMORY.md`) |

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
