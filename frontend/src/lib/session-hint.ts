/**
 * A dica de "há sessão neste navegador", para não perguntar à API quando é certo que
 * não há.
 *
 * O cookie da sessão é `httpOnly`: o JavaScript não o vê, e a única forma de saber se
 * alguém está logado é pedir `GET /account`. Sem a dica, todo visitante anônimo de toda
 * página pública dispararia esse pedido, tomaria 401, tentaria um `refresh` que também
 * tomaria 401 e gastaria o limite de tentativas do `refresh`, tudo para mostrar "Entrar".
 *
 * A dica **não é a sessão**: não autoriza nada, só decide se vale perguntar. Quem diz se
 * há sessão de verdade continua sendo a API. Dica velha (cookie expirou) custa um 401, e
 * a query `accountOptions` a apaga ao receber um; dica faltando (storage limpo) custa um
 * novo login, nunca acesso indevido.
 *
 * Fica na memória também, porque o storage pode lançar (janela privada, dados
 * bloqueados): sem a cópia em memória quem entra nesse navegador nunca passaria do
 * portão. Nunca guarda token nem dado da pessoa, só `1`.
 *
 * A chave leva versão (`:v1`): mudar a forma é trocar a chave.
 */
const KEY = 'aporta:session:v1'

const listeners = new Set<() => void>()

/** `null` até alguém marcar ou limpar nesta aba: aí vale o que o storage disser. */
let memory: boolean | null = null

function readStorage(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    // Storage bloqueado, ou SSR (sem `window`): sem dica.
    return false
  }
}

function writeStorage(value: boolean): void {
  try {
    if (value) {
      window.localStorage.setItem(KEY, '1')
      return
    }

    window.localStorage.removeItem(KEY)
  } catch {
    // Sem storage a dica vive só nesta aba, na memória.
  }
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function hasSessionHint(): boolean {
  return memory ?? readStorage()
}

export function markSessionHint(): void {
  memory = true
  writeStorage(true)
  notify()
}

export function clearSessionHint(): void {
  memory = false
  writeStorage(false)
  notify()
}

/**
 * Para `useSyncExternalStore`. Escuta o evento `storage` para que entrar ou sair em
 * outra aba atualize o cabeçalho desta; o evento só chega de **outra** aba, então a
 * própria aba avisa pelos `listeners`.
 */
export function subscribeSessionHint(listener: () => void): () => void {
  listeners.add(listener)

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== KEY && event.key !== null) return

    // A outra aba mudou o storage: a cópia em memória desta ficou velha.
    memory = null
    listener()
  }

  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
