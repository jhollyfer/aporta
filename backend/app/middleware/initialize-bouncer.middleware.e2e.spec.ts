import { Bouncer } from '@adonisjs/bouncer'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { test } from '@japa/runner'

import InitializeBouncerMiddleware from '#middleware/initialize-bouncer.middleware'
import UserPolicy from '#policies/user.policy'
import { actorDraft, userDraft } from '#tests/user-fixtures'

/**
 * The request's Bouncer reads the context `actor` lazily: the
 * middleware runs BEFORE `middleware.auth()`, which is what builds the `actor`.
 * If it read the `actor` at construction, every check would see `undefined`.
 */
test.group('initialize-bouncer middleware', () => {
  test('when it runs, ctx.bouncer is a Bouncer and the next handler is called', async ({
    assert,
  }) => {
    const ctx = new HttpContextFactory().create()
    let reached = false

    await new InitializeBouncerMiddleware().handle(ctx, () => {
      reached = true
    })

    assert.isTrue(reached)
    assert.instanceOf(ctx.bouncer, Bouncer)
  })

  test("when the actor is set after it runs, the policy decides on that actor's account", async ({
    assert,
  }) => {
    const ctx = new HttpContextFactory().create()
    await new InitializeBouncerMiddleware().handle(ctx, async () => {})
    const target = userDraft()

    ctx.actor = actorDraft({ id: target.id })

    const policy = ctx.bouncer.with(UserPolicy)
    assert.isFalse(await policy.allows('archive', target))
    assert.isTrue(await policy.allows('archive', userDraft()))
  })
})
