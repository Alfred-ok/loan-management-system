import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, PiggyBank, Wallet, Banknote, AlertTriangle, UserPlus, FilePlus2, HandCoins, Calculator, Activity } from "lucide-react";
import { Card, MeterRow, StatCard } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { fmtCompact, fmtDateTime, kes } from "@/lib/format";
import { loanPosition } from "@/lib/loanMath";

const PIPELINE = [
    ["Registered", "Draft"],
    ["Appraised", "Appraised"],
    ["Approved", "Approved"],
    ["Disbursed", "Disbursed"],
    ["Closed", "Closed"],
    ["Rejected", "Rejected"],
];

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, can } = useAuth();
    const { members, loans, transactions, activity } = useData();

    const stats = useMemo(() => {
        const sum = (acc) => transactions.filter((t) => t.account === acc).reduce((s, t) => s + (t.type === "Credit" ? 1 : -1) * t.amount, 0);
        const running = loans.filter((l) => l.status === "Disbursed").map((l) => loanPosition(l));
        return {
            deposits: sum("DEPOSITS"),
            shares: sum("SHARES"),
            portfolio: running.reduce((s, p) => s + p.balance, 0),
            arrears: running.reduce((s, p) => s + p.arrears, 0),
            inArrears: running.filter((p) => p.arrears > 0).length,
            runningCount: running.length,
            disbursed: loans.reduce((s, l) => s + Number(l.disbursedAmount || 0), 0),
        };
    }, [loans, transactions]);

    const pipeline = PIPELINE.map(([status, label]) => ({
        label,
        count: loans.filter((l) => l.status === status).length,
        amount: loans.filter((l) => l.status === status).reduce((s, l) => s + Number(l.disbursedAmount || l.approval?.amount || l.amountApplied), 0),
    }));
    const maxPipe = Math.max(0, ...pipeline.map((p) => p.amount));

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const quick = [
        can("members") && { label: "Register Member", icon: UserPlus, to: "/membership/members" },
        can("loans.draft") && { label: "New Loan Application", icon: FilePlus2, to: "/loaning/applications" },
        can("loans.repay") && { label: "Post Repayment", icon: HandCoins, to: "/loaning/repayments" },
        { label: "Loan Calculator", icon: Calculator, to: "/loaning/calculator" },
    ].filter(Boolean);

    return (
        <div>
            <div className="mb-6 bg-gradient-to-r from-indigo-800 to-indigo-600 p-6 rounded-2xl shadow text-white">
                <h1 className="text-2xl font-bold">
                    {greeting}, {user?.name?.split(" ")[0]} 👋
                </h1>
                <p className="text-indigo-100 text-sm mt-1">Here is how the sacco is doing today.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                    {quick.map((q) => (
                        <button
                            key={q.label}
                            type="button"
                            onClick={() => navigate(q.to)}
                            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-sm cursor-pointer"
                        >
                            <q.icon className="w-4 h-4" /> {q.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard icon={Users} label="Members" value={members.length} sub={`${members.filter((m) => m.status === "Active").length} active`} onClick={() => navigate("/membership/members")} />
                <StatCard icon={PiggyBank} label="Member Deposits" value={kes(stats.deposits)} tone="sky" />
                <StatCard icon={Wallet} label="Share Capital" value={kes(stats.shares)} tone="violet" />
                <StatCard icon={Banknote} label="Loan Portfolio" value={kes(stats.portfolio)} sub={`${stats.runningCount} running loans`} tone="emerald" onClick={() => navigate("/loaning/register")} />
                <StatCard icon={AlertTriangle} label="Arrears" value={kes(stats.arrears)} sub={`${stats.inArrears} loans`} tone="rose" onClick={() => navigate("/loaning/repayments")} />
            </div>

            <div className="grid lg:grid-cols-5 gap-4">
                <Card className="p-5 lg:col-span-3">
                    <p className="font-semibold text-gray-900">Loan pipeline</p>
                    <p className="text-xs text-gray-500 mb-3">Value of loans at each stage, KES</p>
                    {pipeline.map((p) => (
                        <MeterRow key={p.label} label={`${p.label} (${p.count})`} value={p.amount} max={maxPipe} display={fmtCompact(p.amount)} />
                    ))}
                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Disbursed to date</p>
                            <p className="font-semibold tabular-nums">{kes(stats.disbursed)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500">Loan-to-deposit ratio</p>
                            <p className="font-semibold tabular-nums">{stats.deposits ? `${((stats.portfolio / stats.deposits) * 100).toFixed(1)}%` : "—"}</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 lg:col-span-2">
                    <p className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                        <Activity className="w-4 h-4 text-indigo-600" /> Recent activity
                    </p>
                    <ul className="space-y-3 max-h-96 overflow-y-auto">
                        {activity.slice(0, 12).map((a) => (
                            <li key={a.id} className="text-sm border-l-2 border-indigo-200 pl-3">
                                <p className="text-gray-800">{a.action}</p>
                                <p className="text-xs text-gray-500">
                                    {a.entity} · {a.user} · {fmtDateTime(a.date)}
                                </p>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    );
}
