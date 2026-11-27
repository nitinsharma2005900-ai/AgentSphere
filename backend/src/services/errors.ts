export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function safeError(error: unknown): string {
  return error instanceof AppError ? error.message : "The operation failed. Check service health and retry.";
}
