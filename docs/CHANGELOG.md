# Changelog

Mudanças de Aporta que quem usa percebe. Formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/). Regras em `_standards/documentation.md` §7.

Ainda não houve release nem tag: tudo abaixo está na branch de trabalho e acumula em
`[Não lançado]`. Os imóveis, lugares, bairros e telefones que as telas mostram são de exemplo.

## [Não lançado]

### Adicionado

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
- Botão "Chamar no WhatsApp" com mensagem pronta que cita o imóvel, fixo no rodapé no celular.
- Guia da cidade em quatro abas (Comer, Beber, Eventos, Serviços úteis), com a aba guardada no
  endereço e botão de WhatsApp nos lugares que têm número.
- Cadastro do imóvel pelo dono em seis etapas, com indicador de progresso, dicas por etapa e rascunho
  salvo no próprio aparelho. O envio ainda não grava o anúncio nem as fotos.
- API pública de leitura de bairros, anúncios e guia (`GET /storefront/listings`,
  `/storefront/listings/:slug`, `/storefront/neighborhoods` e `/storefront/places`), com paginação,
  ordenação e filtros por tipo, bairro, período e faixa de preço. Ainda é interna: o site continua
  mostrando os dados de exemplo e só passa a consultá-la na próxima etapa.
- Site em português, espanhol (`/es`) e inglês (`/en`), com troca de idioma no cabeçalho.
- Tema claro e escuro que acompanha a configuração do aparelho.
- `sitemap.xml` e `robots.txt` para os buscadores.
- Cenas desenhadas no lugar das fotos de cada ambiente, até chegarem fotos reais.

### Corrigido

- O último passo do cadastro não diz mais "Anúncio recebido", porque nada era enviado. O botão agora
  é "Finalizar cadastro", a tela mostra "Anúncio pronto", avisa que o envio de anúncios ainda não
  está no ar e mantém o rascunho salvo neste aparelho.

### Segurança

- Contas da equipe entram por sessão em cookie protegido, com limite de tentativas de senha. Ainda
  não há tela de entrada nem cadastro de dono.
