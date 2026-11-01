import IdGeneratorContract from '#services/id-generator/id-generator.contract'

/**
 * Predictable ids for the unit tests: `…0001`, `…0002`, in the order of the requests. They have
 * the UUID v4 format to pass wherever the real id passes.
 */
export default class IdGeneratorFake extends IdGeneratorContract {
  #issued = 0

  next(): string {
    this.#issued += 1
    return `00000000-0000-4000-8000-${String(this.#issued).padStart(12, '0')}`
  }
}
