/**
 * Either - the result of an operation that may fail, as a return VALUE
 * instead of an exception. `Left` carries the error, `Right` carries the success.
 *
 * `isLeft()` and `isRight()` are type guards: inside the `if`, TypeScript knows
 * which side it is on and narrows the type of `value` by itself. Without `this is`, the
 * narrowing does not happen and every use case would need a cast to read
 * `value` - which is exactly the lie to the compiler that this type avoids.
 */

// ERROR
export class Left<TLeft, TRight> {
  readonly value: TLeft

  constructor(value: TLeft) {
    this.value = value
  }

  isRight(): this is Right<TLeft, TRight> {
    return false
  }

  isLeft(): this is Left<TLeft, TRight> {
    return true
  }
}

// SUCCESS
export class Right<TLeft, TRight> {
  readonly value: TRight

  constructor(value: TRight) {
    this.value = value
  }

  isRight(): this is Right<TLeft, TRight> {
    return true
  }

  isLeft(): this is Left<TLeft, TRight> {
    return false
  }
}

export type Either<TLeft, TRight> = Left<TLeft, TRight> | Right<TLeft, TRight>

export const left = <TLeft, TRight>(value: TLeft): Either<TLeft, TRight> => {
  return new Left(value)
}

export const right = <TLeft, TRight>(value: TRight): Either<TLeft, TRight> => {
  return new Right(value)
}
