import { HttpError } from "./HttpError.js";

// Ubah parameter id dari URL menjadi angka; id yang bukan angka pasti tidak ada
export function parseId(value: string | string[] | undefined, notFoundMessage: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(404, notFoundMessage);
  }
  return id;
}

export function isEnumValue<T extends string>(values: Record<string, T>, value: unknown): value is T {
  return typeof value === "string" && (Object.values(values) as string[]).includes(value);
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}
