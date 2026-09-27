import type { Field } from "../types"

/**
 * `autocomplete` / `inputMode` inference (2.5.0).
 *
 * The attribute has been in the HTML spec since 2012 and adoption is still
 * poor, which leaves browsers guessing a field's purpose from its `name` or
 * `id`. Guessing goes wrong in ways users rarely notice: a "First name" field
 * filled with a full name, or a shipping address dropped into billing.
 *
 * Beyond convenience this is an accessibility mechanism — it is what lets a
 * browser fill the whole form in one tap for users with motor, memory, or
 * cognitive disabilities, and it maps to WCAG 3.3.7 Redundant Entry.
 *
 * Deliberately conservative: a wrong token is worse than none, because the
 * browser will confidently fill the wrong value. Anything not listed here is
 * left to the browser, and `autoComplete: false` opts a field out entirely.
 */

/** Virtual keyboard hint per field type. */
const INPUT_MODE_BY_TYPE: Partial<Record<string, NonNullable<Field["inputMode"]>>> = {
  email: "email",
  tel: "tel",
  url: "url",
  number: "numeric",
  search: "search",
}

/** Autofill token per field type. */
const AUTOCOMPLETE_BY_TYPE: Partial<Record<string, string>> = {
  email: "email",
  tel: "tel",
  url: "url",
}

/**
 * Autofill tokens by field name, from the HTML autofill field-name list.
 * Keys are normalized (lowercased, non-alphanumerics stripped) so "firstName",
 * "first_name", and "First Name" all match.
 */
const AUTOCOMPLETE_BY_NAME: Record<string, string> = {
  // Identity
  firstname: "given-name",
  givenname: "given-name",
  lastname: "family-name",
  familyname: "family-name",
  surname: "family-name",
  middlename: "additional-name",
  fullname: "name",
  name: "name",
  username: "username",
  nickname: "nickname",
  // Credentials
  newpassword: "new-password",
  currentpassword: "current-password",
  onepassword: "current-password",
  // Contact
  email: "email",
  emailaddress: "email",
  phone: "tel",
  phonenumber: "tel",
  mobile: "tel",
  tel: "tel",
  // Organization
  company: "organization",
  organization: "organization",
  jobtitle: "organization-title",
  // Address
  street: "street-address",
  streetaddress: "street-address",
  addressline1: "address-line1",
  addressline2: "address-line2",
  address: "street-address",
  city: "address-level2",
  town: "address-level2",
  state: "address-level1",
  province: "address-level1",
  region: "address-level1",
  zip: "postal-code",
  zipcode: "postal-code",
  postcode: "postal-code",
  postalcode: "postal-code",
  country: "country-name",
  countryname: "country-name",
}

/** Reduce a field name to a lookup key: "firstName" -> "firstname". */
function nameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export type AutofillHints = {
  autoComplete?: string
  inputMode?: NonNullable<Field["inputMode"]>
}

/**
 * Resolve the effective hints for a field.
 *
 * An explicit `field.autoComplete` always wins — including `false`, which is
 * how a caller opts out of a token we would otherwise infer.
 */
export function inferAutofill(field: Field): AutofillHints {
  if (field.autoComplete === false) {
    return { autoComplete: "off", inputMode: field.inputMode ?? INPUT_MODE_BY_TYPE[field.type ?? "text"] }
  }
  if (typeof field.autoComplete === "string") {
    return { autoComplete: field.autoComplete, inputMode: field.inputMode ?? INPUT_MODE_BY_TYPE[field.type ?? "text"] }
  }

  const type = field.type ?? "text"
  const inputMode = field.inputMode ?? INPUT_MODE_BY_TYPE[type]
  const byName = AUTOCOMPLETE_BY_NAME[nameKey(field.name)]
  const autoComplete = byName ?? AUTOCOMPLETE_BY_TYPE[type]

  return {
    ...(autoComplete ? { autoComplete } : {}),
    ...(inputMode ? { inputMode } : {}),
  }
}
