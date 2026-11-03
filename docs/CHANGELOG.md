# Changelog

Mudanças de Aporta que quem usa percebe. Formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/). Regras em `_standards/documentation.md` §7.

Ainda não houve release nem tag: tudo abaixo está na branch de trabalho e acumula em
`[Não lançado]`. Os imóveis, lugares, bairros e telefones que o site mostra vêm do banco, mas o
catálogo semeado é de exemplo (telefones fictícios, coordenadas aproximadas).

## [Não lançado]

### Corrigido

- Campos de busca da página inicial voltam a mostrar o foco do teclado (o `outline-none` apagava o anel).
- Títulos em ordem na listagem e no guia (o nome de cada card é `h2`, logo abaixo do `h1`).
- No celular o cabeçalho rola com a página em vez de ocupar três linhas fixas da tela.
- Endereço que não existe agora responde 404 de verdade (antes respondia 200 com a tela de "não existe"), mantendo menu e rodapé.
- Erro de variável de servidor no navegador em todas as páginas (`INDEXABLE` lido no cliente).
- Galeria: o nome do botão de cada miniatura inclui o texto "Foto em breve" que ele mostra (critério 2.5.3 do WCAG).
- Filtro de preço: mínimo maior que o máximo agora avisa no campo, em vez de só mostrar "nenhum imóvel"; o chip mostra os valores em reais formatados.

### Alterado

- Site responsivo em todos os tamanhos e sem jeito de aplicativo: o detalhe do imóvel tem duas colunas a partir do tablet, o WhatsApp é um botão da página (sem barra fixa no rodapé), a listagem alterna Lista e Mapa por botões no fluxo da página (sem botão flutuante), os filtros se ajustam no tablet e o cadastro usa duas colunas no desktop.
- Formulários, botões, abas da galeria, caixas de seleção, escolha do motivo da denúncia, barras de progresso, cartões, paginação, selos, avisos, telas vazias e diálogos passam a usar os componentes do shadcn (Base UI), com o mesmo desenho e nos dois temas.
- Bairros: o filtro e o cadastro passam a usar os 14 bairros oficiais de Benjamin Constant (Agropalmin, Alzenir Magalhães, Bom Jardim, Castanhal, Centro, Cidade Nova, Cohabam, Coimbra, Colônia I, Colônia II, Eduardo Braga, Javarizinho, Monte da Redenção e Umarizal). As coordenadas dos que ainda não tinham ponto estão provisórias no Centro.
- Fim da ilustração vetorial: imóvel sem foto mostra um quadro neutro com ícone de linha e "Foto em breve"; o estado vazio e a página 404 não desenham mais paisagem; a prévia de link é tipográfica.
- Página inicial recomposta: título grande à esquerda com a busca, tipos de imóvel como índice à direita, e o guia com as quatro categorias como links; texto revisado.

### Adicionado

- Botão de tema no cabeçalho: automático (segue o aparelho), claro ou escuro, com a escolha guardada no aparelho e aplicada antes da primeira pintura, sem piscar.
- Dados estruturados do guia (`ItemList` de `LocalBusiness` e `Event`), `hreflang` no sitemap e título próprio da página inicial nos três idiomas.
- Ativos estáticos pré-comprimidos (gzip e brotli) pelo Nitro: o maior chunk de JS cai de 329 KB para 89 KB.
- Página inicial com busca em pílula por tipo, bairro e período, faixa de categorias por tipo de
  imóvel, imóveis em destaque, a explicação de por que confiar e atalhos para o guia e para anunciar.
- Listagem de imóveis com filtros por tipo, bairro, período e faixa de preço guardados no endereço da
  página, para o link mandado por WhatsApp abrir a mesma busca. Chips mostram o que está filtrado e
  "Limpar" zera tudo.
- Mapa de apoio com o preço em cada pin, ao lado da lista no computador e alternado por um botão
  flutuante no celular.
- Página do imóvel com galeria por ambiente (fachada, quarto, banheiro, cozinha, sala), valor com o
  que está incluso (água, luz, internet), disponibilidade, estadia mínima, períodos aceitos, regras,
  selo "dono verificado" e "atualizado há X dias".
- Cadastro de conta do dono ("Criar conta"), entrada e "Minha conta" com saída, no cabeçalho e em
  páginas privadas que levam de volta ao destino depois de entrar.
- O cadastro do imóvel agora envia o anúncio e as fotos por ambiente. O anúncio entra em análise e só
  vai ao ar depois da revisão da equipe.
- "Meus anúncios": o dono vê o estado de cada anúncio (em análise, no ar, arquivado), edita os dados,
  adiciona fotos e arquiva.
- Painel da equipe: fila de anúncios em análise, aprovar, recusar com motivo, arquivar, marcar o dono
  como verificado e ver e resolver denúncias.
