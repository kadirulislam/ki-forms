import type { FieldInput } from "../types"

export type StudioTemplate = {
  id: string
  name: string
  description: string
  fields: FieldInput[]
}

export const TEMPLATES: StudioTemplate[] = [
  {
    id: "blank",
    name: "Blank canvas",
    description: "One empty text field",
    fields: [{ name: "name", type: "text", label: "Full name", placeholder: "Your name" }],
  },
  {
    id: "waitlist",
    name: "Waitlist",
    description: "Classic email-only signup",
    fields: [
      { name: "email", type: "email", placeholder: "you@company.com", required: true, helperText: "We will only use this to notify you" },
      { name: "source", type: "select", label: "How did you hear about us?", options: ["Twitter / X", "GitHub", "A friend", "Other"] },
    ],
  },
  {
    id: "contact",
    name: "Contact form",
    description: "Message form with a subject picker",
    fields: [
      // Paired halves: name and email share a row (2.5.0 width).
      { name: "firstName", type: "text", label: "First name", placeholder: "Ada", width: "half", required: true },
      { name: "lastName", type: "text", label: "Last name", placeholder: "Lovelace", width: "half", required: true },
      { name: "email", type: "email", label: "Email", placeholder: "you@company.com", required: true },
      { name: "phone", type: "tel", label: "Phone", placeholder: "+1 (555) 000-0000", width: "half" },
      { name: "company", type: "text", label: "Company", placeholder: "Acme Inc.", width: "half" },
      { name: "subject", type: "select", label: "Subject", options: ["General", "Support", "Feedback", "Other"] },
      { name: "message", type: "textarea", label: "Message", placeholder: "How can we help?", required: true },
    ],
  },
  {
    id: "signup",
    name: "Signup with conditionals",
    description: "Role select reveals a company field",
    fields: [
      { name: "email", type: "email", placeholder: "you@company.com", required: true },
      { name: "password", type: "password", required: true },
      { name: "role", type: "select", label: "Role", options: ["User", "Admin"], defaultValue: "User" },
      { name: "company", type: "text", label: "Company", placeholder: "Acme Inc.", showIf: { field: "role", equals: "Admin" } },
      { name: "newsletter", type: "checkbox", label: "Send me product updates", helperText: "No spam, ever" },
    ],
  },
  {
    id: "job-app",
    name: "Job application",
    description: "Multi-condition showIf (OR)",
    fields: [
      { name: "fullName", type: "text", label: "Full name", required: true },
      { name: "email", type: "email", placeholder: "you@example.com", required: true },
      { name: "roleType", type: "select", label: "Applying as", options: ["Candidate", "Agency"], defaultValue: "Candidate" },
      {
        name: "portfolio",
        type: "text",
        label: "Portfolio URL",
        placeholder: "https://you.dev",
        showIf: { field: "roleType", equals: "Candidate" },
      },
      {
        name: "agencyName",
        type: "text",
        label: "Agency name",
        showIf: { all: [{ field: "roleType", equals: "Agency" }] },
      },
      { name: "coverLetter", type: "textarea", label: "Why you?", placeholder: "Tell us about yourself" },
    ],
  },
  {
    id: "feedback",
    name: "Feedback",
    description: "Rating plus a follow-up question",
    fields: [
      { name: "email", type: "email", placeholder: "you@company.com" },
      { name: "rating", type: "select", label: "How would you rate ki-forms?", options: ["⭐ 1", "⭐⭐ 2", "⭐⭐⭐ 3", "⭐⭐⭐⭐ 4", "⭐⭐⭐⭐⭐ 5"], defaultValue: "⭐⭐⭐⭐⭐ 5" },
      { name: "whatWentWrong", type: "textarea", label: "What went wrong?", showIf: { field: "rating", notEquals: "⭐⭐⭐⭐⭐ 5" }, helperText: "Be honest — it helps us improve" },
      { name: "testimonialOk", type: "checkbox", label: "We may quote your feedback", showIf: { field: "rating", equals: "⭐⭐⭐⭐⭐ 5" } },
    ],
  },
]
