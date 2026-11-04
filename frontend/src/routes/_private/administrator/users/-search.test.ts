import { describe, expect, it } from 'vitest'

import { ACTIVE_STATUS, USER_ROLE } from '@aporta/shared'

import { USERS_PER_PAGE, toUsersParams, usersSearchSchema } from './-search'

describe('usersSearchSchema', () => {
  it('aceita o papel, o status, a página e a busca', () => {
    expect(
      usersSearchSchema.parse({
        role: USER_ROLE.MODERATOR,
        status: ACTIVE_STATUS.INACTIVE,
        page: 2,
        q: ' ana ',
      }),
    ).toEqual({
      role: USER_ROLE.MODERATOR,
      status: ACTIVE_STATUS.INACTIVE,
      page: 2,
      q: 'ana',
    })
  })

  it('descarta o que veio errado em vez de falhar', () => {
    expect(
      usersSearchSchema.parse({ role: 'ROOT', status: 'BANIDA', page: 0 }),
    ).toEqual({ role: undefined, status: undefined, page: undefined })
  })
})

describe('toUsersParams', () => {
  it('leva os filtros à API com a busca em `search` e o tamanho da página', () => {
    expect(
      toUsersParams({
        role: USER_ROLE.OWNER,
        status: ACTIVE_STATUS.ACTIVE,
        page: 3,
        q: 'maria',
      }),
    ).toEqual({
      role: USER_ROLE.OWNER,
      status: ACTIVE_STATUS.ACTIVE,
      page: 3,
      search: 'maria',
      perPage: USERS_PER_PAGE,
    })
  })

  it('sem filtro, não manda papel nem status', () => {
    const params = toUsersParams({})

    expect(params.role).toBeUndefined()
    expect(params.status).toBeUndefined()
  })
})
