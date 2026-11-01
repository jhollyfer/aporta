import { defineConfig } from 'vitest/config'

/**
 * The test runs over `src/`, next to the module (`_standards/tooling.md` §7), and
 * not over `dist/`: the build is only the delivery to the apps.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
