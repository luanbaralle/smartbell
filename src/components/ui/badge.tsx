import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-slate-800 text-slate-100 border border-slate-700",
  success:
    "bg-success/20 text-success border border-success/40",
  warning:
    "bg-warning/20 text-warning border border-warning/40",
  danger:
    "bg-danger/20 text-danger border border-danger/40",
  outline:
    "border border-slate-700 text-slate-200 bg-transparent"
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };

