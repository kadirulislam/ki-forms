import { Toaster as Sonner, type ToasterProps } from "sonner"

/** Studio Toaster — shadcn sonner, token-aware (light/dark via .dark class). */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:!rounded-lg group-[.toaster]:!border-border group-[.toaster]:!bg-popover group-[.toaster]:!text-popover-foreground group-[.toaster]:!shadow-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
