import { useMemo, useState } from "react";
import { Download, HandCoins, Plus, Receipt, CalendarClock, AlertTriangle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { Button, Card, EmptyState, Field, Input, PageHeader, SearchInput, StatCard, StatusBadge, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { downloadCsv, fmt, fmtDate, fullName, kes, today } from "@/lib/format";
import { classifyLoan, loanPosition } from "@/lib/loanMath";
import LoanCaseDrawer from "../components/LoanCaseDrawer";
import RepaymentModal from "../components/RepaymentModal";

const monthStart = () => today().slice(0, 8) + "01";

export default function Repayments() {
    const { can } = useAuth();
    const { loans, getMember } = useData();
    const [tab, setTab] = useState("received");
    const [search, setSearch] = useState("");
    const [from, setFrom] = useState(monthStart());
    const [to, setTo] = useState(today());
    const [pickOpen, setPickOpen] = useState(false);
    const [pickSearch, setPickSearch] = useState("");
    const [repayId, setRepayId] = useState(null);
    const [viewId, setViewId] = useState(null);

    const running = useMemo(
        () =>
            loans
                .filter((l) => l.status === "Disbursed")
                .map((l) => ({ ...l, memberName: fullName(getMember(l.memberId)), memberNumber: getMember(l.memberId)?.memberNumber, pos: loanPosition(l) })),
        [loans, getMember]
    );

    const repayments = useMemo(() => {
        const q = search.trim().toLowerCase();
        return loans
            .flatMap((l) =>
                (l.repayments || []).map((r) => ({
                    ...r,
                    loanId: l.id,
                    loanNumber: l.loanNumber,
                    productName: l.productName,
                    memberName: fullName(getMember(l.memberId)),
                    memberNumber: getMember(l.memberId)?.memberNumber,
                }))
            )
            .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
            .filter((r) => !q || `${r.loanNumber} ${r.memberName} ${r.memberNumber} ${r.reference}`.toLowerCase().includes(q))
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [loans, getMember, search, from, to]);

    const inArrears = running.filter((l) => l.pos.arrears > 0).sort((a, b) => b.pos.arrears - a.pos.arrears);
    const endOfMonth = (() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    })();
    const dueThisMonth = running.filter((l) => l.pos.nextDue && l.pos.nextDue.dueDate <= endOfMonth);
    const collected = repayments.reduce((s, r) => s + r.amount, 0);

    const pickList = running.filter((l) => !pickSearch || `${l.loanNumber} ${l.memberName} ${l.memberNumber}`.toLowerCase().includes(pickSearch.toLowerCase()));

    return (
        <div>
            <PageHeader
                icon={HandCoins}
                title="Loan Repayments"
                subtitle="Receive payments and follow up on arrears"
                actions={
                    <>
                        <Button
                            variant="light"
                            onClick={() =>
                                downloadCsv(
                                    `repayments-${from}-to-${to}.csv`,
                                    repayments.map((r) => ({ Date: r.date, LoanNo: r.loanNumber, MemberNo: r.memberNumber, Member: r.memberName, Amount: r.amount, Mode: r.mode, Reference: r.reference, PostedBy: r.by }))
                                )
                            }
                        >
                            <Download className="w-4 h-4" /> Export
                        </Button>
                        {can("loans.repay") && (
                            <Button className="bg-white text-indigo-800! hover:bg-indigo-50" onClick={() => setPickOpen(true)}>
                                <Plus className="w-4 h-4" /> Post Repayment
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Receipt} label="Collected (selected period)" value={kes(collected)} sub={`${repayments.length} receipts`} tone="emerald" />
                <StatCard icon={CalendarClock} label="Due by month end" value={kes(dueThisMonth.reduce((s, l) => s + l.pos.nextDue.outstanding, 0))} sub={`${dueThisMonth.length} loans`} tone="sky" />
                <StatCard icon={AlertTriangle} label="Arrears" value={kes(inArrears.reduce((s, l) => s + l.pos.arrears, 0))} sub={`${inArrears.length} loans`} tone="rose" />
                <StatCard icon={HandCoins} label="Running Loans" value={running.length} tone="indigo" />
            </div>

            <Tabs
                className="mb-4"
                value={tab}
                onChange={setTab}
                tabs={[
                    { value: "received", label: "Repayments Received", count: repayments.length },
                    { value: "arrears", label: "Loans in Arrears", count: inArrears.length },
                    { value: "due", label: "Due This Month", count: dueThisMonth.length },
                ]}
            />

            {tab === "received" && (
                <>
                    <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
                        <SearchInput value={search} onChange={setSearch} placeholder="Search loan, member, reference..." className="flex-1 min-w-64" />
                        <Field label="From">
                            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        </Field>
                        <Field label="To">
                            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        </Field>
                        <Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>
                            All dates
                        </Button>
                    </Card>
                    <DataTable
                        rows={repayments}
                        pageSize={15}
                        emptyTitle="No repayments in this period"
                        onRowClick={(r) => setViewId(r.loanId)}
                        footer={
                            <tr>
                                <td className="px-4 py-3" colSpan={3}>
                                    Total
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">{fmt(collected)}</td>
                                <td colSpan={3} />
                            </tr>
                        }
                        columns={[
                            { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
                            { key: "loanNumber", header: "Loan", render: (r) => <span className="font-medium text-indigo-700">{r.loanNumber}</span> },
                            { key: "memberName", header: "Member", render: (r) => `${r.memberName} (${r.memberNumber})` },
                            { key: "amount", header: "Amount", align: "right", render: (r) => <span className="tabular-nums font-medium">{fmt(r.amount)}</span> },
                            { key: "mode", header: "Mode" },
                            { key: "reference", header: "Reference" },
                            { key: "by", header: "Posted By" },
                        ]}
                    />
                </>
            )}

            {tab !== "received" && (
                <DataTable
                    rows={tab === "arrears" ? inArrears : dueThisMonth}
                    emptyTitle={tab === "arrears" ? "No loans in arrears 🎉" : "Nothing due this month"}
                    columns={[
                        { key: "loanNumber", header: "Loan", render: (l) => <button type="button" className="font-medium text-indigo-700 hover:underline cursor-pointer" onClick={() => setViewId(l.id)}>{l.loanNumber}</button> },
                        { key: "memberName", header: "Member", render: (l) => `${l.memberName} (${l.memberNumber})` },
                        { key: "mobile", header: "Mobile", render: (l) => getMember(l.memberId)?.addressMobileLine },
                        { key: "installment", header: "Installment", align: "right", render: (l) => fmt(l.pos.installment) },
                        tab === "arrears"
                            ? { key: "arrears", header: "Arrears", align: "right", sortValue: (l) => l.pos.arrears, render: (l) => <span className="text-rose-600 font-medium tabular-nums">{fmt(l.pos.arrears)}</span> }
                            : { key: "nextDue", header: "Due Date", render: (l) => fmtDate(l.pos.nextDue?.dueDate) },
                        tab === "arrears"
                            ? { key: "days", header: "Days", align: "center", sortValue: (l) => l.pos.daysInArrears, render: (l) => l.pos.daysInArrears }
                            : { key: "dueAmt", header: "Amount Due", align: "right", render: (l) => fmt(l.pos.nextDue?.outstanding) },
                        { key: "class", header: "Class", align: "center", render: (l) => <StatusBadge status={classifyLoan(l.pos.daysInArrears)} /> },
                        { key: "balance", header: "Balance", align: "right", render: (l) => fmt(l.pos.balance) },
                        {
                            key: "actions",
                            header: "",
                            sortable: false,
                            render: (l) =>
                                can("loans.repay") && (
                                    <Button size="xs" variant="success" onClick={() => setRepayId(l.id)}>
                                        Receive
                                    </Button>
                                ),
                        },
                    ]}
                />
            )}

            <Modal open={pickOpen} onClose={() => setPickOpen(false)} title="Select Loan to Repay" width="max-w-2xl">
                <SearchInput value={pickSearch} onChange={setPickSearch} placeholder="Search loan no. or member..." className="mb-4" />
                <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                    {pickList.map((l) => (
                        <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                                setPickOpen(false);
                                setRepayId(l.id);
                            }}
                            className="w-full flex justify-between items-center p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-left cursor-pointer"
                        >
                            <div>
                                <p className="font-medium text-gray-900">
                                    {l.loanNumber} — {l.memberName}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {l.productName} · installment {fmt(l.pos.installment)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Balance</p>
                                <p className="font-semibold tabular-nums">{fmt(l.pos.balance)}</p>
                                {l.pos.arrears > 0 && <p className="text-xs text-rose-600">Arrears {fmt(l.pos.arrears)}</p>}
                            </div>
                        </button>
                    ))}
                    {!pickList.length && <EmptyState title="No running loans" />}
                </div>
            </Modal>
            <RepaymentModal loanId={repayId} open={!!repayId} onClose={() => setRepayId(null)} />
            <LoanCaseDrawer loanId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
        </div>
    );
}
