import * as React from 'react'
import { Controller } from 'react-hook-form'
import type { Control, FieldValues, Path } from 'react-hook-form'

import {
  CONTROL,
  Field,
  errorId,
  hintId,
  invalidProps,
} from '#/components/common/field'

type TextFieldProps<TValues extends FieldValues> = {
  control: Control<TValues>
  name: Path<TValues>
  label: string
  hint?: string
  type: 'text' | 'email' | 'password'
  /** Os valores que o navegador e o gerenciador de senhas entendem: o que cada campo é. */
  autoComplete: 'name' | 'email' | 'current-password' | 'new-password'
}

/** O que o teclado do celular e o corretor precisam saber de cada tipo de campo. */
const INPUT_TRAITS = {
  text: { autoCapitalize: 'words', spellCheck: true },
  email: { autoCapitalize: 'none', spellCheck: false, inputMode: 'email' },
  password: { autoCapitalize: 'none', spellCheck: false },
} as const

/**
 * Um campo de texto do formulário de conta: rótulo, dica, controle e erro ligados
 * por `Field`, `invalidProps` e `errorId`. O `id` é o `name` do campo, e o erro e a
 * dica são apontados por `aria-describedby` (o leitor de tela lê os dois).
 *
 * Genérico no formulário para os dois (entrar e criar conta) usarem o mesmo campo. O
 * valor é lido por narrowing: o RHF tipa `field.value` pelo caminho, e aqui todo
 * campo é texto.
 */
export function TextField<TValues extends FieldValues>({
  control,
  name,
  label,
  hint,
  type,
  autoComplete,
}: TextFieldProps<TValues>): React.JSX.Element {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        let value = ''
        if (typeof field.value === 'string') value = field.value

        const describedBy = [
          hint !== undefined && hintId(name),
          fieldState.invalid && errorId(name),
        ]
          .filter((id) => typeof id === 'string')
          .join(' ')

        return (
          <Field
            label={label}
            htmlFor={name}
            hint={hint}
            error={fieldState.error?.message}
          >
            <input
              id={name}
              name={field.name}
              ref={field.ref}
              value={value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              type={type}
              autoComplete={autoComplete}
              {...INPUT_TRAITS[type]}
              {...invalidProps(fieldState.invalid, name)}
              aria-describedby={describedBy || undefined}
              className={CONTROL}
            />
          </Field>
        )
      }}
    />
  )
}
