import * as React from 'react'

import { cn } from '#/lib/cn'

/**
 * As cenas que ocupam o lugar da foto enquanto o dono não envia a dele.
 *
 * Foto gerada por IA denuncia o site inteiro, e foto de banco de imagem mente
 * sobre o imóvel, que é o defeito que o grupo de WhatsApp já tem. Então a
 * imagem é desenho: a casa de madeira sobre o rio, o prédio, o quarto. O
 * desenho diz "aqui entra a foto", e não finge ser ela.
 *
 * As cores são tokens (`--sky-*`, `--forest-*`, `--water*`, `--wall`, `--roof`),
 * então dia e noite saem do tema por CSS, sem ler o tema em JavaScript, que
 * desenharia o céu errado no primeiro quadro.
 *
 * Os ids dos degradês saem de `useId`: o mesmo desenho aparece várias vezes na
 * página, e id repetido faz o segundo pintar com o degradê do primeiro.
 */
export const SCENE_KIND = {
  RIVER: 'RIVER',
  PANORAMA: 'PANORAMA',
  HOUSE: 'HOUSE',
  BUILDING: 'BUILDING',
  HOTEL: 'HOTEL',
  BEDROOM: 'BEDROOM',
  BATHROOM: 'BATHROOM',
  KITCHEN: 'KITCHEN',
  LIVING: 'LIVING',
} as const

export type SceneKind = (typeof SCENE_KIND)[keyof typeof SCENE_KIND]

type SceneProps = {
  kind: SceneKind
  label?: string
  className?: string
}

const fill = (token: string): React.CSSProperties => ({ fill: `var(${token})` })

/** O quadro de cada cena. A panorâmica é larga porque a faixa do hero é larga: num quadro quadrado, `slice` mostraria só as estacas. */
const VIEWBOX: Record<SceneKind, { width: number; height: number }> = {
  RIVER: { width: 400, height: 300 },
  PANORAMA: { width: 1200, height: 300 },
  HOUSE: { width: 400, height: 300 },
  BUILDING: { width: 400, height: 300 },
  HOTEL: { width: 400, height: 300 },
  BEDROOM: { width: 400, height: 300 },
  BATHROOM: { width: 400, height: 300 },
  KITCHEN: { width: 400, height: 300 },
  LIVING: { width: 400, height: 300 },
}

function Sky({
  id,
  width = 400,
}: {
  id: string
  width?: number
}): React.JSX.Element {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="scene-sky-top" />
          <stop offset="1" className="scene-sky-bottom" />
        </linearGradient>
      </defs>
      <rect width={width} height="300" fill={`url(#${id})`} />
    </>
  )
}

function Forest({ offset = 0 }: { offset?: number }): React.JSX.Element {
  return (
    <g transform={`translate(${offset} 0)`}>
      <path
        d="M0 190 C40 150 70 170 110 150 S190 160 230 145 S330 165 400 140 V210 H0Z"
        style={fill('--forest-far')}
      />
      <path
        d="M0 210 C50 180 90 200 140 182 S240 196 300 180 S370 190 400 176 V225 H0Z"
        style={fill('--forest-near')}
      />
    </g>
  )
}

function River({ offset = 0 }: { offset?: number }): React.JSX.Element {
  return (
    <g transform={`translate(${offset} 0)`}>
      <rect y="215" width="400" height="85" style={fill('--water')} />
      <path
        d="M0 240 C60 232 120 248 200 240 S340 232 400 242"
        stroke="var(--water-deep)"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M0 268 C70 260 140 276 220 268 S350 262 400 270"
        stroke="var(--water-deep)"
        strokeWidth="3"
        fill="none"
      />
    </g>
  )
}

function Stilts({ x }: { x: number }): React.JSX.Element {
  return (
    <g>
      {[0, 22, 44, 66].map((dx) => (
        <rect
          key={dx}
          x={x + dx}
          y="200"
          width="5"
          height="48"
          style={fill('--stilt')}
        />
      ))}
      <rect x={x - 8} y="196" width="96" height="8" style={fill('--stilt')} />
      <rect x={x} y="150" width="80" height="46" style={fill('--wall')} />
      <path
        d={`M${x - 10} 152 L${x + 40} 118 L${x + 90} 152Z`}
        style={fill('--roof')}
      />
      <rect
        x={x + 12}
        y="164"
        width="16"
        height="18"
        style={fill('--sky-top')}
      />
      <rect x={x + 48} y="164" width="16" height="32" style={fill('--stilt')} />
    </g>
  )
}

