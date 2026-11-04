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
| 1 | abre o site | mostra a proposta, a busca em pílula (tipo, bairro, período), a faixa de categorias por tipo e os 6 imóveis atualizados há menos tempo (o convite a anunciar é um link, e a busca é o único botão cheio da tela); sem nenhum anúncio publicado, a seção "Disponíveis agora" some | `/` |
| 2 | escolhe tipo, bairro e período na pílula e toca em buscar (ou toca numa categoria) | abre a listagem já com esses filtros na URL | `/listings?type=&neighborhood=&period=` |
| 3 | ajusta tipo, bairro, período e faixa de preço na barra de filtros | atualiza a lista e o contador "Mostrar N imóveis"; os chips mostram o que restringe e o botão "Limpar" zera tudo | `/listings` |
| 4 | no celular, toca no botão flutuante para ver o mapa | alterna para o mapa (`view=map`); cada imóvel é um pin com o preço | `/listings?view=map` |
| 5 | toca num pin | marca o pin (`selected` na URL) e mostra o resumo do imóvel | `/listings?view=map&selected=` |
| 6 | abre um imóvel | mostra galeria com abas por ambiente (fachada, quarto, banheiro, cozinha, sala), preço, o que está incluso (água, luz, internet), disponibilidade, estadia mínima, períodos, endereço, descrição, regras, e o cartão do dono com selo "dono verificado" e "atualizado há X dias" | `/listings/$slug` |
| 7 | toca em "Chamar no WhatsApp" | abre `wa.me` em outra aba com a mensagem que cita o imóvel e o bairro; no celular o botão fica fixo no rodapé | WhatsApp |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Filtros sem resultado | estado vazio com ícone de linha, texto que orienta e botão "Limpar filtros"; vale também para um bairro de endereço que a API não conhece, que volta lista vazia |
| API fora do ar ou lenta demais (15 s) | tela "Algo deu errado" com "Tentar de novo" e "Voltar ao início"; o botão refaz o carregamento. No navegador a API é tentada de novo até 2 vezes antes do erro, e no servidor não |
| Valor inválido na URL (`?type=castelo`, bairro que não existe) | o campo é ignorado e a página abre sem esse filtro, sem tela de erro |
| Imóvel com `slug` que não existe | página 404 própria da área pública, com caminho de volta para a home; só o erro `LISTING_NOT_FOUND` da API vira 404, e API fora do ar é a tela de erro |
| Imóvel sem foto de um ambiente | a galeria mostra o quadro neutro "Foto em breve" |
| Hotel que anuncia só diária | o card e a página mostram a diária; para a faixa de preço a API conta a diária como 30 vezes o valor |
| Link do WhatsApp aberto em desktop sem o app | o `wa.me` abre o WhatsApp Web; a falha do app do visitante é fora do site |
| Falha de rede ao carregar o mapa | o mapa pode ficar sem ladrilhos; a lista e os filtros não dependem dele |

A lista e o mapa mostram até 100 anúncios de uma vez; acima disso falta paginação (`TASKS.md` 3.9). A galeria mostra o quadro neutro enquanto o dono não envia a foto.

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

