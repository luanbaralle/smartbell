"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonVariants = {
  default:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
  outline:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-slate-700 bg-transparent px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
} as const;

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-xs",
  lg: "h-12 px-6 text-base"
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        className={cn(buttonVariants[variant], buttonSizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

