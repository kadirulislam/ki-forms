/**
 * ki-forms 2.0.0 Compat Suite
 * ---------------------------
 * Behavioral contract with every user of the published 2.0.0 package.
 * Source of truth: the README shipped with ki-forms@2.0.0 (byte-faithful
 * copies of its examples — do not "modernize" these) + observed 2.0.0 DOM.
 *
 * Rule for future changes: this suite must keep passing, unchanged.
 * New behavior gets a NEW file; never edit a compat test to make code pass.
 *
 * Documented 2.0.0 behavior pins:
 * - Labels render WITHOUT for/id association (a11y gap in 2.0.0).
 *   Queries therefore use placeholder/aria-label/select element — NOT
 *   getByLabelText. If a future release adds association (additive DOM),
 *   these tests still pass; new association tests go in a new file.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { KiForm, useKiForm } from "../src"

// ============================================================
// README — Quick Example / Basic Usage
// ============================================================

describe("compat: quick example + basic usage", () => {
  it('renders fields from ["email", "password"] and submits their values', () => {
    const onSubmit = vi.fn()
    render(<KiForm fields={["email", "password"]} onSubmit={onSubmit} />)

    // Smart defaults: inferred input types + generated labels + placeholders
    const email = screen.getByPlaceholderText("Enter your email") as HTMLInputElement
    const password = screen.getByPlaceholderText("Enter your password") as HTMLInputElement
    expect(email.type).toBe("email")
    expect(password.type).toBe("password")
    expect(screen.getByText("Email")).toBeTruthy()
    expect(screen.getByText("Password")).toBeTruthy()

    fireEvent.change(email, { target: { value: "a@b.co" } })
    fireEvent.change(password, { target: { value: "s3cret" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co", password: "s3cret" })
  })

  it("README field config: type/required/label/placeholder/helperText", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[
          {
            name: "email",
            type: "email",
            required: true,
            label: "Email",
            placeholder: "Enter your email",
            helperText: "We never share your email",
          },
        ]}
        onSubmit={onSubmit}
      />
    )

    const input = screen.getByPlaceholderText("Enter your email") as HTMLInputElement
    // 2.0.0 pin: required is enforced in JS validation only — the DOM
    // attribute is never set on the input.
    expect(input.required).toBe(false)
    expect(screen.getByText("We never share your email")).toBeTruthy()

    // required + empty -> blocked, error text is "<label> is required"
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Email is required")).toBeTruthy()

    fireEvent.change(input, { target: { value: "me@x.dev" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ email: "me@x.dev" })
  })
})

// ============================================================
// README — Conditional Fields (showIf)
// ============================================================

describe("compat: conditional fields", () => {
  it("shows company only when role=Admin (string fields + options object)", () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <KiForm
        fields={[
          "email",
          "password",
          { name: "role", options: ["User", "Admin"] },
          { name: "company", showIf: { field: "role", equals: "Admin" } },
        ]}
        onSubmit={onSubmit}
      />
    )

    expect(screen.queryByPlaceholderText("Enter your company")).toBeNull() // hidden initially

    fireEvent.change(container.querySelector("select")!, { target: { value: "Admin" } })
    const company = screen.getByPlaceholderText("Enter your company")
    expect(company).toBeTruthy() // appears

    fireEvent.change(company, { target: { value: "Acme" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({
      email: "",
      password: "",
      role: "Admin",
      company: "Acme",
    })
  })

  it("notEquals: field visible for any value except the excluded one (2.0.0 semantics: empty string is visible)", () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "plan", options: ["Free", "Pro"] },
          { name: "coupon", showIf: { field: "plan", notEquals: "Free" } },
        ]}
      />
    )
    // 2.0.0 pin: empty string !== "Free" -> visible initially
    expect(screen.getByPlaceholderText("Enter your coupon")).toBeTruthy()
    fireEvent.change(container.querySelector("select")!, { target: { value: "Free" } })
    expect(screen.queryByPlaceholderText("Enter your coupon")).toBeNull()
  })
})

// ============================================================
// README — Field Events (onChange)
// ============================================================

describe("compat: field events", () => {
  it("onChange receives the new value and all current values", () => {
    const onChange = vi.fn()
    const { container } = render(
      <KiForm fields={[{ name: "role", options: ["User", "Admin"], onChange }, "email"]} />
    )

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "x@y.zz" },
    })
    fireEvent.change(container.querySelector("select")!, { target: { value: "Admin" } })

    expect(onChange).toHaveBeenCalledWith("Admin", { role: "Admin", email: "x@y.zz" })
  })
})

// ============================================================
// README — Advanced Usage: useKiForm + <KiForm form={form} />
// ============================================================

describe("compat: advanced usage (controlled hook)", () => {
  it("hook return shape { fields, values, errors, setValue, handleSubmit }", () => {
    const onSubmit = vi.fn()
    let captured: ReturnType<typeof useKiForm> | null = null

    function Consumer() {
      const form = useKiForm({ fields: ["email", "password"], onSubmit })
      captured = form
      return <KiForm form={form} />
    }

    render(<Consumer />)

    // Frozen public shape — the 2.0.0 keys must ALWAYS be present.
    // (2.1.0 added `validateField`; update the "added" list, never the frozen list.)
    const keys = Object.keys(captured as any).sort()
    for (const frozen of ["errors", "fields", "handleSubmit", "setValue", "values"]) {
      expect(keys).toContain(frozen)
    }
    expect(keys).toContain("validateField") // added in 2.1.0

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "a@b.co" },
    })
    expect(captured!.values.email).toBe("a@b.co")

    act(() => {
      captured!.setValue("password", "pw123")
    })
    expect(captured!.values.password).toBe("pw123")

    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ email: "a@b.co", password: "pw123" })
  })
})

// ============================================================
// README — Styling: label:false and className pass-through
// ============================================================

describe("compat: styling hooks", () => {
  it("label: false hides the label AND the generated placeholder (2.0.0: placeholder derives from label)", () => {
    const { container } = render(<KiForm fields={[{ name: "email", label: false }]} />)
    expect(screen.queryByText("Email")).toBeNull()
    const input = container.querySelector("input") as HTMLInputElement
    expect(input.type).toBe("email")
    expect(input.placeholder).toBe("")
  })

  it("field className is appended to the default ki-input class", () => {
    const { container } = render(
      <KiForm fields={[{ name: "email", className: "my-custom-input" }]} />
    )
    expect(
      (container.querySelector("input") as HTMLInputElement).className
    ).toContain("my-custom-input")
  })
})

// ============================================================
// README — Components map override (extendable component system)
// ============================================================

describe("compat: custom component injection", () => {
  it("components override replaces a renderer per type", () => {
    function TinyInput({ value, onChange }: any) {
      return (
        <input aria-label="tiny" value={value} onChange={(e) => onChange(e.target.value)} />
      )
    }
    render(
      <KiForm fields={["email"]} components={{ email: TinyInput }} onSubmit={vi.fn()} />
    )
    expect(screen.queryByPlaceholderText("Enter your email")).toBeNull()
    fireEvent.change(screen.getByLabelText("tiny"), { target: { value: "z@z.zz" } })
    expect((screen.getByLabelText("tiny") as HTMLInputElement).value).toBe("z@z.zz")
  })
})

// ============================================================
// Behavioral edge cases guaranteed by 2.0.0 semantics
// ============================================================

describe("compat: 2.0.0 semantics", () => {
  it("number fields submit numbers, text fields keep strings", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[{ name: "age", type: "number" }, "email"]}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("Enter your age"), {
      target: { value: "42" },
    })
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "a@b.co" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))

    expect(onSubmit).toHaveBeenCalledWith({ age: 42, email: "a@b.co" })
  })

  it("hidden required fields are not validated (showIf + required)", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[
          { name: "role", options: ["User", "Admin"] },
          { name: "company", required: true, showIf: { field: "role", equals: "Admin" } },
        ]}
        onSubmit={onSubmit}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ role: "", company: "" })
    expect(screen.queryByText("Company is required")).toBeNull()
  })

  it("select renders a placeholder option and defaults to empty string", () => {
    const { container } = render(<KiForm fields={[{ name: "color", options: ["Red", "Blue"] }]} />)
    const select = container.querySelector("select") as HTMLSelectElement
    expect(select.value).toBe("")
    expect(select.options[0].textContent).toBe("Select")
  })

  it("object options use { label, value }", () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <KiForm
        fields={[{ name: "tier", options: [{ label: "Pro Plan", value: "pro" }] }]}
        onSubmit={onSubmit}
      />
    )
    expect(screen.getByText("Pro Plan")).toBeTruthy()
    fireEvent.change(container.querySelector("select")!, { target: { value: "pro" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ tier: "pro" })
  })

  it("textarea renders and submits its value", () => {
    const onSubmit = vi.fn()
    render(<KiForm fields={[{ name: "bio", type: "textarea" }]} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByPlaceholderText("Enter your bio"), {
      target: { value: "hello" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ bio: "hello" })
  })

  it("zod-style schema (safeParse) surfaces per-field messages", () => {
    const schema = {
      safeParse: (values: Record<string, any>) => {
        if (values.email === "bad") {
          return {
            success: false as const,
            error: { errors: [{ path: ["email"], message: "Invalid email" }] },
          }
        }
        return { success: true as const, data: values }
      },
    }
    const onSubmit = vi.fn()
    const { container } = render(<KiForm fields={["email"]} schema={schema} onSubmit={onSubmit} />)

    // NOTE: fireEvent.submit, not click. jsdom implements partial constraint
    // validation: a dirty type=email input with a type-mismatched value blocks
    // implicit submission entirely (no submit event), so the click would never
    // reach React. This is a test-env quirk, not ki-forms behavior.
    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "bad" },
    })
    fireEvent.submit(container.querySelector("form")!)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Invalid email")).toBeTruthy()
  })
})

// ============================================================
// Type-level compat (compiles = pass; no runtime cost)
// ============================================================

describe("compat: type surface", () => {
  it("accepts every 2.0.0 README shape at compile time", () => {
    const _typeCheck = () => {
      // README Quick Example shapes
      ;<KiForm fields={["email", "password"]} onSubmit={(d) => console.log(d)} />
      ;<KiForm
        fields={[
          "email",
          "password",
          { name: "role", options: ["User", "Admin"] },
          { name: "company", showIf: { field: "role", equals: "Admin" } },
        ]}
        onSubmit={(d) => console.log(d)}
      />
      // README Field Configuration shape
      ;<KiForm
        fields={[
          {
            name: "email",
            type: "email",
            required: true,
            label: "Email",
            placeholder: "Enter your email",
            helperText: "We never share your email",
          },
        ]}
      />
      // README showIf with notEquals
      ;<KiForm fields={[{ name: "b", showIf: { field: "a", notEquals: "x" } }]} />
      // README Field Events
      ;<KiForm
        fields={[
          {
            name: "role",
            options: ["User", "Admin"],
            onChange: (value, values) => console.log(value, values),
          },
        ]}
      />
      // README className override
      ;<KiForm fields={[{ name: "email", className: "my-custom-input" }]} />
      // README Advanced Usage
      const form = useKiForm({ fields: ["email", "password"] })
      ;<KiForm form={form} />
      // README schema option
      useKiForm({ fields: ["email"], schema: {} as any })
    }
    expect(_typeCheck).toBeTruthy()
  })
})
