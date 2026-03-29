export function toSerializable<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, candidate) => {
      if (typeof candidate === "function") return undefined;
      return candidate;
    }),
  ) as T;
}
