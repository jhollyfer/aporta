# Documento de requisitos

**Aporta** · plataforma web de moradia e guia da cidade de Benjamin Constant/AM, para quem chega (calouros da UFAM, servidores, trabalhadores de outros municípios, viajantes e turistas) e para quem tem imóvel para anunciar

| Versão | Status | Data | Dono do produto | Meta |
|---|---|---|---|---|
| 1.0 | Rascunho | 2026-11-01 | Jhollyfer Rodrigues | Data de lançamento ainda não definida (pergunta aberta no §8) |

> Escopo é decisão do dono do produto. O agente não altera este arquivo sem pedido; viu
> contradição entre a tarefa e o PRD, pergunta.

## 1. Problema

Todo ano chegam a Benjamin Constant, no Alto Solimões, calouros da UFAM, servidores e trabalhadores de outros municípios. Hoje eles acham onde morar pelo boca a boca e por grupos de WhatsApp, onde o anúncio some na rolagem, o valor não diz o que está incluso e não há como saber se o dono é de confiança. Do outro lado, quem se forma vai embora e deixa casas e kitnets vazias sem que ninguém saiba que estão disponíveis. Além do universitário, o turista e o viajante também não têm um lugar único para achar hospedagem e saber onde comer e o que acontece na cidade, principalmente no festival dos bois-bumbás.

## 2. Para quem

| Perfil | Quem é | O que precisa |
|---|---|---|
| Calouro e universitário | quem chega para estudar na UFAM, quase sempre de fora da cidade | achar casa, kitnet ou quarto por bairro, preço e período (semestre, ano letivo), sabendo o que o valor inclui |
| Servidor e trabalhador | quem é lotado ou contratado em Benjamin Constant | aluguel mensal, com contato direto com o dono |
| Turista e viajante | quem vem pelo festival dos bois-bumbás, pelo turismo ou de passagem | hotel ou diária, e o guia da cidade (Comer, Beber, Eventos, Serviços úteis) |
| Dono de imóvel | quem tem casa, apartamento, kitnet, quarto ou hotel para alugar | anunciar sem esforço, receber contato direto pelo WhatsApp e não ficar com o imóvel parado sem divulgação |
| Equipe (moderador e administrador) | quem cuida da qualidade da plataforma | revisar anúncios, arquivar golpe e manter o guia |

## 3. Objetivos

- Reunir num lugar só os imóveis e hotéis de Benjamin Constant, filtráveis por preço, bairro, período e tipo.
- Levar o visitante ao dono em um toque: o botão principal é "Chamar no WhatsApp", sem chat interno.
- Dar confiança antes do contato: selo "dono verificado", "atualizado há X dias", valores transparentes (água, luz e internet inclusos ou não) e fotos por ambiente.
- Reduzir golpe e anúncio parado por moderação e por prazo de atualização.
- Funcionar em celular com internet lenta, em pt-BR, es e en.

Meta numérica ainda não definida pelo dono: ver §7 e §8.

## 4. Primeira versão (MVP)

A coluna "Estado" diz o que existe no repositório em 2026-11-02.

| # | Funcionalidade | Para quem | Fluxo | Estado |
|---|---|---|---|---|
| 1 | Busca e listagem de imóveis com filtros na URL (tipo, bairro, período, faixa de preço), mapa de apoio e alternância lista/mapa no celular | visitante | `USER-FLOWS.md#procuro-onde-morar` | Pronto, lendo a API com catálogo de exemplo |
| 2 | Página do imóvel: galeria por ambiente, valores com o que está incluso, regras, dono e "Chamar no WhatsApp" | visitante | `USER-FLOWS.md#procuro-onde-morar` | Pronto, lendo a API com catálogo de exemplo |
| 3 | Guia da cidade em quatro abas (Comer, Beber, Eventos, Serviços úteis) | turista, calouro | `USER-FLOWS.md#guia-da-cidade` | Pronto, lendo a API com catálogo de exemplo |
| 4 | Cadastro do imóvel pelo dono, em seis etapas, com progresso e rascunho salvo | dono | `USER-FLOWS.md#tenho-um-imóvel-para-anunciar` | Formulário pronto; o envio não grava nada |
| 5 | API de anúncios, bairros e guia | todos | `USER-FLOWS.md#procuro-onde-morar` | Leitura pública pronta (`GET /storefront`); a escrita do dono não existe |
| 6 | Entrada e área do dono (Meus anúncios) | dono | `USER-FLOWS.md#tenho-um-imóvel-para-anunciar` | Não existe na tela; a sessão existe na API |
| 7 | Upload de fotos por ambiente | dono | `USER-FLOWS.md#tenho-um-imóvel-para-anunciar` | Upload da API pronto, só para a equipe; a tela não envia |
| 8 | Verificação do dono e moderação de anúncio | equipe | `USER-FLOWS.md#moderação-futura` | Não existe |
| 9 | Português, espanhol e inglês | todos | | Pronto na tela (165 mensagens por idioma) |

## 5. Fica de fora (nesta versão)

