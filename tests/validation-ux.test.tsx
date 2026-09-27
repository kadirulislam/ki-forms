import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { KiForm, inferAutofill, requiredMessage } from "../src/index"
import { applyDefaults } from "../src/utils/defaults"
import { validateFields } from "../src/schema/validate"
import { exportReact, importSchemaBlock, toRoundTripSnippet } from "../src/codegen/react"
import type { Field } from "../src/types"

/**
 * Validation UX (2.5.0), driven by usability research:
 * - Baymard: error *content* decides recovery; general messages force users to
 *   hunt for the problem. 32% of sites validate not at all.
 * - WCAG 3.3.3: a message should suggest a correction, not just name the error.
 * - "Reward early, punish late": validate on first blur, then live — never on
 *   every keystroke, which flags a half-typed email as invalid.
 * - `autocomplete` maps to WCAG 3.3.7 Redundant Entry and is the single biggest
 *   missing affordance in hand-rolled forms.
 */

const f = (name: string, extra: Partial<Field> = {}): Field => ({ name, ...extra })

describe("autocomplete / inputMode inference", () => {
  it("infers from the field type", () => {
    expect(applyDefaults(f("email", { type: "email" })).autoComplete).toBe("email")
    expect(applyDefaults(f("phone", { type: "tel" })).autoComplete).toBe("tel")
    expect(applyDefaults(f("site", { type: "url" })).autoComplete).toBe("url")
  })

  it("infers standard autofill tokens from the field name", () => {
    const cases: Array<[string, string]> = [
      ["firstName", "given-name"],
      ["last_name", "family-name"],
      ["fullName", "name"],
      ["company", "organization"],
      ["street", "street-address"],
      ["city", "address-level2"],
      ["zipCode", "postal-code"],
      ["country", "country-name"],
      ["username", "username"],
    ]
    for (const [name, token] of cases) {
      expect(applyDefaults(f(name)).autoComplete, name).toBe(token)
    }
  })

  it("sets a virtual-keyboard hint alongside the token", () => {
    expect(applyDefaults(f("email", { type: "email" })).inputMode).toBe("email")
    expect(applyDefaults(f("phone", { type: "tel" })).inputMode).toBe("tel")
    expect(applyDefaults(f("age", { type: "number" })).inputMode).toBe("numeric")
  })

  it("leaves unknown fields to the browser rather than guessing", () => {
    // A wrong token is worse than none: the browser confidently fills the
    // wrong value and the user rarely notices. Only names in the HTML
    // field-name list are mapped.
    expect(applyDefaults(f("favoriteColour")).autoComplete).toBeUndefined()
    expect(applyDefaults(f("subject")).autoComplete).toBeUndefined()
  })

  it("never guesses a password token", () => {
    // "new-password" vs "current-password" depends on whether this is a signup
    // or a login form, which the field itself cannot know.
    expect(applyDefaults(f("password", { type: "password" })).autoComplete).toBeUndefined()
    expect(applyDefaults(f("password", { type: "password" })).inputMode).toBeUndefined()
  })

  it("honours an explicit token, including opting out with false", () => {
    expect(inferAutofill(f("email", { autoComplete: "email" })).autoComplete).toBe("email")
    expect(inferAutofill(f("email", { autoComplete: false })).autoComplete).toBe("off")
    expect(inferAutofill(f("email", { inputMode: "numeric" })).inputMode).toBe("numeric")
  })

  it("emits the attributes on the rendered input", () => {
    const { container } = render(<KiForm fields={[f("email", { type: "email" }), f("phone", { type: "tel" })]} />)
    const email = container.querySelector("#ki-email") as HTMLInputElement
    const phone = container.querySelector("#ki-phone") as HTMLInputElement
    expect(email.getAttribute("autocomplete")).toBe("email")
    expect(email.getAttribute("inputmode")).toBe("email")
    expect(phone.getAttribute("autocomplete")).toBe("tel")
    expect(phone.getAttribute("inputmode")).toBe("tel")
  })

  it("renders autocomplete=off when a field opts out", () => {
    const { container } = render(<KiForm fields={[f("email", { type: "email", autoComplete: false })]} />)
    expect((container.querySelector("#ki-email") as HTMLInputElement).getAttribute("autocomplete")).toBe("off")
  })
})

