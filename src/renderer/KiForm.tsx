import { useKiForm } from "../core/useKiForm"
import { FieldRenderer } from "./FieldRenderer"
import { InputField } from "../fields/Input"
import { SelectField } from "../fields/Select"
import { TextareaField } from "../fields/Textarea"
import { CheckboxField } from "../fields/Checkbox"
import { themeToCssVars } from "../theme"
import type { KiFormComponents, KiFormProps } from "../types"

const defaultComponents: KiFormComponents = {
  text: InputField,
  email: InputField,
  password: InputField,
  select: SelectField,
  textarea: TextareaField,
  number: InputField,
  checkbox: CheckboxField,
}

export function KiForm(props: KiFormProps) {
  const form = props.form || useKiForm(props as never)

  const components: KiFormComponents = {
    ...defaultComponents,
    ...props.components,
  }

  return (
    <form
      onSubmit={form.handleSubmit}
      className={["ki-form", props.className].filter(Boolean).join(" ")}
      style={props.theme ? themeToCssVars(props.theme) : undefined}
    >
      {form.fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          form={form}
          components={components}
        />
      ))}

      <button
        type="submit"
        style={{
          padding: "8px 14px",
          borderRadius: "6px",
          border: "none",
          background: "#111827",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        Submit
      </button>
    </form>
  )
}
