import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center min-h-[48px] px-6 font-body font-semibold text-xs uppercase tracking-[0.18em] border border-brass rounded-[var(--radius)] transition-[color,background-color,border-color,transform] duration-[var(--t-fast)] ease-[var(--ease-out)] active:translate-y-[1px] motion-reduce:active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-flash focus-visible:outline-offset-2 disabled:opacity-40 disabled:pointer-events-none";
  const styles: Record<Variant, string> = {
    primary:
      "bg-booth-red text-ink border-gold hover:bg-curtain",
    secondary:
      "bg-paper-2 text-ink border-brass hover:border-gold",
    tertiary:
      "bg-transparent text-ink-2 border-transparent underline underline-offset-4 px-2 min-h-[44px] normal-case tracking-normal font-medium hover:text-ink",
  };
  return <button className={cn(base, styles[variant], className)} {...props} />;
}
