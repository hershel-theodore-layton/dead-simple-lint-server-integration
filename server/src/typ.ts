import { invariant, jsonify } from "./shared";

export type TypeAssert<T> = (mixed: unknown) => T;

export const typ = {
  string: (): TypeAssert<string> => (mixed: unknown) =>
    typeof mixed === "string"
      ? mixed
      : mismatch(jsonify`: Expected string, got ${mixed}`),
  number: (): TypeAssert<number> => (mixed: unknown) =>
    typeof mixed === "number"
      ? mixed
      : mismatch(jsonify`: Expected number, got ${mixed}`),
  boolean: (): TypeAssert<boolean> => (mixed: unknown) =>
    typeof mixed === "boolean"
      ? mixed
      : mismatch(jsonify`: Expected number, got ${mixed}`),
  anyOf:
    <const T>(values: T[]): TypeAssert<T> =>
    (mixed: unknown) =>
      values.includes(mixed as T)
        ? (mixed as T)
        : mismatch(jsonify`: Expected oneof ${values}, got ${mixed}`),
  array:
    <T>(inner: TypeAssert<T>): TypeAssert<T[]> =>
    (mixed: unknown) => {
      if (!Array.isArray(mixed)) {
        mismatch(jsonify`: Expected array, got ${mixed}`);
      }
      for (const [i, el] of mixed.entries()) {
        try {
          inner(el);
        } catch (e) {
          chain(e, `[${i}]`);
        }
      }
      return mixed;
    },
  object:
    <const T extends Record<string, TypeAssert<unknown>>>(
      inner: T
    ): TypeAssert<
      {
        -readonly [key in keyof T as T[key] extends Optional
          ? key
          : never]?: ReturnType<T[key]>;
      } & {
        -readonly [key in keyof T as T[key] extends Optional
          ? never
          : key]: ReturnType<T[key]>;
      }
    > =>
    (mixed: unknown) => {
      if (typeof mixed !== "object" || mixed === null) {
        mismatch(jsonify`Expected object, got ${mixed}`);
      }
      for (const [k, v] of Object.entries(inner)) {
        try {
          v(mixed[k as keyof typeof mixed]);
        } catch (e) {
          chain(e, `.${k}`);
        }
      }
      return mixed as any;
    },
  optional: <T>(inner: TypeAssert<T>): TypeAssert<T | undefined> & Optional =>
    ((mixed: unknown) => {
      if (mixed === undefined) {
        return mixed;
      }
      return inner(mixed);
    }) as any,
  forTypescript:
    <T>(_: TypeAssert<T>): TypeAssert<T> =>
    (mixed: unknown) =>
      mixed as T,
};

const _OPT = Symbol();
type Optional = typeof _OPT;

function chain(error: unknown, via: string): never {
  invariant(
    error instanceof Error,
    () => jsonify`Expected error, got ${error}`
  );
  throw new Error(via + error.message);
}
function mismatch(message: string): never {
  throw new Error(message);
}
