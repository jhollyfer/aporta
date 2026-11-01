import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { HttpContext } from '@adonisjs/core/http'
import { Logger } from '@adonisjs/core/logger'
import { test } from '@japa/runner'

import ContainerBindingsMiddleware from '#middleware/container-bindings.middleware'

/**
 * What the middleware promises: whoever asks the request container for `HttpContext` or `Logger`
 * receives THIS request's context and logger, and not a new
 * instance. It is what lets a controller with `@inject()` receive the
 * context through the constructor.
 */
test.group('container-bindings middleware', () => {
  test('when the request runs through it, the resolver gives back the request context and logger', async ({
    assert,
  }) => {
    const ctx = new HttpContextFactory().create()
    let reached = false

    await new ContainerBindingsMiddleware().handle(ctx, () => {
      reached = true
    })

    assert.isTrue(reached)
    assert.strictEqual(await ctx.containerResolver.make(HttpContext), ctx)
    assert.strictEqual(await ctx.containerResolver.make(Logger), ctx.logger)
  })

  test('when two requests run through it, each resolver sees its own context', async ({
    assert,
  }) => {
    const first = new HttpContextFactory().create()
    const second = new HttpContextFactory().create()
    const middleware = new ContainerBindingsMiddleware()

    await middleware.handle(first, async () => {})
    await middleware.handle(second, async () => {})

    assert.strictEqual(await first.containerResolver.make(HttpContext), first)
    assert.strictEqual(await second.containerResolver.make(HttpContext), second)
  })
})
