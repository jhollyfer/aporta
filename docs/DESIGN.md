# Design system

**Aporta** · acolhedor, claro, leve no celular

> Registra a **decisão**: que valor, por quê, onde usar. O valor que o código lê mora no tema
> (`frontend/src/styles.css`); componente usa token semântico, nunca hex nem valor arbitrário
> em classe (`_standards/frontend.md` §6). Token mudou aqui, muda no tema no mesmo commit.
> Os anti-padrões que valem para todo projeto estão em `_standards/frontend.md` §10.8; aqui só se aponta.

## 1. Visão geral

- Direção: a interface precisa passar confiança a quem chega numa cidade nova e não conhece ninguém.
  Verdes de mata ribeirinha, terrosos de barranco e telha, e um acento quente só, o amarelo do fim de
  tarde sobre o rio, reservado ao que pede o clique (o botão de WhatsApp e os convites a anunciar).
- Modo dominante: **Convencer** (vitrine e página pública). A listagem e o detalhe seguem padrão
  familiar de busca imobiliária (busca em pílula e categorias como no Airbnb, valores transparentes
  como no QuintoAndar); a ousadia visual fica na home.
- Tema: claro e escuro, escolhido pelo sistema do visitante com `prefers-color-scheme`. Não há
  troca manual nem cookie de tema: o CSS redefine só os tokens semânticos no escuro, e a página não
  troca de tema no meio.
