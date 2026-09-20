import * as React from "react"
import { cn } from "../../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
        "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground selection:bg-[--studio-accent] selection:text-white",
        "focus-visible:border-[--studio-accent] focus-visible:ring-[--studio-accent]/30 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