- Chat interno: o contato é só o WhatsApp, por decisão (`DECISIONS.md` #7).
- Pagamento, reserva e contrato pela plataforma: o Aporta aproxima as partes, e o acerto é entre elas.
- Conta de visitante, favoritos e alertas de novo anúncio: o briefing não pede, e a busca não exige login.
- Aplicativo nativo de celular: o site é responsivo, com a mesma qualidade em celular, tablet e desktop.
- Avaliação e nota de imóvel ou de dono: não pedido; a confiança vem do selo, da data de atualização e da moderação.
- Painel da equipe com telas próprias: ainda não definido; depende da resposta à pergunta de quem modera (§8).

## 6. Requisitos não funcionais

| Tema | Requisito |
|---|---|
| Desempenho | Leve e utilizável com internet lenta. Orçamento numérico (peso da página, tempo até o conteúdo) ainda não definido: pergunta aberta no §8 |
| Disponibilidade | Site público sempre que o deploy estiver de pé; o healthcheck do app não depende da API (`ARCHITECTURE.md` §9.1) |
| Acessibilidade | WCAG 2.1 AA nas telas públicas (`DESIGN.md` §10); há uma falha conhecida no tema escuro (`MEMORY.md`, "Problemas conhecidos") |
| Dispositivos | Responsivo em todos os tamanhos (celular, tablet e desktop), cada um com o seu arranjo; mapa e lista se alternam em tela estreita e ficam lado a lado a partir de `lg` |
| Idiomas | pt-BR (base, sem prefixo na URL), es e en (`/es/...`, `/en/...`) |
| Busca e compartilhamento | Filtros, aba do guia e vista lista/mapa na URL, para o link mandado por WhatsApp abrir igual; `sitemap.xml` e `robots.txt` existem |
| Dados pessoais | Nome, WhatsApp e e-mail do dono e a conta de quem opera. O rascunho do cadastro fica no aparelho do dono. Detalhe em `SECURITY.md` §8 |

## 7. Métricas de sucesso

Só entram métricas que a equipe consegue medir com o que o sistema registra ou passará a registrar. Não há medição hoje: a API só lê o catálogo de exemplo, sem anúncio real, e nenhuma meta numérica foi dada pelo dono.

| Métrica | Hoje | Meta | Como medir |
|---|---|---|---|
| Anúncios ativos | sem dado (só o catálogo de exemplo) | a definir pelo dono | contagem no banco, por bairro e tipo |
| Anúncios com dono verificado | sem dado | a definir pelo dono | proporção sobre os ativos, quando a verificação existir |
| Anúncios atualizados nos últimos 30 dias | sem dado | a definir pelo dono | data de atualização do anúncio, a mesma que o selo "atualizado há X dias" exibe |
| Anúncios com as cinco fotos por ambiente | sem dado | a definir pelo dono | contagem das fotos por ambiente de cada anúncio |
| Tempo da submissão até a decisão da moderação | sem dado | a definir pelo dono | diferença entre as datas de criação e de decisão |
| Toques em "Chamar no WhatsApp" por anúncio | sem dado | a definir pelo dono | exige registrar o toque (decisão de medição e de privacidade em aberto, §8) |

## 8. Perguntas em aberto

- [ ] Quem verifica o dono e como: documento, visita, confirmação por WhatsApp, indicação da UFAM? O selo "dono verificado" depende disso. Quem responde: dono do produto.
- [ ] Política de anúncio parado: depois de quantos dias sem atualização o anúncio perde o selo, sai do ar ou pede confirmação ao dono? A tela já mostra "atualizado há X dias". Quem responde: dono do produto.
- [ ] Qual o número de WhatsApp institucional do Aporta (denúncia de golpe, suporte ao dono) e onde ele aparece? Quem responde: dono do produto.
- [x] A moderação é antes de publicar (`DECISIONS.md` #14). Falta definir quem compõe a equipe (ADMINISTRATOR e MODERATOR). Quem responde: dono do produto.
- [x] Como a conta de dono (`OWNER`) nasce: cadastro aberto, sem confirmação de e-mail por enquanto (`DECISIONS.md` #12). Reabrir quando houver provedor de e-mail.
- [ ] Quem confere os bairros e as coordenadas? Os seis bairros e os pontos do mapa são aproximados. Quem responde: quem conhece a cidade, indicado pelo dono.
- [ ] Quem fotografa os imóveis e qual o tamanho máximo de uma foto? O teto atual de upload (`UPLOAD_MAX_SIZE`, 1 GiB) vale para qualquer arquivo e é alto demais para foto de anúncio. Quem responde: dono do produto.
- [ ] Os dez lugares do guia são exemplos. Quem cura o guia e com que frequência atualiza, principalmente as datas do festival dos bois-bumbás? Quem responde: dono do produto.
- [ ] Podemos registrar o toque em "Chamar no WhatsApp" para medir contato? Com qual ferramenta, respeitando a LGPD? Quem responde: dono do produto.
- [ ] Qual o e-mail de segurança e o prazo de resposta a uma vulnerabilidade (`SECURITY.md` §1)? Quem responde: dono do produto.
- [ ] Qual o orçamento de desempenho para internet lenta e qual a data de lançamento? Quem responde: dono do produto.

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-11-01 | Primeira versão, a partir do briefing do dono e do estado do código |
