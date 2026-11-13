import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold transition-colors select-none disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  // Primary pill: black fill, white text (DESIGN.md › Primary Pill Button)
  primary: "bg-ink text-white hover:bg-graphite active:bg-black",
  // Secondary pill: white fill, ink text, 1px border gray
  secondary: "bg-white text-ink border border-border-gray hover:border-ink",
  ghost: "bg-transparent text-ink hover:bg-soft-gray",
  // Destructive stays monochrome-ish; uses the muted rose text only as a cue, never as a fill.
  danger: "bg-white text-sale-text border border-border-gray hover:border-sale-text",
  link: "bg-transparent px-0 text-ink underline-offset-4 hover:underline font-medium",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-body-sm",
  md: "h-10 px-5 text-[13px]",
  lg: "h-12 px-6 text-body",
};

export interface ButtonStyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
}

export const buttonClass = ({ variant = "primary", size = "md", block, className }: ButtonStyleProps = {}) =>
  cn(base, variants[variant], variant === "link" ? "h-auto" : sizes[size], block && "w-full", className);

export function Button({
  variant,
  size,
  block,
  className,
  loading,
  children,
  type = "button",
  ...rest
}: ButtonStyleProps & ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} disabled={rest.disabled || loading} {...rest}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: ButtonStyleProps & ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link className={buttonClass({ variant, size, block, className })} {...rest}>
      {children}
    </Link>
  );
}

/** Small round icon button (wishlist, back, close). White, hairline + floating shadow when `floating`. */
export function IconButton({
  label,
  floating,
  className,
  children,
  type = "button",
  ...rest
}: ComponentProps<"button"> & { label: string; floating?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink transition-colors hover:bg-soft-gray disabled:opacity-40",
        floating ? "shadow-floating" : "border border-border-gray",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}