function Block({
  floors,
  x,
}: {
  floors: number
  x: number
}): React.JSX.Element {
  const rows = Array.from({ length: floors }, (_, row) => row)
  return (
    <g>
      <rect
        x={x}
        y={230 - floors * 38}
        width="110"
        height={floors * 38}
        style={fill('--wall')}
      />
      <rect
        x={x - 6}
        y={224 - floors * 38}
        width="122"
        height="8"
        style={fill('--roof')}
      />
      {rows.map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={x + 14 + col * 32}
            y={230 - floors * 38 + 10 + row * 38}
            width="18"
            height="22"
            style={fill('--sky-top')}
          />
        )),
      )}
    </g>
  )
}

function Outdoor({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      <Sky id={id} />
      <Forest />
      <River />
      {children}
    </>
  )
}

function Room({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <>
      <rect width="400" height="300" style={fill('--wall')} />
      <rect
        y="230"
        width="400"
        height="70"
        style={fill('--stilt')}
        opacity="0.55"
      />
      <rect x="40" y="40" width="90" height="100" style={fill('--sky-top')} />
      <path d="M85 40 V140 M40 90 H130" stroke="var(--wall)" strokeWidth="4" />
      <linearGradient id={id} />
      {children}
    </>
  )
}

const DRAW: Record<SceneKind, (id: string) => React.JSX.Element> = {
  PANORAMA: (id) => (
    <>
      <Sky id={id} width={1200} />
      {[0, 400, 800].map((offset) => (
        <Forest key={offset} offset={offset} />
      ))}
      {[0, 400, 800].map((offset) => (
        <River key={offset} offset={offset} />
      ))}
      <Stilts x={150} />
      <Stilts x={520} />
      <Stilts x={900} />
    </>
  ),
  RIVER: (id) => (
    <Outdoor id={id}>
      <Stilts x={90} />
      <Stilts x={240} />
    </Outdoor>
  ),
  HOUSE: (id) => (
    <Outdoor id={id}>
      <Stilts x={160} />
    </Outdoor>
  ),
  BUILDING: (id) => (
    <Outdoor id={id}>
      <Block floors={3} x={145} />
    </Outdoor>
  ),
  HOTEL: (id) => (
    <Outdoor id={id}>
      <Block floors={4} x={60} />
      <Block floors={2} x={230} />
    </Outdoor>
  ),
  BEDROOM: (id) => (
    <Room id={id}>
      <rect
        x="170"
        y="170"
        width="190"
        height="60"
        rx="6"
        style={fill('--clay')}
      />
      <rect
        x="170"
        y="150"
        width="60"
        height="30"
        rx="8"
        style={fill('--surface')}
      />
    </Room>
  ),
  BATHROOM: (id) => (
    <Room id={id}>
      <rect
        x="220"
        y="190"
        width="120"
        height="44"
        rx="10"
        style={fill('--surface')}
      />
      <rect
        x="150"
        y="150"
        width="40"
        height="84"
        rx="8"
        style={fill('--surface')}
      />
    </Room>
  ),
  KITCHEN: (id) => (
    <Room id={id}>
      <rect x="150" y="170" width="220" height="64" style={fill('--moss')} />
      <rect x="170" y="140" width="40" height="30" style={fill('--ink-soft')} />
      <rect x="260" y="140" width="60" height="30" style={fill('--surface')} />
    </Room>
  ),
  LIVING: (id) => (
    <Room id={id}>
      <rect
        x="150"
        y="180"
        width="200"
        height="50"
        rx="10"
        style={fill('--moss')}
      />
      <rect
        x="150"
        y="160"
        width="200"
        height="26"
        rx="8"
        style={fill('--moss-deep')}
      />
    </Room>
  ),
}

/**
 * Sem `label` a cena é decorativa e some para o leitor de tela. Com `label` ela
 * vira imagem com nome.
 *
 * `slice` ancora o desenho como o `object-fit: cover` faria: o cartão estreito
 * corta os lados, nunca a casa e o rio.
 */
export function Scene({
  kind,
  label,
  className,
}: SceneProps): React.JSX.Element {
  const id = React.useId()
  const box = VIEWBOX[kind]

  let a11y: React.SVGProps<SVGSVGElement> = { 'aria-hidden': true }
  if (label) a11y = { role: 'img', 'aria-label': label }

  return (
    <svg
      viewBox={`0 0 ${box.width} ${box.height}`}
      preserveAspectRatio="xMidYMax slice"
      className={cn('block size-full', className)}
      {...a11y}
    >
      {DRAW[kind](id)}
    </svg>
  )
}
