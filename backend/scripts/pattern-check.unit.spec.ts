import { test } from '@japa/runner'

import {
  applyRules,
  applyTemporaryExceptions,
  checkActionFolder,
  checkActorName,
  checkBouncerRequired,
  checkClassName,
  checkDepcruiseExceptions,
  checkFeatureModelImport,
  checkUseCaseShape,
  stripComments,
} from './pattern-check.ts'

test.group('pattern:check > rules', () => {
  test('when a comment is stripped, vanishes without changing the line count', ({
    assert,
  }) => {
    const source =
      "/**\n * throw HTTPException.NotFound()\n */\nconst url = 'http://x'\n// fim\n"
    const clean = stripComments(source)

    assert.notInclude(clean, 'throw')
    assert.include(clean, "'http://x'")
    assert.equal(clean.split('\n').length, source.split('\n').length)
  })

  test('when an action is outside the action folder, is a §1.2 finding', ({
    assert,
  }) => {
    const [finding] = checkActionFolder(
      'app/features/administrator/users/archive.controller.ts',
    )

    assert.equal(finding?.rule, 'action-outside-folder')
    assert.equal(finding?.section, '1.2')
    assert.deepEqual(
      checkActionFolder(
        'app/features/administrator/users/archive/archive.controller.ts',
      ),
      [],
    )
  })

  test('when a class does not derive from the path, is a §3 finding', ({
    assert,
  }) => {
    const path =
      'app/features/administrator/users/archive/archive.controller.ts'
    const [finding] = checkClassName(
      path,
      'export default class UserArchiveController {}',
    )

    assert.equal(finding?.rule, 'class-name')
    assert.include(finding?.message ?? '', 'AdministratorUserArchiveController')
    assert.deepEqual(
      checkClassName(
        path,
        'export default class AdministratorUserArchiveController {}',
      ),
      [],
    )
  })

  test('when the use-case has a business-failure `throw`, is a §4.2 finding', ({
    assert,
  }) => {
    const path = 'app/features/administrator/users/show/show.use-case.ts'
    const findings = applyRules(
      path,
      "throw HTTPException.NotFound('x', 'Y')\n",
    )

    assert.deepEqual(
      findings.map((finding) => finding.rule),
      ['throw-in-use-case'],
    )
  })

  test('when a use-case has no `type Response`, is a finding, and a template method subclass is not', ({
    assert,
  }) => {
    const path = 'app/features/administrator/users/show/show.use-case.ts'

    assert.deepEqual(
      checkUseCaseShape(
        path,
        'export default class X {\n  async execute() {}\n}\n',
      ).map((finding) => finding.rule),
      ['use-case-without-response'],
    )
    assert.deepEqual(
      checkUseCaseShape(
        path,
        'export default class X extends AdministratorArchiveUseCase<User> {}',
      ),
      [],
    )
  })

  test('when a domain imports a model, HTTPException or framework, is a §1.3 finding', ({
    assert,
  }) => {
    const path = 'app/domain/testimonial/testimonial.entity.ts'
    const rules = (source: string) =>
      applyRules(path, source).map((finding) => finding.rule)

    assert.deepEqual(rules("import Testimonial from '#models/testimonial'\n"), [
      'domain-imports-layer',
    ])
    assert.deepEqual(
      rules("import HTTPException from '#exceptions/http.exception'\n"),
      ['domain-imports-layer'],
    )
    assert.deepEqual(rules("import { inject } from '@adonisjs/core'\n"), [
      'domain-imports-layer',
    ])
    assert.deepEqual(rules("import { left } from '@aporta/shared'\n"), [])
    assert.deepEqual(
      applyRules(
        'app/domain/testimonial/testimonial.unit.spec.ts',
        "import { test } from '@japa/runner'\nimport x from '@adonisjs/core'\n",
      ),
      [],
    )
  })

  test('when a repository imports a feature or service, is a §1.3 finding', ({
    assert,
  }) => {
    const path = 'app/repositories/testimonial/testimonial.lucid.repository.ts'
    const rules = (source: string) =>
      applyRules(path, source).map((finding) => finding.rule)

    assert.deepEqual(
      rules("import X from '#services/storage/storage.contract'\n"),
      ['repository-imports-layer'],
    )
    assert.deepEqual(
      rules("import { sortOrder } from '#features/_shared.sort'\n"),
      ['repository-imports-layer'],
    )
    assert.deepEqual(
      rules("import Testimonial from '#models/testimonial'\n"),
      [],
    )
  })

  test('when `*OrFail()` is in a use-case and in a repository, is a §4.2 finding', ({
    assert,
  }) => {
    assert.deepEqual(
      applyRules(
        'app/repositories/testimonial/testimonial.lucid.repository.ts',
        'await TestimonialModel.findOrFail(id)\n',
      ).map((finding) => finding.rule),
      ['or-fail-in-use-case'],
    )
    assert.deepEqual(
      applyRules(
        'app/features/account/profile/show/show.controller.ts',
        'context.auth.getUserOrFail()\n',
      ),
      [],
    )
  })

  test('when a feature imports a model or Lucid, is a §1.3 finding; the spec is not', ({
    assert,
  }) => {
    const sources = new Map([
      [
        'app/features/administrator/testimonials/show/show.use-case.ts',
        "import Testimonial from '#models/testimonial'\n",
      ],
      [
        'app/features/administrator/notices/show/show.use-case.ts',
        "import type { ModelObject } from '@adonisjs/lucid/types/model'\n",
      ],
      [
        'app/features/administrator/testimonials/show/show.e2e.spec.ts',
        "import Storage from '#models/storage'\n",
      ],
    ])

    const findings = checkFeatureModelImport(sources)

    assert.deepEqual(
      findings.map((finding) => [finding.rule, finding.file]),
      [
        [
          'feature-imports-model',
          'app/features/administrator/testimonials/show/show.use-case.ts',
        ],
        [
          'feature-imports-model',
          'app/features/administrator/notices/show/show.use-case.ts',
        ],
      ],
    )
  })

  test('when a feature imports the repository implementation, is a §1.3 finding, except the unit test', ({
    assert,
  }) => {
    const source =
      "import X from '#repositories/testimonial/testimonial.memory.repository'\n"

    assert.deepEqual(
      applyRules(
        'app/features/administrator/testimonials/show/show.use-case.ts',
        source,
      ).map((finding) => finding.rule),
      ['feature-imports-implementation'],
    )
    assert.deepEqual(
      applyRules(
        'app/features/administrator/testimonials/show/show.unit.spec.ts',
        source,
      ),
      [],
    )
  })
})

