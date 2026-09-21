import "./styles/index.css"

export { useKiForm } from "./core/useKiForm"
export { KiForm } from "./renderer/KiForm"
export { InputField } from "./fields/Input"
export { SelectField } from "./fields/Select"
export { TextareaField } from "./fields/Textarea"
export { CheckboxField } from "./fields/Checkbox"
export { defaultTheme, themeToCssVars } from "./theme"
export { evaluateCondition } from "./schema/conditions"
export { validateFields, validateDocument, normalizeFields, normalizeDocument } from "./schema/validate"
export type { SchemaIssue, SchemaResult, DocumentResult } from "./schema/validate"

export type {
  Condition,
  FieldType,
  ShowIf,
  Field,
  FieldInput,
  FormValues,
  KiFormDocument,
  KiFormSchema,
  FieldComponentProps,
  KiFormComponents,
  FormApi,
  UseKiFormOptions,
  KiFormProps,
  KiTheme,
  SubmissionState,
  SubmissionMeta,
  SubmitEndpointResult,
  InferFormValues,
  FieldValue,
} from "./types"
export { defineFields } from "./types"
