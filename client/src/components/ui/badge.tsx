import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border bg-white shadow-sm",
        notes: "bg-[#e2f5e9] text-[#22c55e] border-transparent uppercase tracking-wider font-black px-2 py-0.5",
        exam: "bg-[#f3e8ff] text-[#a855f7] border-transparent uppercase tracking-wider font-black px-2 py-0.5",
        general: "bg-[#fee2e2] text-[#f54c4c] border-transparent uppercase tracking-wider font-black px-2 py-0.5",
        archived: "bg-[#f1f5f9] text-[#94a3b8] border-transparent uppercase tracking-wider font-black px-2 py-0.5",
        presentation: "bg-[#fef9c3] text-[#ca8a04] border-transparent uppercase tracking-wider font-black px-2 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
