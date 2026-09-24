import { useState } from "react";
import { Search, Inbox } from "lucide-react";

const cx = (...c) => c.filter(Boolean).join(" ");
export { cx };

// ── Button ────────────────────────────────────────────────────────────────────
const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    secondary: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-700",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
    light: "bg-white/15 hover:bg-white/25 text-white",
};
const sizes = {
    xs: "h-7 px-2 text-xs gap-1",
    sm: "h-8 px-3 text-sm gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-11 px-6 text-base gap-2",
    icon: "h-8 w-8 justify-center",
};

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }) {
    return (
        <button
            type={type}
            className={cx(
                "inline-flex items-center justify-center rounded-lg font-medium transition-colors whitespace-nowrap",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                "disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}

// ── Form controls ─────────────────────────────────────────────────────────────
const control =
    "w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 " +
    "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition " +
    "read-only:bg-gray-50 read-only:text-gray-600 disabled:bg-gray-100 disabled:text-gray-500";

export function Input({ className, error, ...props }) {
    return <input className={cx(control, "h-10", error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20", className)} {...props} />;
}

export function Textarea({ className, ...props }) {
    return <textarea className={cx(control, "py-2 min-h-20", className)} {...props} />;
}

export function Select({ className, children, placeholder, error, ...props }) {
    return (
        <select className={cx(control, "h-10 pr-8", error && "border-rose-400", className)} {...props}>
            {placeholder !== undefined && <option value="">{placeholder}</option>}
            {children}
        </select>
    );
}

export function Label({ className, children, required, ...props }) {
    return (
        <label className={cx("block text-xs font-semibold text-gray-600 mb-1", className)} {...props}>
            {children} {required && <span className="text-rose-500">*</span>}
        </label>
    );
}

export function Field({ label, required, error, hint, className, children }) {
    return (
        <div className={className}>
            {label && <Label required={required}>{label}</Label>}
            {children}
            {error ? (
                <p className="text-xs text-rose-600 mt-1">{error}</p>
            ) : hint ? (
                <p className="text-xs text-gray-500 mt-1">{hint}</p>
            ) : null}
        </div>
    );
}

export function Checkbox({ label, checked, onChange, className }) {
    return (
        <label className={cx("inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700", className)}>
            <input
                type="checkbox"
                checked={!!checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-indigo-600"
            />
            {label}
        </label>
    );
}

// ── Layout pieces ─────────────────────────────────────────────────────────────
export function Card({ className, ...props }) {
    return <div className={cx("bg-white rounded-xl border border-gray-200 shadow-sm", className)} {...props} />;
}

export function SectionTitle({ children, className, right }) {
    return (
        <div className={cx("flex items-center justify-between bg-indigo-700 text-white px-4 py-2.5 rounded-xl mb-4", className)}>
            <h3 className="font-semibold text-sm">{children}</h3>
            {right}
        </div>
    );
}

export function PageHeader({ icon: Icon, title, subtitle, actions }) {
    return (
        <div className="flex flex-wrap gap-3 justify-between items-center mb-6 bg-indigo-800 px-6 py-5 rounded-2xl shadow">
            <div className="flex items-center gap-3">
                {Icon && (
                    <div className="p-2.5 bg-white/10 rounded-xl">
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                )}
                <div>
                    <h1 className="text-xl font-bold text-white">{title}</h1>
                    {subtitle && <p className="text-indigo-200 text-sm">{subtitle}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function StatCard({ label, value, sub, icon: Icon, tone = "indigo", onClick }) {
    const tones = {
        indigo: "bg-indigo-50 text-indigo-700",
        emerald: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        rose: "bg-rose-50 text-rose-700",
        sky: "bg-sky-50 text-sky-700",
        violet: "bg-violet-50 text-violet-700",
        slate: "bg-slate-100 text-slate-700",
    };
    return (
        <Card
            className={cx("p-4 flex items-center gap-3", onClick && "cursor-pointer hover:border-indigo-300 hover:shadow transition")}
            onClick={onClick}
        >
            {Icon && (
                <div className={cx("p-2.5 rounded-xl shrink-0 hidden sm:block", tones[tone])}>
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500">{label}</p>
                <p className="text-lg font-bold text-gray-900 tabular-nums leading-tight wrap-break-word">{value}</p>
                {sub && <p className="text-xs text-gray-500">{sub}</p>}
            </div>
        </Card>
    );
}

export function InfoRow({ label, value, className }) {
    return (
        <div className={cx("flex justify-between gap-4 py-1.5 border-b border-dashed border-gray-200 last:border-0 text-sm", className)}>
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-900 text-right">{value ?? "—"}</span>
        </div>
    );
}

export function InfoGrid({ items, cols = 3 }) {
    const colClass = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[cols];
    return (
        <div className={cx("grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3", colClass)}>
            {items.map(([label, value]) => (
                <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-900 wrap-break-word">{value || value === 0 ? value : "—"}</p>
                </div>
            ))}
        </div>
    );
}

// ── Badges ────────────────────────────────────────────────────────────────────
const badgeTones = {
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    sky: "bg-sky-50 text-sky-700 ring-sky-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function Badge({ tone = "gray", children, className }) {
    return (
        <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", badgeTones[tone], className)}>
            {children}
        </span>
    );
}

const statusTones = {
    Registered: "gray",
    Draft: "gray",
    Deferred: "amber",
    Appraised: "sky",
    Approved: "violet",
    Rejected: "rose",
    Disbursed: "indigo",
    Closed: "emerald",
    Active: "emerald",
    Inactive: "gray",
    Dormant: "amber",
    Paid: "emerald",
    Partial: "sky",
    Pending: "gray",
    Overdue: "rose",
    "Partial / Overdue": "rose",
    Performing: "emerald",
    Watch: "amber",
    Substandard: "amber",
    Doubtful: "rose",
    Loss: "rose",
};

export function StatusBadge({ status, deferred }) {
    if (deferred && status === "Registered") return <Badge tone="amber">Deferred</Badge>;
    const label = status === "Registered" ? "Draft" : status;
    return <Badge tone={statusTones[status] || "gray"}>{label}</Badge>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, value, onChange, className, dark = false }) {
    return (
        <div className={cx("flex flex-wrap gap-1 p-1 rounded-xl", dark ? "bg-indigo-800" : "bg-gray-100", className)} role="tablist">
            {tabs.map((t) => {
                const active = t.value === value;
                return (
                    <button
                        key={t.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(t.value)}
                        className={cx(
                            "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition cursor-pointer",
                            dark
                                ? active
                                    ? "bg-white text-indigo-800 shadow"
                                    : "text-indigo-100 hover:bg-indigo-700"
                                : active
                                    ? "bg-white text-indigo-700 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        {t.icon && <t.icon className="w-4 h-4" />}
                        {t.label}
                        {t.count !== undefined && (
                            <span
                                className={cx(
                                    "min-w-5 h-5 px-1.5 rounded-full text-[11px] flex items-center justify-center tabular-nums",
                                    dark ? (active ? "bg-indigo-100 text-indigo-800" : "bg-indigo-700 text-white") : active ? "bg-indigo-100" : "bg-gray-200"
                                )}
                            >
                                {t.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = "Search...", className }) {
    return (
        <div className={cx("relative", className)}>
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
        </div>
    );
}

export function EmptyState({ title = "Nothing here yet", message, action }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="p-3 rounded-full bg-gray-100 mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
            </div>
            <p className="font-medium text-gray-700">{title}</p>
            {message && <p className="text-sm text-gray-500 mt-1 max-w-sm">{message}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

export function Avatar({ src, text, size = "md" }) {
    const s = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-lg" }[size];
    return src ? (
        <img src={src} alt="" className={cx(s, "rounded-full object-cover ring-2 ring-white")} />
    ) : (
        <div className={cx(s, "rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center shrink-0")}>{text}</div>
    );
}

/** Horizontal single-hue magnitude bar with direct label */
export function MeterRow({ label, value, max, display, sub }) {
    const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
    const [hover, setHover] = useState(false);
    return (
        <div className="py-1.5" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 truncate">{label}</span>
                <span className="font-medium text-gray-900 tabular-nums">{display}</span>
            </div>
            <div className="h-2.5 rounded bg-gray-100 overflow-hidden" title={`${label}: ${display}${sub ? ` · ${sub}` : ""}`}>
                <div className={cx("h-full rounded transition-all", hover ? "bg-indigo-700" : "bg-indigo-500")} style={{ width: `${pct}%` }} />
            </div>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}
