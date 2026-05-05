import { useKiForm } from "../core/useKiForm"
import { FieldRenderer } from "./FieldRenderer"
import { InputField } from "../fields/Input"
import { SelectField } from "../fields/Select"
import { TextareaField } from "../fields/Textarea"

const defaultComponents = {
  text: InputField,
  email: InputField,
  password: InputField,
  select: SelectField,
  textarea: TextareaField,
  number: InputField, 
}

export function KiForm(props: any) {
  const form = props.form || useKiForm(props)

  const components = {
    ...defaultComponents,
    ...props.components
  }

  return (
    <form onSubmit={form.handleSubmit} className={props.className}>
      {form.fields.map((field: any) => (
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