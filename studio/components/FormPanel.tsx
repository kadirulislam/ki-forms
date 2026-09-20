import { cn } from "../lib/utils"
import { Rows3, MessagesSquare } from "lucide-react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

export type FormPanelProps = {
  formTitle: string
  onTitleChange: (title: string) => void
  variant: "classic" | "conversational"
  onVariantChange: (variant: "classic" | "conversational") => void
}

export function FormPanel({ formTitle, onTitleChange, variant, onVariantChange }: FormPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <Label htmlFor="form-name" className="text-xs text-muted-foreground">Form name</Label>
        <Input
          id="form-name"
          type="text"
          value={formTitle}
          placeholder="Untitled form"
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">Layout</div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "classic", icon: <Rows3 />, name: "Classic", desc: "All fields on one page" },
              { id: "conversational", icon: <MessagesSquare />, name: "Conversational", desc: "One question per step" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={variant === v.id}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                "hover:bg-accent",
                variant === v.id && "border-[--studio-accent] bg-accent ring-1 ring-[--studio-accent]/30",
              )}
              onClick={() => onVariantChange(v.id)}
            >
              <span className="text-[--studio-accent] [&_svg]:size-4">{v.icon}</span>
              <strong className="text-sm font-medium">{v.name}</strong>
              <span className="text-xs text-muted-foreground">{v.desc}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {variant === "conversational"
            ? 'Exports with variant="conversational" — stepper UI, Enter-to-advance, conditional fields skipped automatically.'
            : "Exports as a single-page form — the classic ki-forms layout."}
        </p>
      </section>
    </div>
  )
}
