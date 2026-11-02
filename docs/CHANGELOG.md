# Changelog

Mudanças de Aporta que quem usa percebe. Formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versões em
[SemVer](https://semver.org/lang/pt-BR/). Regras em `_standards/documentation.md` §7.

Ainda não houve release nem tag: tudo abaixo está na branch de trabalho e acumula em
`[Não lançado]`. Os imóveis, lugares, bairros e telefones que o site mostra vêm do banco, mas o
catálogo semeado é de exemplo (telefones fictícios, coordenadas aproximadas).

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

- O site agora lê imóveis, bairros e guia da API, e não mais de dados de exemplo embutidos: a home, a
  listagem, o detalhe, o guia e o `sitemap.xml` mostram o que está no banco. A faixa de preço passou
  a ser calculada no servidor, com a diária do hotel valendo 30 vezes. A listagem e o mapa mostram até
  100 anúncios.
- Quando a API está fora do ar, a página mostra "Algo deu errado" com "Tentar de novo", que refaz o
  carregamento. Anúncio que não existe continua dando a página 404 do site, e um bairro desconhecido
  no endereço mostra a lista vazia com "Limpar".
- O `sitemap.xml` passa a listar cada anúncio publicado nos três idiomas. Se a API não responder, sai
  só com as páginas fixas e não fica em cache.

### Corrigido

- O último passo do cadastro não diz mais "Anúncio recebido", porque nada era enviado. O botão agora
  é "Finalizar cadastro", a tela mostra "Anúncio pronto", avisa que o envio de anúncios ainda não
  está no ar e mantém o rascunho salvo neste aparelho.

### Segurança

- A denúncia pública tem limite por IP e guarda só um hash do IP.
- Contas entram por sessão em cookie protegido, com limite de tentativas de senha e de cadastro por
  IP. Os cookies levam o nome do Aporta para não se misturar com os de outros sites da casa.
