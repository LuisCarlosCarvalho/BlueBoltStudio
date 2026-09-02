═══════════════════════════════════════════════════════════════════════════════
DESIGN SYSTEM — TOOLS BLUE BOLT
Extraído do código em 01/09/2026 · commit 3196fe3 · tools.bluebolt.pt
═══════════════════════════════════════════════════════════════════════════════

Tudo o que está aqui foi lido do código. Onde não há nada definido, diz-se
"NÃO DEFINIDO" em vez de se preencher com o que costuma existir.

Ficheiros de origem:
    src/index.css ................ 291 linhas — os tokens e as classes da casa
    tailwind.config.ts ............ 91 linhas — o mapeamento para o Tailwind
    src/components/ui/ ............ 49 ficheiros (shadcn/ui)
    src/lib/worklensStatus.ts ..... a fórmula dos crachás semânticos
    src/components/relatorios/RelatorioPDFDocument.tsx — a paleta do PDF

⚠️ src/App.css existe mas NÃO É IMPORTADO em lado nenhum. É o resto do template
   do Vite (o logótipo do React a rodar, #root com max-width 1280px e
   text-align:center). Não faz parte do sistema. Se alguém o importar, parte o
   layout.


═══════════════════════════════════════════════════════════════════════════════
1. TOKENS DE COR
═══════════════════════════════════════════════════════════════════════════════

Todos em HSL sem vírgulas, no formato "H S% L%", consumidos como
hsl(var(--token)). O tema aplica-se pela classe .dark no <html> (next-themes,
attribute="class", storageKey="tema").

⚠️ O TEMA POR OMISSÃO É O ESCURO. defaultTheme="dark" no App.tsx, com o motivo
   escrito: "quem já usa a Tools não vê o ecrã mudar sozinho no dia do deploy".
   O botão da barra lateral cicla dark → light → system.

⚠️ ATÉ 16/08/2026 ERA AO CONTRÁRIO: o :root tinha o escuro e o .dark redefinia
   dois tokens com valores idênticos — era um bloco morto por onde a app nunca
   passava. A troca foi feita ao introduzir os dois temas.

───────────────────────────────────────────────────────────────────────────────
TOKEN                        CLARO (:root)      ESCURO (.dark)     PARA QUE SERVE
───────────────────────────────────────────────────────────────────────────────
--background                 210 40% 98%        222 47% 6%         Fundo da página
--foreground                 222 47% 11%        210 40% 92%        Texto sobre o fundo

--card                       0 0% 100%          222 44% 8%         Fundo dos cartões
--card-foreground            222 47% 11%        210 40% 92%        Texto dentro do cartão

--popover                    0 0% 100%          222 44% 10%        Menus, dropdowns, popovers
--popover-foreground         222 47% 11%        210 40% 92%        Texto dentro deles

--primary                    217 91% 50%        217 91% 60%        Azul da casa: botões, links, foco
--primary-foreground         0 0% 100%          222 47% 6%         Texto sobre o azul

--secondary                  210 40% 96%        222 40% 14%        Superfície secundária, botões calmos
--secondary-foreground       222 47% 11%        210 40% 92%        Texto sobre ela

--muted                      210 40% 96%        222 40% 14%        Fundos apagados, zebra de tabelas
--muted-foreground           215 16% 42%        215 20% 55%        Texto secundário, legendas

--accent                     217 91% 50%        217 91% 60%        Realce (hover de ghost/outline)
--accent-foreground          0 0% 100%          222 47% 6%         Texto sobre o realce

--destructive                0 72% 45%          0 72% 51%          Apagar, erro, perigo
--destructive-foreground     0 0% 100%          210 40% 98%        Texto sobre o vermelho