test.group('pattern:check > HTTP edge and authorization', () => {
  const controller = 'app/features/administrator/users/show/show.controller.ts'

  test('when a controller reads raw body, query or params, it reports raw-input-in-controller', ({
    assert,
  }) => {
    const rules = (source: string) =>
      applyRules(controller, source).map((finding) => finding.rule)

    assert.deepEqual(rules('await V.validate(context.request.body())\n'), [
      'raw-input-in-controller',
    ])
    assert.deepEqual(rules('const q = ctx.request.qs()\n'), [
      'raw-input-in-controller',
    ])
    assert.deepEqual(rules('const p = context.request.params()\n'), [
      'raw-input-in-controller',
    ])
    assert.deepEqual(rules('await V.validate(context.params)\n'), [
      'raw-input-in-controller',
    ])
  })

  test('when a controller uses validateUsing, it reports nothing', ({
    assert,
  }) => {
    assert.deepEqual(
      applyRules(
        controller,
        'await context.request.validateUsing(V, { data: context.params })\n',
      ),
      [],
    )
  })

  test('when a controller spreads the raw body, it reports only raw-body-spread', ({
    assert,
  }) => {
    assert.deepEqual(
      applyRules(controller, 'execute({ ...context.request.body() })\n').map(
        (finding) => finding.rule,
      ),
      ['raw-body-spread'],
    )
  })

  test('when a repository throws, it reports throw-in-repository; a spec does not', ({
    assert,
  }) => {
    const path = 'app/repositories/user/user.lucid.repository.ts'

    assert.deepEqual(
      applyRules(path, "throw new Error('x')\n").map((finding) => finding.rule),
      ['throw-in-repository'],
    )
    assert.deepEqual(
      applyRules(
        'app/repositories/user/user.contract.spec.ts',
        "throw new Error('x')\n",
      ),
      [],
    )
  })

  test('when a repository or use-case rejects a promise, it reports the throw rule', ({
    assert,
  }) => {
    assert.deepEqual(
      applyRules(
        'app/repositories/user/user.lucid.repository.ts',
        'return Promise.reject(error)\n',
      ).map((finding) => finding.rule),
      ['throw-in-repository'],
    )
    assert.deepEqual(
      applyRules(
        'app/features/administrator/users/show/show.use-case.ts',
        'return Promise.reject(error)\n',
      ).map((finding) => finding.rule),
      ['throw-in-use-case'],
    )
  })

  test('when a use-case throws anything, it reports throw-in-use-case', ({
    assert,
  }) => {
    assert.deepEqual(
      applyRules(
        'app/features/administrator/users/show/show.use-case.ts',
        "throw new TypeError('x')\n",
      ).map((finding) => finding.rule),
      ['throw-in-use-case'],
    )
  })

  test('when the Payload names the actor differently, it reports actor-renamed', ({
    assert,
  }) => {
    const path = 'app/features/administrator/users/show/show.use-case.ts'
    const [finding] = checkActorName(
      path,
      'type Payload = {\n  id: string\n  userId: string\n}\n\ntype Response = Either<A, B>\n',
    )

    assert.equal(finding?.rule, 'actor-renamed')
    assert.equal(finding?.section, '4.3')
    assert.deepEqual(
      checkActorName(
        path,
        'type Payload = {\n  id: string\n  actor: User\n}\n\ntype Response = Either<A, B>\n',
      ),
      [],
    )
  })

  test('when a bouncerRequired controller lacks ctx.bouncer or does not exist, it reports it', ({
    assert,
  }) => {
    const entries = [
      { file: 'app/a.controller.ts', reason: 'a' },
      { file: 'app/b.controller.ts', reason: 'b' },
      { file: 'app/c.controller.ts', reason: 'c' },
    ]
    const sources = new Map([
      ['app/a.controller.ts', 'context.bouncer.with(P).execute("x", 1)'],
      ['app/b.controller.ts', 'return context.response.ok({})'],
    ])

    assert.deepEqual(
      checkBouncerRequired(entries, sources).map((finding) => [
        finding.rule,
        finding.file,
      ]),
      [
        ['bouncer-required', 'app/b.controller.ts'],
        [
          'bouncer-required-without-controller',
          'scripts/pattern-check.config.ts',
        ],
      ],
    )
  })
})

