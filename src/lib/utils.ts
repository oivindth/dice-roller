import { nanoid, customAlphabet } from "nanoid";

export function generateId(): string {
  return nanoid();
}

const shareCodeAlphabet = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  6
);

export function generateShareCode(): string {
  return shareCodeAlphabet();
}
