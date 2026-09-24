import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, FileText, Send, CheckCircle2, XCircle, Banknote, Calculator, Package, Layers, ListTree, ArrowRight } from "lucide-react";
import { Card, MeterRow, PageHeader, StatCard, StatusBadge } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { fmt, fmtCompact, fmtDate, fullName, kes } from "@/lib/format";
import { classifyLoan, loanPosition } from "@/lib/loanMath";

export default function Loaning() {
    const navigate = useNavigate();
    const { loans, products, sectors, subSectors, getMember } = useData();

    const count = (s) => loans.filter((l) => l.status === s).length;
    const running = useMemo(() => loans.filter((l) => l.status === "Disbursed").map((l) => ({ ...l, pos: loanPosition(l) })), [loans]);

    const byProduct = products
        .map((p) => {
            const ls = running.filter((l) => l.productId === p.id);
            return { name: p.name, balance: ls.reduce((s, l) => s + l.pos.balance, 0), count: ls.length };
        })
        .filter((p) => p.count > 0)
        .sort((a, b) => b.balance - a.balance);
    const maxProduct = Math.max(0, ...byProduct.map((p) => p.balance));

    const classes = ["Performing", "Watch", "Substandard", "Doubtful", "Loss"].map((c) => {
        const ls = running.filter((l) => classifyLoan(l.pos.daysInArrears) === c);
        return { name: c, count: ls.length, balance: ls.reduce((s, l) => s + l.pos.balance, 0) };
    });
    const maxClass = Math.max(0, ...classes.map((c) => c.balance));

    const stats = [
        { label: "Draft Loans", value: count("Registered"), icon: FileText, tone: "slate" },
        { label: "Appraised Loans", value: count("Appraised"), icon: Send, tone: "sky" },
        { label: "Approved Loans", value: count("Approved"), icon: CheckCircle2, tone: "violet" },
        { label: "Rejected Loans", value: count("Rejected"), icon: XCircle, tone: "rose" },
        { label: "Disbursed Loans", value: count("Disbursed"), icon: Banknote, tone: "emerald" },
    ];

    return (
        <div>
            <PageHeader icon={Landmark} title="Loan Management Dashboard" subtitle="Overview of loan performance and operations" />

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {stats.map((s) => (
                    <StatCard key={s.label} {...s} onClick={() => navigate("/loaning/applications")} />
                ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: "Loan Products", value: products.length, sub: `${products.filter((p) => p.active).length} active`, icon: Package, to: "/loaning/products", cls: "from-indigo-500 to-indigo-700" },
                    { label: "Sectors", value: sectors.length, sub: "Active classification", icon: Layers, to: "/loaning/sectors", cls: "from-emerald-500 to-emerald-700" },
                    { label: "Sub Sectors", value: subSectors.length, sub: "Active classification", icon: ListTree, to: "/loaning/sub-sectors", cls: "from-amber-500 to-amber-600" },
                    { label: "Loan Calculator", value: "Open", sub: "Estimate a schedule", icon: Calculator, to: "/loaning/calculator", cls: "from-rose-500 to-rose-600" },
                ].map((c) => (
                    <button
                        key={c.label}
                        type="button"
                        onClick={() => navigate(c.to)}
                        className={`text-left rounded-2xl shadow-md bg-gradient-to-br ${c.cls} text-white p-5 hover:shadow-lg transition cursor-pointer`}
                    >
                        <div className="flex justify-between items-start">
                            <p className="text-sm opacity-90">{c.label}</p>
                            <c.icon className="w-5 h-5 opacity-80" />
                        </div>
                        <p className="text-3xl font-bold mt-2">{c.value}</p>
                        <p className="text-xs mt-3 opacity-80 flex items-center gap-1">
                            {c.sub} <ArrowRight className="w-3 h-3" />
                        </p>
                    </button>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-6">
                <Card className="p-5">
                    <p className="font-semibold text-gray-900">Outstanding balance by product</p>
                    <p className="text-xs text-gray-500 mb-3">Running loans, KES</p>
                    {byProduct.length ? (
                        byProduct.map((p) => <MeterRow key={p.name} label={p.name} value={p.balance} max={maxProduct} display={fmtCompact(p.balance)} sub={`${p.count} loan(s)`} />)
                    ) : (
                        <p className="text-sm text-gray-500 py-6 text-center">No running loans yet.</p>
                    )}
                </Card>
                <Card className="p-5">
                    <p className="font-semibold text-gray-900">Portfolio classification</p>
                    <p className="text-xs text-gray-500 mb-3">Outstanding balance by days in arrears, KES</p>
                    {classes.map((c) => (
                        <MeterRow key={c.name} label={`${c.name} (${c.count})`} value={c.balance} max={maxClass} display={fmtCompact(c.balance)} />
                    ))}
                </Card>
            </div>

            <Card className="p-5">
                <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-gray-900">Latest applications</p>
                    <button type="button" className="text-sm text-indigo-600 hover:underline cursor-pointer" onClick={() => navigate("/loaning/applications")}>
                        View all
                    </button>
                </div>
                <div className="divide-y divide-gray-100">
                    {[...loans]
                        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
                        .slice(0, 6)
                        .map((l) => (
                            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {l.loanNumber} · {fullName(getMember(l.memberId))}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {l.productName} · {fmtDate(l.receivedDate)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="tabular-nums">{kes(l.amountApplied)}</span>
                                    <StatusBadge status={l.status} deferred={l.deferred} />
                                </div>
                            </div>
                        ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">Total disbursed to date: {kes(loans.reduce((s, l) => s + Number(l.disbursedAmount || 0), 0))} · Average loan {fmt(running.length ? running.reduce((s, l) => s + l.disbursedAmount, 0) / running.length : 0)}</p>
            </Card>
        </div>
    );
}