- Imagem: nenhuma foto real ainda. Cada ambiente é uma cena SVG desenhada com os tokens de cena, que
  mudam entre dia (claro) e noite (escuro). Foto gerada por IA não entra (`DECISIONS.md` #6).

## 2. Cores

Dois níveis: o primitivo é a variável em `:root` de `styles.css` (`--moss`, `--sun`...), e o
semântico é o nome que o Tailwind expõe (`bg-moss`, `text-ink`). O modo escuro redefine os valores
em `@media (prefers-color-scheme: dark)`, sem tocar nos nomes.

| Token | Claro | Escuro | Papel (onde e por quê) |
|---|---|---|---|
| `paper` | `#f3f5f0` | `#14201a` | fundo da página: cinza-esverdeado, sem o amarelo creme |
| `surface` | `#ffffff` | `#1b2a22` | cartão, campo, pílula de busca |
| `ink` | `#1f2a22` | `#eef0e8` | texto principal |
| `ink-soft` | `#445049` | `#aab8ad` | texto de apoio e metadado (7,68:1 sobre o papel) |
| `line` | `#dcd8cc` | `#2f4136` | contorno fino e divisor; borda de todo elemento por padrão |
| `moss` | `#2f5d46` | `#7fc29b` | ação principal da área, link de destaque, foco; botão `moss` |
| `moss-deep` | `#234838` | `#a6dbbb` | hover do `moss` e texto sobre `moss-wash` |
| `moss-wash` | `#e4eee6` | `#213a2d` | fundo suave de chip, aba, estado vazio e barra de progresso |
| `clay` | `#a8643d` | `#e0a47c` | terroso de apoio nas cenas e em detalhes |
| `clay-wash` | `#ece3dd` | `#3a2a20` | fundo suave terroso, de croma baixo |
| `sun` | `#f2b134` | `#f2b134` | acento quente reservado ao clique de contato e ao convite a anunciar |
| `sun-deep` | `#d99a1d` | `#ffc65a` | hover do `sun` |
| `river` | `#4f7f86` | `#86b8bf` | azul de rio, detalhes e cenas |
| `danger` | `#b3412f` | `#ef8d7a` | mensagem de erro de campo |

Regra do acento: `sun` aparece no botão "Chamar no WhatsApp" (`WhatsAppCta`), nos convites a
anunciar (`PillButton` com `tone="sun"`, cabeçalho, hero e faixa do dono), no destaque de
disponibilidade do card e nas dicas do cadastro. Cor a mais que isso vira enfeite e custa atenção
numa tela pequena.

Tokens de cena (céu, mata, rio e casa das cenas SVG), redefinidos no escuro para a noite:
`--sky-top`, `--sky-bottom`, `--forest-far`, `--forest-near`, `--water`, `--water-deep`, `--stilt`,
`--roof`, `--wall`. Não há `success` nem `warning` semânticos hoje: nenhuma tela os usa.

Contraste conferido (WCAG 2.1, texto 4,5:1 e componente 3:1), calculado a partir dos hex acima
com a fórmula de luminância relativa em 2026-11-01. Não foi medido num navegador nem com ferramenta
de terceiros.

| Par | Claro | Escuro | Resultado |
|---|---|---|---|
| `ink` sobre `paper` | 13,54 | 14,60 | passa |
| `ink-soft` sobre `paper` | 7,68 | 8,13 | passa |
| `ink-soft` sobre `surface` | 8,44 | 7,26 | passa |
| `paper` sobre `moss` (botão `moss`) | 6,89 | 8,07 | passa |
| `moss` sobre `paper` (link, selo) | 6,89 | 8,07 | passa |
| `moss-deep` sobre `moss-wash` (chip, aba) | 8,60 | 7,89 | passa |
| `danger` sobre `paper` (erro de campo) | 5,15 | 7,00 | passa |
| `on-sun` sobre `sun` (botão de WhatsApp) | 7,87 | 7,87 | passa nos dois temas (token fixo `--on-sun`) |
| `on-sun` sobre `sun-deep` (hover do botão) | 6,08 | 9,54 | passa nos dois temas |
| `line` sobre `paper` (borda de campo) | 1,30 | 1,38 sobre `surface` | abaixo dos 3:1 pedidos para componente |

No tema escuro `ink` vira claro, e os botões `sun` seguem com texto `text-ink`: o texto do botão de
WhatsApp fica quase invisível no escuro. A falha está registrada em `MEMORY.md` ("Problemas
conhecidos") e `TASKS.md`; a correção é um token de texto próprio para o `sun` (escuro nos dois
temas). A borda `line` dos campos também precisa de revisão para o limite de 3:1.

## 3. Tipografia

Família: Plus Jakarta Sans, pacote `@fontsource-variable/plus-jakarta-sans` (fonte variável
servida pelo próprio site, sem pedido a terceiros), com `ui-sans-serif, system-ui, sans-serif` de
reserva. Pesos usados: normal (corpo), `font-semibold` (600), `font-bold` (700) e `font-extrabold`
(800, títulos e botões).

O projeto não define tokens `--text-*`: usa a escala do Tailwind com os papéis abaixo. Um token por
papel (`--text-heading` e semelhantes) é uma melhoria pendente, e não existe hoje.

| Papel | Classes usadas | Peso | Onde |
|---|---|---|---|
| Display | `text-4xl sm:text-6xl`, `leading-[1.05]`, `tracking-tight` | extrabold | título da home |
| Título | `text-3xl sm:text-4xl` ou `sm:text-5xl`, `tracking-tight` | extrabold | `h1` de cada página |
| Subtítulo | `text-xl` e `text-2xl` | extrabold | `h2` e título de bloco |
| Corpo | `text-base` (16 px) e `text-lg` no texto de abertura | normal | texto e campos; nunca abaixo de 16 px em campo |
| Secundário | `text-sm`, cor `ink-soft` | normal a bold | rótulo, dica, metadado |
| Legenda | `text-xs` (redefinido para 13px no tema), `font-semibold` | semibold | selo do card; nada que se leia fica abaixo de 13px |

Número de preço em `text-4xl` extrabold no detalhe. Texto corrido com `max-w-3xl` ou `max-w-2xl`
(medida de leitura).

## 4. Layout

- Breakpoints: os do Tailwind (`sm` 40 rem, `md` 48 rem, `lg` 64 rem), sem sobrescrita. Celular
  primeiro: base sem prefixo, camadas em `sm:` e `lg:`.
- Contêiner: `max-w-6xl` (home, detalhe, cadastro mais estreito em `max-w-2xl`) e `max-w-7xl`
  (listagem), com gutter `px-4` (16 px).
- Espaço: escala padrão do Tailwind; conforto sobre densidade, com blocos da home separados por
  `pt-28`.
- Listagem: no desktop, lista em duas colunas e mapa fixo (`lg:grid-cols`, cerca de um terço para o
  mapa); no celular lista e mapa se alternam por um botão flutuante.
- Detalhe: no celular o botão de WhatsApp fica fixo no rodapé, com `pb-28` na página para não cobrir
  o conteúdo.
- Sem rolagem horizontal da página; a faixa de categorias rola na horizontal dentro do próprio
  componente, sem barra visível.

## 5. Elevação e camadas

- Plano por padrão: cartões e a pílula de busca se separam do fundo por troca de tom (`surface` sobre
  `paper`), sem borda e sem sombra. Sombra só no que flutua de verdade: botão de mapa, resumo sobre o
  mapa, barra do WhatsApp (`sticky` no fim do detalhe, para não cobrir o rodapé) e pin do mapa. O
  linter de design da casa confere isso, e cada exceção leva `taste-skill-ignore` com o motivo.
- Camadas em uso (classes soltas, ainda sem token nomeado): cabeçalho e barras fixas `z-40`, resumo
  sobre o mapa `z-[500]` (o Leaflet usa valores altos de z-index internamente), link "pular para o
  conteúdo" `z-[70]`. Tokens de z-index nomeados são melhoria pendente.

## 6. Formas

- Raio: `--radius-card` 1.25 rem (`rounded-card`) em cartão, cena e estado vazio; `rounded-xl` em
  campo de formulário; `rounded-full` e `--radius-pill` em botão, chip, aba e selo; a pílula de busca
  usa `1.75rem` no celular e `rounded-full` em tela maior.

## 7. Componentes

O Aporta não usa shadcn: não há `components/ui/` nem `components.json`. Tudo o que é do produto mora
em `frontend/src/components/common/`, com compound components onde há partes (`Object.assign`), e os
campos de formulário em `routes/_public/list-your-place/-components/`. Estados de todo controle:
repouso, hover, `focus-visible`, desabilitado, erro.

| Componente | Variantes e partes | Regra |
|---|---|---|
| `PillButton` | `tone`: `moss`, `sun`, `outline`; `scale`: `md` (44 px), `lg` (56 px) | um `moss` ou `sun` por área; `sun` só para contato ou convite a anunciar; é link, não botão de formulário |
| `WhatsAppCta` | um estilo (`sun`, 48 px) | o botão principal da plataforma; abre `wa.me` com mensagem pronta, `target="_blank"` e `rel="noopener noreferrer"` |
| `SearchPill` | partes `Segment` (tipo, bairro, período) e `Submit` | busca em pílula da home; vira coluna no celular |
| `CategoryRail` | parte `Item` (um tipo de imóvel) | faixa horizontal, rola sem barra visível |
| `FilterBar` | partes `Fields`, `Chips`, `Actions` | filtros da listagem; os chips mostram o que restringe e "Limpar" zera |
| `ListingCard` | partes `Photo`, `Badge`, `Title`, `Meta`, `Price`, `Available` | diz o valor e o que está incluso antes de abrir o anúncio |
| `ListingPhoto` | foto ou cena SVG do ambiente | `url: null` desenha a cena; com foto, `alt` com o nome do ambiente |
| `Scene` | `SCENE_KIND`: `RIVER`, `PANORAMA`, `HOUSE`, `BUILDING`, `HOTEL`, `BEDROOM`, `BATHROOM`, `KITCHEN`, `LIVING` | decorativa por padrão (`aria-hidden`); com `label` vira imagem nomeada |
| `Gallery` | partes `Tabs` (por ambiente), `Main`, `Thumbs` | galeria do detalhe |
| `ListingMap` | parte `Summary`; carregado só no cliente | pin com o preço; o pin só leva o preço formatado, nunca texto de usuário |
| `OwnerCard` | selo "dono verificado" quando `verified`, e "atualizado há X dias" | responde às duas dúvidas de confiança antes do contato |
| `PlaceCard` | botão de WhatsApp só quando o lugar tem número | cartão do guia; evento mostra dia e mês em destaque |
| `GuideTabs` | quatro abas (Comer, Beber, Eventos, Serviços úteis) | aba na URL |
| `Stepper` | partes `Progress`, `Step`, `Tips`, `Nav` | cadastro em etapas; `progressbar` com `aria-valuenow` e texto "Etapa N de 6" |
| `EmptyState` | título, descrição e ação opcional | estado vazio com saída (limpar filtro), nunca só "nada aqui" |
| `NotFoundPage` | uma | 404 da área pública, dentro da casca |

## 8. Estados de tela

| Estado | Como aparece |
|---|---|
| Carregando | Não se aplica hoje: os dados são locais e não há espera. Com a API, esqueleto com a forma do card, e spinner só no botão que enviou. O botão de envio do cadastro desabilita e anuncia `aria-busy` enquanto envia |
| Vazio | filtro sem resultado: `EmptyState` com a cena do rio e botão "Limpar filtros". Guia e listagem sem dados: Não se aplica hoje |
| Erro | erro de campo abaixo do campo, em `danger`, ligado por `aria-describedby`; página inexistente em `NotFoundPage`. Erro de rede aguarda a API |
| Sucesso | o envio do cadastro troca a tela por uma confirmação com o título enviado |

Ilustração de estado vazio: a cena SVG do rio, desenhada com os tokens de cena.

## 9. Movimento

Só `transform` e `opacity`, e só para quem não pediu menos movimento
(`@media (prefers-reduced-motion: no-preference)` em `styles.css`):

- `.enter`: a entrada do que aparece na primeira tela, escalonada por `--i` (80ms por passo), no hero,
  no cabeçalho de cada página e no cadastro.
- `.reveal`: a entrada de cada bloco ao entrar na janela, guiada pela rolagem
  (`animation-timeline: view()`), sem JavaScript e sem observador, o que importa na internet lenta
  do Alto Solimões. Onde o navegador não conhece a propriedade, o bloco aparece parado.
- Toque: `active:scale-[0.97]` nos botões, com `motion-reduce:active:scale-100`.
- Nunca em bloco de texto de baixo contraste, como o rodapé: com opacidade parcial o axe lê o texto
  semitransparente e reprova o contraste. O E2E cobre isso nos dois temas.
- A regra global de `prefers-reduced-motion` no `styles.css` zera as durações. `_standards/frontend.md`
  §10 pede caminho por componente (`motion-reduce:`); a regra global é desvio a corrigir (`TASKS.md`).

## 10. Acessibilidade

- Meta: WCAG 2.1 AA.
- Foco visível: `outline` de 2 px na cor `moss` em todo link, botão, campo e elemento focável, com
  `outline-offset` de 2 px. Link "pular para o conteúdo" é o primeiro elemento focável.
- Alvo de toque: botões a partir de 44 px (`h-11`), botão de WhatsApp com 48 px, campos com 48 px.
- Ícones: Phosphor (`@phosphor-icons/react`), decorativos com `aria-hidden`.
- Imagem com sentido tem `alt`; a cena SVG decorativa fica `aria-hidden`. A página declara `lang`
  pelo idioma da requisição.
- Formulário: rótulo visível acima do campo, dica e erro ligados ao campo por `aria-describedby`.
- Pendente: o contraste do botão de WhatsApp no tema escuro (§2).

## 11. Fazer / não fazer

Os anti-padrões universais estão em `_standards/frontend.md` §10.8 e valem aqui sem cópia. Abaixo,
só os que este projeto confirmou ou acrescentou:

| Fazer | Não fazer |
|---|---|
| Usar `sun` só para o clique de contato e o convite a anunciar | Usar `sun` como cor de enfeite ou em mais de uma ação por área |
| Mostrar o valor e o que está incluso no card | Esconder água, luz e internet até o detalhe |
| Desenhar o ambiente em SVG enquanto não há foto real | Usar foto de banco ou gerada por IA |
| Mandar para o WhatsApp com mensagem que cita o imóvel | Criar chat interno |
| Pôr o pin do mapa só com o preço | Pôr texto digitado por usuário no HTML do pin |

## 12. Referências

> Referência é direção, não cópia (`frontend.md` §6.4). Cada linha diz o que se tirou dela.

| Referência | Onde | O que se tirou | Data |
|---|---|---|---|
| Airbnb | https://www.airbnb.com.br | busca em pílula, faixa de categorias, mapa com o preço no pin | 2026-11-01 |
| QuintoAndar | https://www.quintoandar.com.br | transparência de valores: o que o preço inclui, dito antes de abrir o anúncio | 2026-11-01 |

Componentes trazidos de fora (21st.dev, React Bits): Não se aplica, nenhum.