- O dono vê o motivo quando a equipe pede ajuste, e salvar o anúncio o reenvia para análise.
- "Denunciar este anúncio" na página do imóvel, sem precisar de conta.
- Listagem em páginas de 12 ou 24 imóveis, com contagem e navegação; o mapa carrega só os imóveis
  da área visível e avisa quando é preciso aproximar.
- Ícone, manifesto e prévia de compartilhamento (WhatsApp e redes) com a marca do Aporta.
- Botão "Chamar no WhatsApp" com mensagem pronta que cita o imóvel, fixo no rodapé no celular.
- Guia da cidade em quatro abas (Comer, Beber, Eventos, Serviços úteis), com a aba guardada no
  endereço e botão de WhatsApp nos lugares que têm número.
- Cadastro do imóvel pelo dono em seis etapas, com indicador de progresso, dicas por etapa e rascunho
  salvo no próprio aparelho.
- API pública de leitura de bairros, anúncios e guia (`GET /storefront/listings`,
  `/storefront/listings/:slug`, `/storefront/neighborhoods` e `/storefront/places`), com paginação,
  ordenação e filtros por tipo, bairro, período e faixa de preço.
- Site em português, espanhol (`/es`) e inglês (`/en`), com troca de idioma no cabeçalho.
- Tema claro e escuro que acompanha a configuração do aparelho.
- `sitemap.xml` e `robots.txt` para os buscadores.
- Cenas desenhadas no lugar das fotos de cada ambiente, até chegarem fotos reais.

### Alterado

- O rodapé do site mostra só o crédito "Desenvolvido por Maiyu" (com a logo e o link para maiyu.com.br), nos três idiomas, no lugar da frase "Feito em Benjamin Constant".
- Variáveis de ambiente padronizadas no catálogo da casa. Quem opera passa a poder definir
  `APP_CLIENT_URL` (o endereço do app, que decide o `sameSite` do cookie), `SEED_DEMO_PASSWORD` (liga a
  demonstração) e `SITE_ENV` (só `production` deixa os buscadores indexarem; staging e preview
  respondem `noindex` e `Disallow: /`). `CHROMIUM_PATH` do gerador de ícones passou a `E2E_CHROMIUM_PATH`.
- As contas de exemplo mudaram: `moderator@example.com` e `owner@example.com`, com a senha de
  `SEED_DEMO_PASSWORD`, e só existem onde essa chave foi definida (antes dependiam do ambiente de
  desenvolvimento e reaproveitavam a senha do administrador). O administrador agora nasce onde
  `SEED_OWNER_PASSWORD` for definida, junto de `SEED_OWNER_EMAIL`.
- O site agora lê imóveis, bairros e guia da API, e não mais de dados de exemplo embutidos: a home, a
  listagem, o detalhe, o guia e o `sitemap.xml` mostram o que está no banco. A faixa de preço passou
  a ser calculada no servidor, com a diária do hotel valendo 30 vezes. A listagem e o mapa mostram até
  100 anúncios.
- Quando a API está fora do ar, a página mostra "Algo deu errado" com "Tentar de novo", que refaz o
  carregamento. Anúncio que não existe continua dando a página 404 do site, e um bairro desconhecido
  no endereço mostra a lista vazia com "Limpar".
- O `sitemap.xml` passa a listar cada anúncio publicado nos três idiomas. Se a API não responder, sai
  só com as páginas fixas e não fica em cache.

- Os títulos das telas encolhem sozinhos em celulares estreitos, sem quebrar a linha no meio da
  palavra; o texto corrido não muda de tamanho.
- Botões, campos e links de menu têm pelo menos 44 px de altura no celular, incluindo o zoom do mapa e
  o pin de preço.
- Os convites a anunciar na home, no cabeçalho e na conta são links, e só há um botão cheio por tela.
  Sai a animação de entrada das seções, que só atrasava a leitura em internet lenta, e a foto do
  anúncio passa a esmaecer, em vez de crescer, quando se aponta o cursor.
- As contagens falam "Nenhum imóvel", "1 imóvel" e "12 imóveis" (e o mesmo em espanhol e inglês),
  sem "imóvel(is)" nem "0 foto".

### Corrigido

- O último passo do cadastro não diz mais "Anúncio recebido", porque nada era enviado. O botão agora
  é "Finalizar cadastro", a tela mostra "Anúncio pronto", avisa que o envio de anúncios ainda não
  está no ar e mantém o rascunho salvo neste aparelho.

### Segurança

- A denúncia pública tem limite por IP e guarda só um hash do IP.
- Leituras públicas limitadas a 120 por minuto por IP; o site passa a enviar políticas de segurança de
  conteúdo, de referência e de permissões.
- Contas entram por sessão em cookie protegido, com limite de tentativas de senha e de cadastro por
  IP. Os cookies levam o nome do Aporta para não se misturar com os de outros sites da casa.
