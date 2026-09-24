import { useMemo, useState } from "react";
import { BookOpen, Download, Eye, HandCoins, Wallet, AlertTriangle, TrendingUp, Banknote } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { Button, Card, PageHeader, SearchInput, Select, StatCard, StatusBadge } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { downloadCsv, fmt, fmtDate, fullName, kes } from "@/lib/format";
import { classifyLoan, loanPosition } from "@/lib/loanMath";
import LoanCaseDrawer from "../components/LoanCaseDrawer";
import RepaymentModal from "../components/RepaymentModal";

const STATUSES = ["Registered", "Appraised", "Approved", "Rejected", "Disbursed", "Closed"];

export default function LoanRegister() {
    const { can } = useAuth();
    const { loans, products, getMember } = useData();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [productId, setProductId] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [viewId, setViewId] = useState(null);
    const [repayId, setRepayId] = useState(null);

    const all = useMemo(
        () =>
            loans.map((l) => {
                const m = getMember(l.memberId);
                const live = ["Disbursed", "Closed"].includes(l.status);
                const pos = live ? loanPosition(l) : null;
                return {
                    ...l,
                    memberName: fullName(m),
                    memberNumber: m?.memberNumber,
                    idNumber: m?.individualIdentityCardNumber,
                    principal: Number(l.disbursedAmount || l.approval?.amount || l.amountApplied),
                    paid: pos?.totalPaid || 0,
                    balance: pos?.balance || 0,
                    arrears: pos?.arrears || 0,
                    classification: l.status === "Disbursed" ? classifyLoan(pos.daysInArrears) : "",
                    nextDue: pos?.nextDue?.dueDate,
                };
            }),
        [loans, getMember]
    );

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all
            .filter((l) => (!status || l.status === status) && (!productId || l.productId === productId) && (!classFilter || l.classification === classFilter))
            .filter((l) => !q || `${l.loanNumber} ${l.memberName} ${l.memberNumber} ${l.idNumber}`.toLowerCase().includes(q))
            .sort((a, b) => b.loanNumber.localeCompare(a.loanNumber));
    }, [all, search, status, productId, classFilter]);

    const running = all.filter((l) => l.status === "Disbursed");
    const totals = rows.reduce((t, l) => ({ principal: t.principal + l.principal, paid: t.paid + l.paid, balance: t.balance + l.balance, arrears: t.arrears + l.arrears }), { principal: 0, paid: 0, balance: 0, arrears: 0 });
    const portfolio = running.reduce((s, l) => s + l.balance, 0);
    const arrears = running.reduce((s, l) => s + l.arrears, 0);

    const exportCsv = () =>
        downloadCsv(
            "loan-register.csv",
            rows.map((l) => ({
                LoanNo: l.loanNumber,
                MemberNo: l.memberNumber,
                Member: l.memberName,
                IdNumber: l.idNumber,
                Product: l.productName,
                Rate: l.annualRate,
                TermMonths: l.termMonths,
                Principal: l.principal,
                Paid: l.paid.toFixed(2),
                Balance: l.balance.toFixed(2),
                Arrears: l.arrears.toFixed(2),
                Classification: l.classification,
                Status: l.status,
                Applied: l.receivedDate,
                Disbursed: l.disbursement?.date || "",
            }))
        );

    return (
        <div>
            <PageHeader
                icon={BookOpen}
                title="Loan Register"
                subtitle="Every loan case with its balance and arrears position"
                actions={
                    <Button variant="light" onClick={exportCsv}>
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                }
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Banknote} label="Running Loans" value={running.length} sub={`${all.length} cases in total`} />
                <StatCard icon={Wallet} label="Loan Portfolio" value={kes(portfolio)} tone="sky" />
                <StatCard icon={AlertTriangle} label="Total Arrears" value={kes(arrears)} sub={`${running.filter((l) => l.arrears > 0).length} loans in arrears`} tone="rose" />
                <StatCard icon={TrendingUp} label="Portfolio at Risk" value={portfolio ? `${((running.filter((l) => l.arrears > 0).reduce((s, l) => s + l.balance, 0) / portfolio) * 100).toFixed(1)}%` : "0%"} sub="Balance of loans in arrears" tone="amber" />
            </div>
            <Card className="p-4 mb-4 flex flex-wrap gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Search loan no, member, ID..." className="flex-1 min-w-64" />
                <Select value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses" className="w-40">
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s === "Registered" ? "Draft" : s}
                        </option>
                    ))}
                </Select>
                <Select value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="All products" className="w-52">
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </Select>
                <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} placeholder="All classes" className="w-40">
                    {["Performing", "Watch", "Substandard", "Doubtful", "Loss"].map((c) => (
                        <option key={c}>{c}</option>
                    ))}
                </Select>
            </Card>
            <DataTable
                rows={rows}
                pageSize={15}
                emptyTitle="No loans match the filters"
                footer={
                    <tr>
                        <td className="px-4 py-3" colSpan={3}>
                            Totals ({rows.length})
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.principal)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.paid)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(totals.balance)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-rose-600">{fmt(totals.arrears)}</td>
                        <td colSpan={4} />
                    </tr>
                }
                columns={[
                    { key: "loanNumber", header: "Case", render: (l) => <span className="font-medium text-indigo-700">{l.loanNumber}</span> },
                    {
                        key: "memberName",
                        header: "Member",
                        render: (l) => (
                            <div>
                                <p className="font-medium text-gray-900">{l.memberName}</p>
                                <p className="text-xs text-gray-500">
                                    {l.memberNumber} · {l.idNumber}
                                </p>
                            </div>
                        ),
                    },
                    { key: "productName", header: "Product", render: (l) => <span>{l.productName}<br /><span className="text-xs text-gray-500">{l.annualRate}% · {l.termMonths} m</span></span> },
                    { key: "principal", header: "Principal", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.principal)}</span> },
                    { key: "paid", header: "Paid", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.paid)}</span> },
                    { key: "balance", header: "Balance", align: "right", render: (l) => <span className="tabular-nums font-medium">{fmt(l.balance)}</span> },
                    { key: "arrears", header: "Arrears", align: "right", render: (l) => <span className={`tabular-nums ${l.arrears > 0 ? "text-rose-600 font-medium" : "text-gray-400"}`}>{fmt(l.arrears)}</span> },
                    { key: "nextDue", header: "Next Due", render: (l) => fmtDate(l.nextDue) },
                    { key: "classification", header: "Class", align: "center", render: (l) => (l.classification ? <StatusBadge status={l.classification} /> : "—") },
                    { key: "status", header: "Status", align: "center", render: (l) => <StatusBadge status={l.status} deferred={l.deferred} /> },
                    {
                        key: "actions",
                        header: "",
                        align: "center",
                        sortable: false,
                        render: (l) => (
                            <div className="flex justify-center gap-0.5">
                                <Button variant="ghost" size="icon" title="View" onClick={() => setViewId(l.id)}>
                                    <Eye className="w-4 h-4 text-indigo-600" />
                                </Button>
                                {l.status === "Disbursed" && can("loans.repay") && (
                                    <Button variant="ghost" size="icon" title="Record repayment" onClick={() => setRepayId(l.id)}>
                                        <HandCoins className="w-4 h-4 text-emerald-600" />
                                    </Button>
                                )}
                            </div>
                        ),
                    },
                ]}
            />
            <LoanCaseDrawer loanId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
            <RepaymentModal loanId={repayId} open={!!repayId} onClose={() => setRepayId(null)} />
        </div>
    );
}