As fotos escolhidas não ficam no rascunho (o arquivo não cabe no `localStorage`): quem é mandado ao login no último passo escolhe as fotos de novo. Em "Meus anúncios" o dono edita os dados, adiciona, reordena e remove fotos e arquiva. Cada foto tem "Subir", "Descer" (botões com rótulo, sem precisar arrastar; a primeira é a capa) e "Remover" (pede confirmação). Mexer nas fotos grava na hora, sem o botão "Salvar alterações", e não muda o estado do anúncio: só salvar o formulário reenvia à análise um anúncio recusado (`DECISIONS.md` #33).

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

## Moderação e denúncia

**Entrada:** a equipe (`ADMINISTRATOR` e `MODERATOR`) entra e abre "Painel". O visitante denuncia pela página do anúncio.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre a fila de anúncios | lista o que está em análise, do mais antigo, com filtro de estado e busca na URL | `/administrator/listings` |
| 2 | abre um anúncio | mostra fotos, valores, dono e selo como o visitante vai ver | `/administrator/listings/:id` |
| 3 | aprova | o anúncio vai ao ar e registra quem decidiu | detalhe |
| 4 | recusa com motivo (3 a 500 caracteres) | o anúncio volta ao dono como "Precisa de ajuste", com o motivo em destaque | detalhe |
| 5 | marca ou desmarca o dono como verificado | o selo muda em todos os anúncios da conta | detalhe |
| 6 | arquiva | o anúncio sai do ar e o segundo arquivamento é recusado (409) | detalhe |
| 6b | o administrador abre um anúncio arquivado, sem denúncia, e toca em "Excluir de vez" | pede confirmação ("não tem volta"); apaga o anúncio e as fotos, volta para a fila; só o administrador vê o botão | detalhe |
| 7 | abre as denúncias, lê e resolve com nota | a denúncia passa a resolvida; o anúncio não muda, quem tira do ar é o arquivar | `/administrator/reports` |
| 8 | o visitante toca em "Denunciar este anúncio" e escolhe o motivo | grava a denúncia, sem login, e agradece; mais de 5 por hora do mesmo IP recebe 429 com o tempo de espera | página do anúncio |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Moderador tenta apagar de vez | 403: só o administrador apaga (`DECISIONS.md` #34); o moderador arquiva |
| Administrador apaga de vez um anúncio que não está arquivado | 409, arquive antes |
| Administrador apaga de vez um anúncio que tem denúncia | 409: a denúncia é registro e o anúncio fica arquivado |
| Dono tenta ver anúncio de outro dono | 404, igual ao anúncio que não existe |
| Dono abre o painel | volta para a conta |
| Dono edita o anúncio recusado | salva e o anúncio volta para análise; editar um anúncio no ar não passa por nova revisão |
| Dono troca nome ou WhatsApp de um anúncio | a conta perde o selo até a equipe verificar de novo |
| Denúncia de anúncio que não está no ar | 404, igual ao inexistente |

## Equipe mantém o guia da cidade

**Entrada:** a equipe (`ADMINISTRATOR` e `MODERATOR`) entra, abre "Painel" e toca em "Guia".
**Pré-condição:** sessão de equipe. O dono (`OWNER`) volta para a conta.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre o guia do painel | lista os lugares que estão no guia público, por nome; aba, busca e página ficam na URL | `/administrator/places` |
| 2 | troca de aba, busca por nome ou descrição | a lista se refaz; busca sem resultado oferece "Limpar busca" | `/administrator/places?category=EVENT&q=` |
| 3 | toca em "Novo lugar", preenche e envia | grava e volta para a lista, onde o lugar já aparece; o guia público o mostra | `/administrator/places/new` |
| 4 | escolhe a aba Eventos | aparece o campo "Dia do evento", obrigatório; nas outras abas ele some | formulário |
| 5 | toca em "Editar" num lugar, muda e salva | mostra "Alterações salvas"; vale para o lugar arquivado, que continua arquivado | `/administrator/places/:id` |
| 6 | toca em "Arquivar" e confirma | o lugar sai do guia público e da lista; a tela diz "Lugar arquivado" | lista |
| 7 | abre "Arquivados" e toca em "Restaurar" | o lugar volta ao guia; a tela diz "Lugar restaurado" | `/administrator/places?archived=true` |
| 8 | o administrador toca em "Excluir de vez" num arquivado e confirma | pede confirmação ("não tem volta"); apaga o lugar; só o administrador vê o botão | lista de arquivados |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Evento sem dia, dia em lugar que não é evento, ou dia que não existe (31 de fevereiro) | 422 no campo "Dia do evento"; a tela repete a regra do evento antes de enviar |
| Bairro que deixou de existir | 422 no campo "Bairro" |
| Moderador tenta apagar de vez | 403: só o administrador apaga (`DECISIONS.md` #35); o botão nem aparece |
| Excluir ou restaurar um lugar que não está arquivado, ou arquivar o arquivado | 409; a tela explica e refaz a lista |
| Outra pessoa já apagou o lugar | 404 "Esse lugar não existe", com volta para o guia |
| Visitante com `?trashed` na vitrine | ignorado: o arquivado nunca aparece no guia público |


## Administrador gere as contas

**Entrada:** o administrador entra, abre "Painel" e toca em "Contas". O moderador não vê a aba.
**Pré-condição:** sessão de `ADMINISTRATOR`. O moderador que digitar o endereço volta à fila de anúncios; o dono volta para a conta.

| # | Usuário faz | Sistema responde | Tela |
|---|---|---|---|
| 1 | abre "Contas" | lista as contas, as mais novas primeiro; papel, acesso, busca e página ficam na URL | `/administrator/users` |
| 2 | filtra por papel ou por acesso, busca por nome ou e-mail | a lista se refaz; busca sem resultado oferece "Limpar busca" | `/administrator/users?role=MODERATOR&status=INACTIVE&q=` |
| 3 | toca em "Gerenciar" numa conta | mostra o nome, o e-mail, o papel e o acesso, com as duas ações | `/administrator/users/:id` |
| 4 | escolhe outro papel e toca em "Mudar papel" | pede confirmação (as sessões da conta caem); grava e diz "Papel alterado" | detalhe |
| 5 | toca em "Suspender conta" e confirma | a conta passa a "Suspensa": não entra, não renova e perde as sessões; a tela diz "Conta suspensa" | detalhe |
| 6 | toca em "Reativar conta" e confirma | a conta volta a "Ativa" e a pessoa entra de novo, com sessão nova | detalhe |

**Caminhos alternativos**

| Situação | Resposta |
|---|---|
| Abre a própria conta | sem as ações: "Esta é a sua conta. Outro administrador precisa mudar o seu papel ou suspender o seu acesso" (a API recusa com 409 `USER_OWN_ACCESS_CHANGE`) |
| Rebaixar ou suspender o último administrador ativo | 409 `USER_LAST_ADMINISTRATOR`; a tela explica no diálogo |
| Tirar do papel de dono quem ainda tem anúncio fora da lixeira | 409 `USER_OWNS_LISTINGS`: o dono arquiva os anúncios antes (`DECISIONS.md` #36) |
| Pedir o papel que a conta já tem | nada muda e as sessões ficam |
| A conta suspensa tenta entrar ou usar o cookie que tinha | 401, o mesmo de senha errada; a sessão antiga não volta ao reativar |
| Moderador ou dono chama a API de contas | 403 |
| Outra pessoa já arquivou a conta | 404 "Essa conta não existe", com volta para a lista |


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