--border                     214 25% 88%        222 30% 18%        Todas as bordas (aplicado a * )
--input                      214 25% 88%        222 30% 18%        Borda dos campos
--ring                       217 91% 50%        217 91% 60%        Anel de foco do teclado
───────────────────────────────────────────────────────────────────────────────
BARRA LATERAL
--sidebar-background         210 40% 96%        222 47% 5%         Fundo da barra
--sidebar-foreground         215 16% 42%        215 20% 65%        Texto da barra
--sidebar-primary            217 91% 50%        217 91% 60%        Item activo
--sidebar-primary-foreground 0 0% 100%          0 0% 100%          Texto do item activo
--sidebar-accent             214 32% 91%        222 40% 12%        Hover
--sidebar-accent-foreground  222 47% 11%        210 40% 92%        Texto no hover
--sidebar-border             214 25% 88%        222 30% 14%        Borda da barra
--sidebar-ring               217 91% 50%        217 91% 60%        Foco dentro da barra
───────────────────────────────────────────────────────────────────────────────
GRÁFICOS
--chart-1                    217 91% 50%        217 91% 60%        Azul (a série principal)
--chart-2                    160 60% 38%        160 60% 45%        Verde
--chart-3                    30 80% 45%         30 80% 55%         Laranja
--chart-4                    280 65% 50%        280 65% 60%        Roxo
--chart-5                    340 75% 47%        340 75% 55%        Rosa
───────────────────────────────────────────────────────────────────────────────
OUTRO
--glow-blue                  217 91% 50%        217 91% 60%        Cor do brilho (ver secção 4)
--radius                     0.75rem            0.75rem            Raio base (igual nos dois)
───────────────────────────────────────────────────────────────────────────────

AS REGRAS QUE GERARAM O TEMA CLARO (estão escritas no index.css):

  · Mantém-se o MATIZ — 222 nos fundos, 217 no azul. É a identidade.
  · Baixa-se a SATURAÇÃO nos fundos: saturação alta com luminosidade alta fica
    lavada.
  · Preservam-se as RELAÇÕES do escuro: o cartão é mais claro que o fundo
    (elevado) e a barra lateral é mais escura (recuada).

⚠️ O AZUL DO CLARO É 50% E NÃO 60%, E O MOTIVO ESTÁ MEDIDO:
   a 60% o azul dá 3,64:1 sobre branco e chumba o AA para texto normal.
   A 50% dá 5,07:1. Mesmo matiz, mesma saturação, um degrau mais fundo — e só
   no claro.

⚠️ AS CORES DOS GRÁFICOS SÃO MAIS FUNDAS NO CLARO pela mesma razão: a 55–60%
   de luminosidade os traços ficam lavados sobre branco.


═══════════════════════════════════════════════════════════════════════════════
2. TIPOGRAFIA
═══════════════════════════════════════════════════════════════════════════════

