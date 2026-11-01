import comments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import { defineConfig } from 'eslint/config'
import importX from 'eslint-plugin-import-x'
import tseslint from 'typescript-eslint'

// Allowlist of `new` by symbol (`_standards/backend.md` §2.1). Only a class whose name matches
// the selector and that a library API forces you to instantiate goes in, each with its reason.
// Empty, the `:not` becomes `^()$`, which matches no name.
const NEW_ALLOWLIST = []

const NEW_SELECTOR =
  'NewExpression[callee.name=/(Service|UseCase|Policy|Controller|Repository|Seeder)$/]' +
  `:not([callee.name=/^(${NEW_ALLOWLIST.join('|')})$/])`

// One lib per role (`_standards/tooling.md` §0.1). `paths` matches the exact name; the subpath
// only falls into `patterns`.
const OUTSIDE_THE_HOUSE = [
  { name: 'date-fns', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'dayjs', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  { name: 'moment', message: 'Data e hora: Luxon (tooling.md §0.1).' },
  {
    name: 'lucide-react',
    message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).',
  },
  {
    name: 'react-icons',
    message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).',
  },
  {
    name: '@tabler/icons-react',
    message: 'Ícone: @phosphor-icons/react (tooling.md §0.1).',
  },
  {
    name: 'yup',
    message: 'Schema: Zod, ou VineJS só no backend Adonis (tooling.md §0.1).',
  },
  { name: 'react-markdown', message: 'Markdown: Tiptap (tooling.md §0.1).' },
  { name: 'marked', message: 'Markdown: Tiptap (tooling.md §0.1).' },
  { name: 'markdown-it', message: 'Markdown: Tiptap (tooling.md §0.1).' },
]

const OUTSIDE_PATTERNS = [
  {
    group: [
      'date-fns/*',
      'dayjs/*',
      'moment/*',
      'lucide-react/*',
      'react-icons/*',
      '@tabler/icons-react/*',
      'yup/*',
      'remark-*',
      'rehype-*',
    ],
    message: 'Biblioteca fora da casa (tooling.md §0.1).',
  },
]

// VineJS only in the Adonis backend (`_standards/tooling.md` §0.1).
const VINE_PATH = {
  name: '@vinejs/vine',
  message: 'Schema: Zod; VineJS só no backend Adonis (tooling.md §0.1).',
}

// This package is not the Adonis backend: no `@vinejs/vine` (nor subpath). Flat config replaces the
// rule options instead of adding them, so `paths` and `patterns` are repeated here.
const NO_VINE = {
  paths: [...OUTSIDE_THE_HOUSE, VINE_PATH],
  patterns: [
    ...OUTSIDE_PATTERNS,
    { group: ['@vinejs/vine/*'], message: VINE_PATH.message },
  ],
}

export default defineConfig([
  ...tseslint.configs.recommendedTypeChecked,
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { 'import-x': importX },
    rules: {
      // no ternary: classic `if` or a lookup (`typescript.md` §13). `??`, `?.` and `&&` stay free.
      'no-ternary': 'error',
      // no `any`: `unknown` and narrowing at the boundary (`typescript.md` §2.1).
      '@typescript-eslint/no-explicit-any': 'error',
      // no `as`; `as const` is still allowed by `assertionStyle: 'never'`.
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      // no `!`: narrowing at the top of the function.
      '@typescript-eslint/no-non-null-assertion': 'error',
      // always `type`, never `interface` (declaration merging: `*.d.ts` override below).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // `import type` autofix; lives with `verbatimModuleSyntax` (§3) and stays quiet on its own
      // in a file with a legacy decorator, with no per-line disable in Fastify.
      '@typescript-eslint/consistent-type-imports': 'error',
      // a floating promise is a rejection with no owner; a promise where void is expected is a silent error.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // external -> internal alias (`#…`, `@aporta/shared`) -> relative, blank line between groups.
      'import-x/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          // `@aporta/shared` resolves through node_modules and would be `external` without the pathGroup.
          pathGroups: [
            { pattern: '#**', group: 'internal' },
            { pattern: '@aporta/**', group: 'internal' },
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      // an `eslint-disable` with no reason beside it does not pass (§10.2).
      '@eslint-community/eslint-comments/require-description': 'error',
      // the framework logger, never `console` (`backend.md` §4.2); also catches a forgotten debug
      // log. A CLI script writes to `process.stdout`.
      'no-console': 'error',
      // a file past this asks for a split (house opinion). `warn` only fails because the lint
      // script runs with `--max-warnings 0`.
      'max-lines': [
        'warn',
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: NO_VINE.paths,
          patterns: NO_VINE.patterns,
        },
      ],
      // a collaborator comes from the container, never from `new` (`backend.md` §2.1).
      'no-restricted-syntax': [
        'error',
        {
          selector: NEW_SELECTOR,
          message:
            'Colaborador vem do container: injete por construtor (backend.md §2.1).',
        },
      ],
      // `.pipe()` neither propagates the error nor destroys the streams when one fails (`backend.md` §5.6).
      'no-restricted-properties': [
        'error',
        {
          property: 'pipe',
          message: 'Use pipeline de node:stream/promises (backend.md §5.6).',
        },
      ],
      // code from outside only runs in the isolated-vm (`backend-fastify.md` §13).
      'no-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
    },
  },

  {
    // declaration merging requires `interface`: a language limit, not style.
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
  },
  {
    // the unit test builds the use-case with the in-memory implementation (`_standards/DECISIONS.md` #116).
    files: ['**/*.unit.spec.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    ignores: ['dist/**'],
  },
])
