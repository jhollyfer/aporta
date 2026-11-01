/**
 * Layer direction and cycles (`_standards/domain.md` §8, table in
 * `_standards/architecture.md` §2). Only the rules of that table and `no-circular`;
 * every rule with `severity: 'error'`, because the default is `warn` and `warn` does not change
 * the exit code (_doc-lib/dependency-cruiser.md#doc/rules-reference.md).
 *
 * Usage: `pnpm depcruise`. The `--config` is explicit because the default name is a hidden
 * file, which tsconfig and ESLint do not see.
 */
import type {
  IConfiguration,
  IRegularForbiddenRuleType,
} from 'dependency-cruiser'

import { configuration as patternCheck } from './pattern-check.config.ts'

/** A spec is a test, not the layer: the E2E reads the model to prove it wrote (`backend.md` §7). */
const SPEC = '\\.(?:unit|e2e|contract)?\\.?spec\\.ts$'

/**
 * TEMPORARY and named exception: a layer import that the conformity work has not yet
 * fixed. It lives in `pattern-check.config.ts` (`temporaryExceptions`, a single
 * visible point, each item with the batch that resolves it) and `pattern:check`
 * fails any that no longer has an import. No new item: a new import that breaks the
 * table fails.
 */
const TEMPORARY_EXCEPTIONS = patternCheck.temporaryExceptions.flatMap(
  (item) => {
    if (item.check !== 'depcruise' || item.target === undefined) return []
    return [{ rule: item.rule, from: item.file, to: item.target }]
  },
)

function escape(path: string): string {
  return `^${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`
}

/**
 * A rule with an exception becomes two: the original without the exempt files and a
 * copy only for them, with the exempt targets in `to.pathNot`. The exemption holds for
 * the (file, target) pair, not for the whole file.
 */
function withExceptions(
  rule: IRegularForbiddenRuleType,
): IRegularForbiddenRuleType[] {
  const own = TEMPORARY_EXCEPTIONS.filter((item) => item.rule === rule.name)
  if (own.length === 0) return [rule]

  const files = [...new Set(own.map((item) => item.from))]
  const fromPathNot = [rule.from.pathNot ?? []].flat()
  const toPathNot = [rule.to.pathNot ?? []].flat()

  const generic: IRegularForbiddenRuleType = {
    ...rule,
    from: { ...rule.from, pathNot: [...fromPathNot, ...files.map(escape)] },
  }

  const narrowed = files.map((file): IRegularForbiddenRuleType => {
    const targets = own
      .filter((item) => item.from === file)
      .map((item) => escape(item.to))

    return {
      ...rule,
      from: { ...rule.from, path: escape(file), pathNot: fromPathNot },
      to: { ...rule.to, pathNot: [...toPathNot, ...targets] },
    }
  })

  return [generic, ...narrowed]
}

const FORBIDDEN: IRegularForbiddenRuleType[] = [
  { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  {
    name: 'core-imports-no-layer',
    comment: 'core/ imports only shared (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/core/', pathNot: SPEC },
    to: {
      path: '^app/(domain|repositories|models|services|policies|middleware|features|exceptions)/',
    },
  },
  {
    name: 'domain-ignores-persistence',
    comment: 'domain/ imports only core and shared (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/domain/', pathNot: SPEC },
    to: {
      path: '^app/(repositories|models|services|policies|middleware|features|exceptions|validators)/',
    },
  },
  {
    name: 'repository-without-business-rule-or-http',
    comment:
      'repositories/ imports domain, models and core (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/repositories/', pathNot: SPEC },
    to: {
      path: '^app/(features|services|policies|middleware|exceptions|validators)/',
    },
  },
  {
    name: 'only-repository-imports-model',
    comment: 'model is imported only by repositories/ (architecture.md §2)',
    severity: 'error',
    from: {
      path: '^app/',
      pathNot: ['^app/repositories/', '^app/models/', SPEC],
    },
    to: { path: '^app/models/' },
  },
  {
    name: 'model-imports-only-core',
    comment: 'models/ imports only core (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/models/', pathNot: SPEC },
    to: {
      path: '^app/(domain|repositories|services|policies|middleware|features|exceptions)/',
    },
  },
  {
    name: 'service-imports-only-core-and-shared',
    comment: 'services/ imports only core and shared (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/services/', pathNot: SPEC },
    to: {
      path: '^app/(domain|repositories|models|policies|middleware|exceptions)/',
    },
  },
  {
    name: 'service-imports-no-feature',
    comment:
      'services/ does not import features/, only the pure function of _shared.<theme>',
    severity: 'error',
    from: { path: '^app/services/', pathNot: SPEC },
    to: { path: '^app/features/', pathNot: '^app/features/_shared\\.' },
  },
  {
    name: 'policy-without-database',
    comment: 'policies/ imports core and domain (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/policies/', pathNot: SPEC },
    to: {
      path: '^app/(repositories|models|services|features|middleware|exceptions)/',
    },
  },
  {
    name: 'middleware-without-feature-rule',
    comment: 'middleware/ imports core and contracts (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/middleware/', pathNot: SPEC },
    to: { path: '^app/(features|models|repositories|domain)/' },
  },
  {
    name: 'exceptions-import-only-core',
    comment: 'exceptions/ imports only core (architecture.md §2)',
    severity: 'error',
    from: { path: '^app/exceptions/', pathNot: SPEC },
    to: {
      path: '^app/(domain|repositories|models|services|policies|middleware|features)/',
    },
  },
  {
    name: 'feature-imports-no-other-feature',
    comment:
      'a feature does not import another; the root _shared.<theme> is the common place',
    severity: 'error',
    from: { path: '(^app/features/)([^/]+)/' },
    to: { path: '^$1', pathNot: ['$1$2', '^app/features/_shared\\.'] },
  },
  {
    name: 'feature-imports-no-implementation',
    comment:
      'the feature imports the contract; the provider binds the implementation',
    severity: 'error',
    from: { path: '^app/features/', pathNot: '\\.unit\\.spec\\.ts$' },
    to: { path: '^app/repositories/.*\\.(?:lucid|memory)\\.repository\\.ts$' },
  },
]

const configuration: IConfiguration = {
  forbidden: FORBIDDEN.flatMap(withExceptions),
  options: {
    // Without the option `import type` vanishes from the graph (domain.md §8).
    tsPreCompilationDeps: true,
    // The `#x/*` aliases come from the `imports` field of package.json, which
    // dependency-cruiser does not resolve to `.ts`; tsconfig repeats them in `paths`.
    tsConfig: { fileName: 'tsconfig.depcruise.json' },
    doNotFollow: { path: 'node_modules' },
    combinedDependencies: false,
  },
}

export default configuration
