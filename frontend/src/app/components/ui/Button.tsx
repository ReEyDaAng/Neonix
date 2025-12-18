"use client";

import React from "react";

type Variant = "default" | "primary" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "default", className = "", ...props }: Props) {
  const v =
    variant === "primary" ? "btn primary" : variant === "ghost" ? "btn ghost" : "btn";

  return <button {...props} className={`${v} ${className}`.trim()} />;
}