test.group('pattern:check > temporary exceptions', () => {
  const finding = {
    file: 'app/x.controller.ts',
    line: 3,
    rule: 'raw-input-in-controller',
    section: '4.1',
    message: 'm',
  }

  test('when a finding matches a temporary exception, it is dropped', ({
    assert,
  }) => {
    const result = applyTemporaryExceptions(
      [finding],
      [
        {
          check: 'pattern-check',
          rule: 'raw-input-in-controller',
          file: 'app/x.controller.ts',
          batch: 4,
          reason: 'm',
        },
      ],
    )

    assert.deepEqual(result, [])
  })

  test('when a temporary exception has no finding, it reports unused-temporary-exception', ({
    assert,
  }) => {
    const result = applyTemporaryExceptions(
      [],
      [
        {
          check: 'pattern-check',
          rule: 'raw-input-in-controller',
          file: 'app/gone.controller.ts',
          batch: 4,
          reason: 'm',
        },
      ],
    )

    assert.deepEqual(
      result.map((item) => item.rule),
      ['unused-temporary-exception'],
    )
  })

  test('when a depcruise exception no longer has its import, it reports unused-temporary-exception', ({
    assert,
  }) => {
    const exception = {
      check: 'depcruise',
      rule: 'only-repository-imports-model',
      file: 'app/services/a/a.service.ts',
      target: 'app/models/storage.ts',
      batch: 4,
      reason: 'm',
    } as const

    assert.deepEqual(
      checkDepcruiseExceptions(
        [exception],
        new Map([
          [
            'app/services/a/a.service.ts',
            "import Storage from '#models/storage'\n",
          ],
        ]),
      ),
      [],
    )
    assert.deepEqual(
      checkDepcruiseExceptions(
        [exception],
        new Map([['app/services/a/a.service.ts', 'export {}\n']]),
      ).map((item) => item.rule),
      ['unused-temporary-exception'],
    )
  })
})
