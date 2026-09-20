import { shouldShow } from "../utils/conditions"
import { Field, FormApi, FieldComponentProps, KiFormComponents } from "../types"

type Props = {
  field: Field
  form: FormApi
  components: KiFormComponents
}

export function FieldRenderer({ field, form, components }: Props) {
  if (!shouldShow(field, form.values)) return null

  const Component = components[field.type || "text"]

  if (!Component) {
    console.warn(`No component found for type: ${field.type}`)
    return null
  }

  const props: FieldComponentProps = {
    field,
    value: form.values[field.name],
    error: form.errors[field.name],
    onChange: (value: any) => form.setValue(field.name, value),
  }

  return <Component {...props} />
}
