"use client";

import { LoaderCircle } from "lucide-react";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-royal-600 text-white hover:bg-royal-700 shadow-sm shadow-royal-600/30",
  secondary: "bg-white text-navy-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-navy-800",
  danger: "bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50",
  amber: "bg-gold-500 text-navy-900 hover:bg-gold-400 shadow-sm shadow-gold-500/30",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean; icon?: ReactNode }
>(function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({ variant = "secondary", size = "md", className, icon, children, ...rest }: ComponentProps<"a"> & { variant?: Variant; size?: "sm" | "md"; icon?: ReactNode }) {
  return (
    <a
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </a>
  );
}

/* ---------------- Card ---------------- */
export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section className={cx("rounded-2xl border border-slate-200/80 bg-white shadow-card", className)} {...rest}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, icon, actions }: { title: ReactNode; description?: ReactNode; icon?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-royal-50 text-royal-600">{icon}</span>}
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-navy-800">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("px-5 py-5 sm:px-6", className)}>{children}</div>;
}

/* ---------------- Page header ---------------- */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold tracking-wider text-royal-600 uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy-800 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------- Form fields ---------------- */
export function Field({
  label, hint, error, counter, children, className, htmlFor, aside,
}: {
  label: ReactNode; hint?: ReactNode; error?: string; counter?: ReactNode; children: ReactNode; className?: string; htmlFor?: string; aside?: ReactNode;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-navy-800">{label}</label>
        {counter ?? aside}
      </div>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border bg-white px-3 text-sm text-navy-800 placeholder:text-slate-400 transition-shadow focus:outline-none focus:ring-4";
const inputState = (invalid?: boolean) =>
  invalid
    ? "border-red-300 focus:border-red-400 focus:ring-red-100"
    : "border-slate-300/90 hover:border-slate-400/80 focus:border-royal-500 focus:ring-royal-600/15";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input"> & { invalid?: boolean; mono?: boolean }>(
  function Input({ className, invalid, mono, ...rest }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cx(inputBase, "h-10", inputState(invalid), mono && "font-mono text-[13px]", className)} {...rest} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea"> & { invalid?: boolean; mono?: boolean }>(
  function Textarea({ className, invalid, mono, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cx(inputBase, "py-2.5 leading-6", inputState(invalid), mono && "font-mono text-[12.5px] leading-5", className)}
        {...rest}
      />
    );
  },
);

export function Select({ className, invalid, children, ...rest }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select className={cx(inputBase, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9", inputState(invalid), className)} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; description?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-royal-600" : "bg-slate-300",
        )}
      >
        <span className={cx("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
      {(label || description) && (
        <label htmlFor={id} className="cursor-pointer">
          {label && <span className="block text-sm font-semibold text-navy-800">{label}</span>}
          {description && <span className="block text-xs leading-5 text-slate-500">{description}</span>}
        </label>
      )}
    </div>
  );
}

/* ---------------- Badges ---------------- */
type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";
const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-royal-50 text-royal-700 ring-royal-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};
export function Badge({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** "12 / 60" coloured by whether the length sits in the ideal band. */
export function CharCounter({ value, min, max }: { value: string; min: number; max: number }) {
  const n = value.length;
  const tone = n === 0 ? "text-slate-400" : n < min ? "text-amber-600" : n > max ? "text-red-600" : "text-emerald-600";
  const pct = Math.min(100, (n / max) * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-slate-100 sm:block" aria-hidden>
        <span className={cx("block h-full rounded-full", n > max ? "bg-red-500" : n < min ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
      </span>
      <span className={cx("font-mono text-[11.5px] tabular-nums", tone)}>
        {n}/{max}
      </span>
    </span>
  );
}

export function Divider() {
  return <hr className="my-5 border-slate-100" />;
}