FONTE ÚNICA: Inter, do Google Fonts, importada na primeira linha do index.css:

    @import url('https://fonts.googleapis.com/css2?family=Inter:
                 wght@300;400;500;600;700;800&display=swap');

PESOS CARREGADOS: 300, 400, 500, 600, 700, 800. Seis. Não há mais nenhum
disponível — pedir font-black (900) não desenha nada de novo.

APLICAÇÃO, no @layer base do index.css:

    body { font-family: 'Inter', system-ui, sans-serif; }

TAMANHOS E ESCALA: NÃO DEFINIDOS no projecto. O tailwind.config.ts não estende
fontSize nem fontFamily — a escala é a do Tailwind por omissão (text-xs 0.75rem,
text-sm 0.875rem, text-base 1rem, text-lg 1.125rem, e por aí adiante).

O QUE ESTÁ NO TAILWIND CONFIG: nada de tipografia.
O QUE ESTÁ NO CSS: só o @import e o font-family do body.

⚠️ O PDF NÃO USA INTER. O RelatorioPDFDocument.tsx corre no @react-pdf/renderer,
   que não carrega a fonte da web: usa fontFamily "Helvetica" e fontSize 10 como
   base da página. É outro universo tipográfico — ver a secção 6.


═══════════════════════════════════════════════════════════════════════════════
3. ESPAÇAMENTO E RAIOS
═══════════════════════════════════════════════════════════════════════════════

RAIOS — a única variável é --radius: 0.75rem (12px), igual nos dois temas.
O tailwind.config.ts deriva três degraus dela:

    rounded-lg  →  var(--radius)              =  0.75rem  (12px)
    rounded-md  →  calc(var(--radius) - 2px)  =  10px
    rounded-sm  →  calc(var(--radius) - 4px)  =  8px

    rounded-xl e rounded-full continuam a ser os do Tailwind (0.75rem e 9999px)
    — não são derivados do token.

ESCALA DE ESPAÇOS: NÃO DEFINIDA. O tailwind.config.ts não estende `spacing`.
Toda a app usa a escala do Tailwind por omissão (p-2, gap-4, etc.).

AS ÚNICAS CUSTOMIZAÇÕES DE LAYOUT no tailwind.config.ts:

    container.center   = true
    container.padding  = 2rem
    container.screens  = { "2xl": 1400px }     ← o único breakpoint alterado

ANIMAÇÕES: duas, e só para o acordeão.
    accordion-down / accordion-up, 0.2s ease-out, sobre
    --radix-accordion-content-height. Plugin: tailwindcss-animate.


═══════════════════════════════════════════════════════════════════════════════
4. CLASSES DA CASA
═══════════════════════════════════════════════════════════════════════════════

Cinco classes próprias no index.css. Contagem de usos medida no código a
01/09/2026.

───────────────────────────────────────────────────────────────────────────────
.glass-card                                                     237 usos
───────────────────────────────────────────────────────────────────────────────
    @apply bg-card/60 backdrop-blur-xl border border-border/50 rounded-xl;

É o cartão da casa e é a classe mais usada de todas: cartão translúcido a 60%
com desfoque atrás e borda a meia opacidade. Está em @layer utilities.

───────────────────────────────────────────────────────────────────────────────
.glow-blue                                                        3 usos
.glow-blue-sm                                                    46 usos
───────────────────────────────────────────────────────────────────────────────
⚠️ ESTA CLASSE MUDA DE IDIOMA CONFORME O TEMA, e o motivo está escrito:
   "no claro são sombras normais — um halo azul sobre branco não lê como
   elevação, lê como névoa. A elevação faz falta; o que muda é o idioma."

    CLARO (em @layer utilities):
      .glow-blue     box-shadow: 0 8px 24px -8px hsl(222 47% 11% / 0.18),
                                 0 2px 6px -2px  hsl(222 47% 11% / 0.10);
      .glow-blue-sm  box-shadow: 0 2px 8px -2px  hsl(222 47% 11% / 0.14);

    ESCURO (fora do layer, ao fundo do ficheiro):
      .dark .glow-blue     box-shadow: 0 0 20px hsl(var(--primary) / 0.3),
                                       0 0 60px hsl(var(--primary) / 0.1);
      .dark .glow-blue-sm  box-shadow: 0 0 10px hsl(var(--primary) / 0.2);

⚠️ AS VARIANTES DO ESCURO VIVEM FORA DO @layer utilities DE PROPÓSITO. O
   Tailwind só emite as utilitárias que encontra no código, e um selector
   descendente como `.dark .glow-blue` dentro do layer arrisca ser podado no
   build.

───────────────────────────────────────────────────────────────────────────────
.logo-plate                                                      11 usos
───────────────────────────────────────────────────────────────────────────────
    .dark .logo-plate { background: hsl(210 40% 92% / 0.10); border-radius: 22%; }

SÓ EXISTE NO ESCURO. É a "prancheta" por trás do logótipo, e a razão está
medida: o logótipo (16/08/2026) é azul vivo com o raio escuro — a silhueta dá
6,0:1 sobre o fundo claro, que chega sozinho, mas só 3,1:1 sobre o escuro. Passa
o limiar dos 3:1 para gráficos, só que o logótipo antigo dava 15:1 e a perda
notava-se. A prancheta devolve-lhe um limite visível sem um segundo ficheiro de
imagem.

Onde: TermosDeUso.tsx, PoliticaPrivacidade.tsx, AprovacaoCliente.tsx — as
páginas públicas, onde o logótipo aparece isolado.

───────────────────────────────────────────────────────────────────────────────
.scrollbar-nativa                                                 0 usos
.scrollbar-oculta                                                 0 usos
───────────────────────────────────────────────────────────────────────────────
São VÁLVULAS DE FUGA das barras de scroll da casa, e estão escritas em CSS
simples — fora do @layer utilities — precisamente porque ainda não são usadas em
lado nenhum: dentro do layer o Tailwind apagava-as do build, que é o contrário
do que se quer de uma válvula de fuga. A especificidade (0,1,0) ganha ao `*`
(0,0,0) da regra global.

    .scrollbar-nativa  devolve a barra do sistema a um contentor concreto
    .scrollbar-oculta  rola sem barra à vista

───────────────────────────────────────────────────────────────────────────────
AS BARRAS DE SCROLL DA CASA — e a condição que as governa
───────────────────────────────────────────────────────────────────────────────
Tudo o que pinta barras depende do atributo [data-scrollbar="classica"], que o
src/lib/scrollbar.ts põe no <html> depois de MEDIR se as barras desta máquina
ocupam espaço no layout. Medir, não adivinhar o sistema operativo.

⚠️ PORQUE É QUE TUDO DEPENDE DISSO, e não só as regras ::-webkit-:
   `scrollbar-width` NÃO é pintura — é ESPESSURA, e espessura é layout. Medido
   no Chrome 148: `auto` reserva 15px, `thin` reserva 10px. Aplicá-la
   universalmente estreitaria a barra em todo o lado, e num Mac com overlay
   scrollbars faria pior — obrigaria a barra a existir e a ocupar espaço.

CONSEQUÊNCIA ASSUMIDA: num Mac com as barras em overlay (a definição por
omissão), a app fica com as barras do sistema, sem cor da casa. Em Windows, em
Linux, e no Mac de quem já as tem sempre visíveis, fica com as da casa.

Calha transparente, polegar hsl(var(--border)) arredondado a 9999px, 10px de
largura com 2px de borda transparente e background-clip: content-box — o que dá
6px visíveis de polegar dentro da calha de 10. Hover:
hsl(var(--muted-foreground) / 0.5).

───────────────────────────────────────────────────────────────────────────────
OUTRAS REGRAS GLOBAIS NO index.css
───────────────────────────────────────────────────────────────────────────────
    * { @apply border-border; }        todas as bordas herdam o token
    body { @apply bg-background text-foreground; }

    select option { background: hsl(var(--popover));
                    color: hsl(var(--popover-foreground));
                    padding: 8px 12px; }

    Os <select> NATIVOS (6 na app) não herdam o tema pelas classes: o `option` é
    desenhado pelo browser e só obedece a CSS explícito. Nota escrita no
    ficheiro: no macOS o browser desenha o menu à sua maneira e ignora isto.


═══════════════════════════════════════════════════════════════════════════════
5. COMPONENTES
═══════════════════════════════════════════════════════════════════════════════

BIBLIOTECA BASE: shadcn/ui (Radix UI + Tailwind + class-variance-authority).
49 ficheiros em src/components/ui — 48 componentes e um hook (use-toast.ts):

  accordion        alert            alert-dialog     aspect-ratio
  avatar           badge            breadcrumb       button
  calendar         card             carousel         chart
  checkbox         collapsible      command          context-menu
  dialog           drawer           dropdown-menu    form
  hover-card       input            input-otp        label
  menubar          navigation-menu  pagination       popover
  progress         radio-group      resizable        scroll-area
  select           separator        sheet            sidebar
  skeleton         slider           sonner           switch
  table            tabs             textarea         toast
  toaster          toggle           toggle-group     tooltip
                                                     use-toast (hook)

───────────────────────────────────────────────────────────────────────────────
VARIANTES DO BOTÃO (button.tsx)
───────────────────────────────────────────────────────────────────────────────
Base: inline-flex, gap-2, rounded-md, text-sm, font-medium, anel de foco de 2px
na cor --ring com offset, disabled a 50% de opacidade, e os SVG dentro forçados
a size-4 sem eventos de rato.

  variant:  default      bg-primary / hover:bg-primary/90
            destructive  bg-destructive / hover:bg-destructive/90
            outline      border-input + bg-background / hover:bg-accent
            secondary    bg-secondary / hover:bg-secondary/80
            ghost        só hover:bg-accent
            link         text-primary com sublinhado no hover

  size:     default  h-10 px-4 py-2
            sm       h-9  px-3
            lg       h-11 px-8
            icon     h-10 w-10

───────────────────────────────────────────────────────────────────────────────
VARIANTES DO CRACHÁ (badge.tsx)
───────────────────────────────────────────────────────────────────────────────
Base: rounded-full, px-2.5 py-0.5, text-xs, font-semibold, com borda.
  default / secondary / destructive / outline — todas ligadas aos tokens.

───────────────────────────────────────────────────────────────────────────────
PADRÕES PRÓPRIOS (fora do shadcn)
───────────────────────────────────────────────────────────────────────────────
13 componentes soltos em src/components/ e 11 pastas por área (calculadoras,
calendario, clientes, configuracoes, dashboard, landing-pages, ofertas, portal,
portfolio, quality, relatorios).

  AppLayout · AppSidebar · AssistantLayout · ForcePasswordChange ·
  FullscreenLoader · GlobalDelayAlerts · MeetEmailPrompt ·
  MissingAdAccountAlert · NavLink · ScrollHorizontal · Thunder · UserAvatar ·
  WorklensTimerIndicator

Os três com desenho próprio documentado:

• SeletorCliente (src/components/clientes/SeletorCliente.tsx)
  Escolher um cliente sem despejar 110 nomes em cima de ninguém. Abre com os
  clientes de quem está a criar — 9 a 21 para quase toda a gente — e tem uma
  linha "Cliente de outra equipa" que troca para a lista completa. Desenho da
  Filipa (bilhete #46). A lista completa vem da RPC clientes_para_escolher(),
  que devolve só (id, nome): a ficha do cliente continua fechada a quem não é
  da carteira dele. As decisões vivem em src/lib/seletorCliente.ts, com testes,
  porque as duas já falharam em produção (#46 e #53).

• MiniaturaRelatorio (src/components/relatorios/MiniaturaRelatorio.tsx)
  A miniatura de um criativo num relatório. Existe porque os endereços das
  imagens vêm do CDN da Meta, vêm ASSINADOS e expiram: medido a 20/08, os
  endereços recolhidos a 01/08 já devolviam 403 "URL signature expired" — 19
  dias. São 2171 endereços na base. Não arranja a origem; o que faz é deixar de
  mentir, porque um quadrado vazio parece defeito da aplicação e faz a pessoa
  duvidar do resto do relatório. Diz "imagem expirada".

• ScrollHorizontal (src/components/ScrollHorizontal.tsx)
  Contentor que desliza para o lado com a barra também EM CIMA — e a de cima é
  DESENHADA, não nativa. O truque habitual (um div com overflow-x e um espaçador)
  depende de a barra do sistema ocupar espaço no layout, e nesta app isso não se
  pode assumir: num Mac com overlay scrollbars a medida dá zero e a faixa de
  cima teria altura nenhuma. Ficava invisível exactamente para quem já não vê
  barras. A aritmética está em src/lib/barraScroll.ts, com testes.


═══════════════════════════════════════════════════════════════════════════════
6. REGRAS QUE APRENDEMOS
═══════════════════════════════════════════════════════════════════════════════

Isto não é estilo — é o que já partiu uma vez e ficou escrito no código para não
voltar a partir.

───────────────────────────────────────────────────────────────────────────────
6.1 · OS CRACHÁS SEMÂNTICOS TÊM SEMPRE PAR dark:
───────────────────────────────────────────────────────────────────────────────
Os tokens HSL cobrem a estrutura (fundo, texto, borda, primário). Não cobrem o
SIGNIFICADO — "concluído" é verde, "em aprovação" é âmbar. Para isso usa-se a
paleta do Tailwind, e aí a cor tem de ser escolhida DUAS VEZES: um verde que se
lê sobre branco não se lê sobre preto.

A FÓRMULA, documentada em src/lib/devBoard.ts e com a fonte em
src/lib/worklensStatus.ts:

    bg-COR-500/10  text-COR-700  border-COR-500/25
    dark:bg-COR-500/15  dark:text-COR-400  dark:border-COR-500/30

Medida no código: 507 linhas usam este par. Ao todo há 575 ocorrências de
`dark:` na app.

O VOCABULÁRIO EM USO (STATUS_META, worklensStatus.ts):

    slate    A Fazer / To Do          (dark:text-slate-300)
    blue     Em Progresso / Doing
    violet   Aprovação Interna        (dark:text-violet-300)
    amber    Aprovação Cliente
    orange   Stand-by
    emerald  Concluído / Aprovado

⚠️ NOTA: nos tons claros (slate, violet) o par escuro é -300 e não -400. Não é
   descuido — é o que se lê.

⚠️ E UM ESTADO DESCONHECIDO NUNCA REBENTA NEM MENTE: devolve "—" com
   bg-secondary/text-muted-foreground. Antes caíam todos no índice 3, que era
   "CLIENTE NOVO" — um valor que ninguém tinha escrito aparecia como um estado
   real.

───────────────────────────────────────────────────────────────────────────────
6.2 · O DialogContent TEM max-h-[90vh] NA BASE (bilhete #87)
───────────────────────────────────────────────────────────────────────────────
Está na classe base do src/components/ui/dialog.tsx:

    ... w-full max-w-lg max-h-[90vh] overflow-y-auto translate-x-[-50%] ...

O MOTIVO, escrito no ficheiro: dos 46 usos de DialogContent, 8 tinham max-h
próprio — postos à mão, um de cada vez, à medida que cada um partia — e 38 não
tinham nada. Corrigir só o das equipas deixava os outros 37 à espera da vez.

⚠️ OS 8 QUE JÁ SE DEFENDEM CONTINUAM A MANDAR: o cn() usa twMerge, e a classe de
   quem chama ganha à da base. Verificado no browser.

REGRA PRÁTICA: um diálogo novo não precisa de max-h. Já o tem.

───────────────────────────────────────────────────────────────────────────────
6.3 · AS CORES DE MARCA NÃO SEGUEM O TEMA
───────────────────────────────────────────────────────────────────────────────
O azul do Facebook é o azul do Facebook nos dois temas. Estas cores são
identidade de terceiros, não decisão nossa, e por isso ficam em hexadecimal à
mão, fora dos tokens:

    Meta / Facebook   #1877F2
    Instagram         #E1306C
    LinkedIn          #0A66C2
    Google (vermelho) #EA4335
    Google (gradiente do avatar)  #4285F4 → #34A853 → #FBBC05

Onde vivem: Planificacao.tsx (crachás de canal), PlatformsSection.tsx (cartões
de plataforma), GoogleAdsSection.tsx (o avatar do Google), e a paleta do PDF.

⚠️ Não as passar a tokens. Um Meta "adaptado ao tema" deixa de ser o Meta.

───────────────────────────────────────────────────────────────────────────────
6.4 · O PDF VIVE FORA DO TEMA, E É SEMPRE ESCURO
───────────────────────────────────────────────────────────────────────────────
O RelatorioPDFDocument.tsx corre no @react-pdf/renderer, que não lê CSS nem
variáveis: tem uma paleta própria em hexadecimal, marcada no ficheiro como
"DARK THEME". Não segue o tema de quem exporta — um relatório exportado no tema
claro sai escuro à mesma.

    fundos     #070A14 (página) · #0B101C · #0F1626 (cartões) ·
               #152038 (cabeçalho de tabela) · #1B2942
    bordas     #1F2A44 · #2E3D5F
    texto      #F4F6FB · #C3CADC · #8694B4 (apagado)
    primário   #3B82F6 · #1E3A8A · #60A5FA
    semântica  verde #22C55E · âmbar #F59E0B · vermelho #EF4444 ·
               roxo #A855F7 · rosa #EC4899 · ciano #06B6D4
    marca      Meta/FB #1877F2 · IG #E1306C · Google #EA4335
    página     padding 32 (50 em baixo), fontSize 10, fontFamily Helvetica

⚠️ Mudar um token do index.css NÃO muda o PDF. São dois sistemas, e quem mexer
   num tem de decidir conscientemente se mexe no outro.

───────────────────────────────────────────────────────────────────────────────
6.5 · O LOGÓTIPO LEVA PRANCHETA SÓ NO ESCURO
───────────────────────────────────────────────────────────────────────────────
Ver a secção 4. A regra em uma linha: um logótipo azul vivo dá 6,0:1 sobre o
fundo claro e 3,1:1 sobre o escuro. No escuro leva .logo-plate; no claro não
leva nada.

───────────────────────────────────────────────────────────────────────────────
6.6 · O QUE TEM DE FICAR FORA DO @layer utilities
───────────────────────────────────────────────────────────────────────────────
O Tailwind só emite as utilitárias que encontra escritas no código. Duas
famílias de regras não sobrevivem lá dentro e por isso estão em CSS simples:

    · selectores descendentes — .dark .glow-blue, .dark .logo-plate
    · classes ainda sem uso    — .scrollbar-nativa, .scrollbar-oculta

Está escrito nos três sítios. Quem lá mexer e as "arrumar" para dentro do layer
apaga-as do build sem erro nenhum a avisar.

═══════════════════════════════════════════════════════════════════════════════
FIM
═══════════════════════════════════════════════════════════════════════════════
