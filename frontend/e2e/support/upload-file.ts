/** Um arquivo em memória no formato que `setInputFiles` aceita. */
export type E2eUploadFile = { name: string; mimeType: string; buffer: Buffer }

/**
 * Os arquivos que os specs de envio de foto escolhem. Nada em disco: o conteúdo nasce na hora, e
 * o nome é o que distingue uma foto da outra (a identidade da escolha é nome, tamanho e data,
 * `resumeKey`).
 */
export class E2eUploadFiles {
  /** Um PNG de 1 pixel, válido de verdade: o bucket e a API aceitam sem tocar no arquivo. */
  private static readonly PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  static png(name: string): E2eUploadFile {
    return { name, mimeType: 'image/png', buffer: E2eUploadFiles.PNG }
  }

  /** Um arquivo que não é imagem. */
  static text(name: string): E2eUploadFile {
    return {
      name,
      mimeType: 'text/plain',
      buffer: Buffer.from('isto não é uma foto'),
    }
  }

  /** Uma "imagem" de `bytes` bytes: só o tamanho importa para a recusa pelo teto. */
  static oversized(name: string, bytes: number): E2eUploadFile {
    return { name, mimeType: 'image/png', buffer: Buffer.alloc(bytes) }
  }
}
