/** O `id` do erro de um campo: o que `aria-describedby` do controle aponta. */
export function errorId(name: string): string {
  return `${name}-error`
}

/** O `id` da dica de um campo. */
export function hintId(name: string): string {
  return `${name}-hint`
}

/** As props de acessibilidade do controle: inválido e a quem apontar para o erro. */
export function invalidProps(
  invalid: boolean,
  name: string,
): { 'aria-invalid': boolean; 'aria-describedby': string | undefined } {
  let describedBy: string | undefined
  if (invalid) describedBy = errorId(name)

  return { 'aria-invalid': invalid, 'aria-describedby': describedBy }
}
