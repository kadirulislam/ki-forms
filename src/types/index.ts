export type FieldType =
  | "text"
  | "email"
  | "password"
  | "select"
  | "checkbox"
  | "number"
  | "textarea"

export type ShowIf = {
  field: string
  equals?: any
  notEquals?: any
}

export type Field = {
  name: string
  type?: FieldType
  label?: string | false
  placeholder?: string
  options?: string[] | { label: string; value: string }[]
  defaultValue?: any

  required?: boolean
  showIf?: ShowIf

  className?: string
  helperText?: string
  onChange?: (value: any, values: Record<string, any>) => void

}

export type FieldInput = Field | string

export type UseKiFormOptions = {
  fields: FieldInput[]
  onSubmit?: (values: Record<string, any>) => void
  schema?: any
}