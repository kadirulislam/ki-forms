# ki-forms

Build dynamic React forms from JSON — with zero setup.

Stop wiring forms manually. Define them as data.

---

## ⚡ Quick Example

```jsx
import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

export default function App() {
  return (
    <KiForm
      fields={[
        "email",
        "password",
        {
          name: "role",
          options: ["User", "Admin"]
        },
        {
          name: "company",
          showIf: { field: "role", equals: "Admin" }
        }
      ]}
      onSubmit={(data) => console.log(data)}
    />
  )
}
```

---

## 🤯 The Problem

Building forms in React is repetitive and inefficient:

- Managing state for every input  
- Handling validation manually  
- Writing conditional logic  
- Repeating boilerplate code  

Even popular libraries like React Hook Form require setup and mental overhead.

---

## ✅ The Solution

ki-forms lets you build forms using simple JSON.

- No manual state handling  
- No boilerplate  
- No complex configuration  

Just describe your form → it renders automatically.

---

## 📦 Installation

```bash
npm install ki-forms
```

---

## 🚀 Basic Usage

```jsx
import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

<KiForm
  fields={["email", "password"]}
  onSubmit={(data) => console.log(data)}
/>
```

---

## 🧩 Field Configuration

```js
{
  name: "email",
  type: "email",
  required: true,
  label: "Email",
  placeholder: "Enter your email",
  helperText: "We never share your email"
}
```

---

## 🔄 Conditional Fields

Show fields dynamically based on other values:

```js
{
  name: "company",
  showIf: {
    field: "role",
    equals: "Admin"
  }
}
```

---

## 🎯 Smart Defaults

ki-forms automatically:

- Infers input types (`email`, `password`)  
- Generates labels (`firstName → First Name`)  
- Adds placeholders (`Enter your email`)  
- Converts simple strings into fields  

```jsx
fields={["email", "password"]}
```

---

## 🧠 Field Events

Run logic when field value changes:

```js
{
  name: "role",
  options: ["User", "Admin"],
  onChange: (value, values) => {
    console.log("Selected:", value)
    console.log("All values:", values)
  }
}
```

---

## 🎨 Styling

Default styles included:

```js
import "ki-forms/styles.css"
```

Override using `className`:

```js
{
  name: "email",
  className: "my-custom-input"
}
```

---

## ⚙️ Advanced Usage

Use the form hook directly:

```jsx
import { useKiForm, KiForm } from "ki-forms"

const form = useKiForm({
  fields: ["email", "password"]
})

<KiForm form={form} />
```

---

## 📋 Supported Features

- JSON-based form builder  
- Conditional fields  
- Smart defaults  
- Minimal API  
- React + Next.js support  
- Extendable component system  
- Built-in UI  

---

## ⚖️ Comparison

| Feature           | ki-forms | React Hook Form |
|------------------|---------|----------------|
| Setup            | Zero    | Medium         |
| Boilerplate      | Low     | Medium         |
| Dynamic forms    | Built-in | Manual        |
| Learning curve   | Very Low | Medium        |