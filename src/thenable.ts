/**
 * Whether a value is thenable (has a callable `then`).
 *
 * Unlike `instanceof Promise`, this also catches cross-realm promises and
 * custom thenables. It is how an accidental `async register` (allowed by the
 * `: void` signature) or an async schema shows up at runtime.
 *
 * @internal
 */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof (value as PromiseLike<unknown> | undefined)?.then === "function"
  );
}
