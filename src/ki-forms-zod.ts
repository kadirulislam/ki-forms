/**
 * ki-forms/zod — generate a Zod schema from your field config.
 *
 * Usage:
 *   import { buildZodSchema } from "ki-forms/zod"
 *   import { z } from "zod"
 *
 *   const schema = buildZodSchema(fields, { zod: z })
 *   <KiForm fields={fields} schema={schema} onSubmit={...} />
 *
 * Uses YOUR zod instance (v3 or v4) — ki-forms stays dependency-free.
 */
export { buildZodSchema, toZodSchema } from "./zod"
export type { ZodLike } from "./zod"