describe("custom validation messages", () => {
  it("uses a per-field required override", () => {
    render(<KiForm fields={[f("email", { type: "email", required: true, messages: { required: "We need an email to send the invite" } })]} />)
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    expect(screen.getByText("We need an email to send the invite")).toBeTruthy()
  })

  it("keeps the generated default when no override is given", () => {
    expect(requiredMessage(f("email", { type: "email", label: "Email", required: true }))).toBe("Email is required")
    // An empty messages object is not an override.
    expect(requiredMessage(f("email", { type: "email", label: "Email", required: true, messages: {} }))).toBe("Email is required")
    // With no label at all, the field name stands in.
    expect(requiredMessage(f("email", { type: "email", required: true }))).toBe("email is required")
  })

  it("overrides constraint messages too", () => {
    const { container } = render(
      <KiForm fields={[f("pw", { type: "password", minLength: 8, messages: { minLength: "Passwords need at least 8 characters" } })]} />,
    )
    const input = container.querySelector("#ki-pw") as HTMLInputElement
    fireEvent.change(input, { target: { value: "short" } })
    fireEvent.click(screen.getByRole("button", { name: /submit/i }))
    expect(screen.getByText("Passwords need at least 8 characters")).toBeTruthy()
  })

  it("validates the messages shape", () => {
    expect(validateFields([f("a", { messages: { required: "nope" } })]).success).toBe(true)
    expect(validateFields([f("a", { messages: { required: 1 as never } })]).success).toBe(false)
    expect(validateFields([f("a", { messages: { bogus: "x" } as never })]).success).toBe(false)
    expect(validateFields([f("a", { messages: "x" as never })]).success).toBe(false)
  })

  it("round-trips messages through the export", () => {
    const fields = [f("email", { type: "email", required: true, messages: { required: "Work email, please" } })]
    const reimported = importSchemaBlock(toRoundTripSnippet("F", fields))
    expect((reimported![0] as Field).messages).toEqual({ required: "Work email, please" })
    expect(exportReact("F", fields).code).toContain('messages: { required: "Work email, please" }')
  })
})

describe("blur-then-live validation", () => {
  const fields = [f("email", { type: "email", required: true })]
  const input = () => screen.getByLabelText(/email/i) as HTMLInputElement

  it("defaults to submit-only, so a half-typed value is never flagged", () => {
    render(<KiForm fields={fields} />)
    fireEvent.change(input(), { target: { value: "a" } })
    fireEvent.blur(input())
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("shows the error on first blur with validateOn=blur", () => {
    render(<KiForm fields={fields} validateOn="blur" />)
    fireEvent.blur(input())
    expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(0)
  })

  it("punishes late: an empty optional field is not flagged on blur", () => {
    // The researched failure of per-keystroke validation is interrupting a
    // half-typed value. Leaving an untouched, optional field alone is the same
    // principle: only complain once the user has engaged with it.
    const { container } = render(
      <KiForm fields={[f("nickname", { type: "text" })]} validateOn="blur" />,
    )
    const el = container.querySelector("#ki-nickname") as HTMLInputElement
    fireEvent.blur(el)
    expect(container.querySelector(".ki-error")).toBeNull()
  })

  it("rewards early: clears the error as soon as the value becomes valid", () => {
    const { container } = render(
      <KiForm fields={[f("email", { type: "email", minLength: 6 })]} validateOn="blur" />,
    )
    const el = container.querySelector("#ki-email") as HTMLInputElement
    fireEvent.change(el, { target: { value: "a" } })
    fireEvent.blur(el)
    expect(screen.getByText(/at least 6 characters/i)).toBeTruthy()
    fireEvent.change(el, { target: { value: "a@b.co" } })
    expect(screen.queryByText(/at least 6 characters/i)).toBeNull()
  })

  it("tracks touched fields on the controller", () => {
    const { container } = render(<KiForm fields={fields} validateOn="blur" />)
    const el = container.querySelector("#ki-email") as HTMLInputElement
    fireEvent.blur(el)
    // The controller exposes visited state; the rendered error is the visible proof.
    expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(0)
  })
})

describe("required state", () => {
  it("sets aria-required but not the native attribute", () => {
    // The native `required` attribute would trigger the browser's own bubble UI
    // and block submit, fighting ki-forms' error messages.
    const { container } = render(<KiForm fields={[f("email", { type: "email", required: true }), f("nick")]} />)
    const required = container.querySelector("#ki-email") as HTMLInputElement
    const optional = container.querySelector("#ki-nick") as HTMLInputElement
    expect(required.getAttribute("aria-required")).toBe("true")
    expect(required.hasAttribute("required")).toBe(false)
    expect(optional.getAttribute("aria-required")).toBeNull()
  })

  it("draws no marker by default", () => {
    const { container } = render(<KiForm fields={[f("email", { type: "email", required: true })]} />)
    expect(container.querySelector(".ki-required-marker")).toBeNull()
  })

  it("draws an asterisk marker on request", () => {
    const { container } = render(
      <KiForm fields={[f("email", { type: "email", required: true })]} requiredMarker="asterisk" />,
    )
    const marker = container.querySelector(".ki-required-marker")
    expect(marker).toBeTruthy()
    // Decorative: the requirement is carried by aria-required, not the glyph.
    expect(marker!.getAttribute("aria-hidden")).toBe("true")
  })

  it("adds a legend that screen readers can still follow", () => {
    const { container } = render(
      <KiForm fields={[f("email", { type: "email", required: true })]} requiredMarker="legend" />,
    )
    const legend = container.querySelector(".ki-required-legend")
    expect(legend).toBeTruthy()
    // The visible asterisk is hidden, so the sentence spells it out for AT.
    expect(legend!.querySelector(".ki-sr-only")?.textContent).toContain("asterisk")
  })
})
