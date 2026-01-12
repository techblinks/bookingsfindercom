import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

/**
 * Validate request body against a Zod schema
 * Returns parsed data or throws a validation error
 */
export async function validateRequest<T extends z.ZodSchema>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await req.json();
  const result = schema.safeParse(body);
  
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new ValidationError('Validation failed', errors);
  }
  
  return result.data;
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T extends z.ZodSchema>(
  url: URL,
  schema: T
): z.infer<T> {
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new ValidationError('Validation failed', errors);
  }
  
  return result.data;
}

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  public errors: Array<{ field: string; message: string }>;
  
  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Re-export zod for convenience
export { z };
