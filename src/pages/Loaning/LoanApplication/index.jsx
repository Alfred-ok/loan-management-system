import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    FileText, Send, CheckCircle2, XCircle, Banknote, Archive, Plus, Eye, Pencil, ClipboardCheck, Trash2, RotateCcw, HandCoins, ListChecks,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { Button, Card, PageHeader, SearchInput, StatusBadge, Tabs, Badge } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { attempt, confirmAction } from "@/lib/alert";
import { fmt, fmtDate, fullName } from "@/lib/format";
import { classifyLoan, loanPosition } from "@/lib/loanMath";
import LoanCaseDrawer from "../components/LoanCaseDrawer";
import RepaymentModal from "../components/RepaymentModal";
import { LoanApplicationProvider, useLoanApplication } from "./LoanApplicationContext";
import AddLoanApplicationDrawer from "./AddLoanApplicationDrawer";
import LoanAppraisalDrawer from "./LoanAppraisalDrawer";
import { ApproveModal, DisbursementModal, RejectModal } from "./StageActionModals";

const STAGES = [
    { value: "Registered", label: "Draft", icon: FileText, actionCaps: ["loans.draft", "loans.appraise"] },
    { value: "Appraised", label: "Appraised", icon: Send, actionCaps: ["loans.approve", "loans.reject"] },
    { value: "Approved", label: "Approved", icon: CheckCircle2, actionCaps: ["loans.disburse"] },
    { value: "Rejected", label: "Rejected", icon: XCircle, actionCaps: [] },
    { value: "Disbursed", label: "Disbursed", icon: Banknote, actionCaps: ["loans.repay"] },
    { value: "Closed", label: "Closed", icon: Archive, actionCaps: [] },
];

function LoanApplicationPage() {
    const { can } = useAuth();
    const { loans, getMember, deleteLoan, reopenLoan } = useData();
    const { newForm, loadLoan } = useLoanApplication();
    const [params, setParams] = useSearchParams();

    const defaultStage = STAGES.find((s) => s.actionCaps.some(can))?.value || "Registered";
    const [stage, setStage] = useState(defaultStage);
    const [search, setSearch] = useState("");
    const [drawer, setDrawer] = useState({ open: false, editId: null });
    const [viewId, setViewId] = useState(null);
    const [appraiseId, setAppraiseId] = useState(null);
    const [approveId, setApproveId] = useState(null);
    const [rejectId, setRejectId] = useState(null);
    const [disburseId, setDisburseId] = useState(null);
    const [repayId, setRepayId] = useState(null);

    // Coming from a member profile: /loaning/applications?member=<id>
    useEffect(() => {
        const memberId = params.get("member");
        if (memberId && can("loans.draft")) {
            newForm({ memberId });
            setDrawer({ open: true, editId: null });
            setParams({}, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    const counts = useMemo(() => Object.fromEntries(STAGES.map((s) => [s.value, loans.filter((l) => l.status === s.value).length])), [loans]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return loans
            .filter((l) => l.status === stage)
            .map((l) => ({ ...l, memberName: fullName(getMember(l.memberId)), memberNumber: getMember(l.memberId)?.memberNumber }))
            .filter((l) => !q || `${l.loanNumber} ${l.memberName} ${l.memberNumber} ${l.productName} ${l.purpose}`.toLowerCase().includes(q))
            .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }, [loans, stage, search, getMember]);

    const openNew = () => {
        setDrawer({ open: true, editId: null });
    };
    const openEdit = (loan) => {
        loadLoan(loan);
        setDrawer({ open: true, editId: loan.id });
    };

    const handleDelete = async (loan) => {
        if (await confirmAction({ title: `Delete ${loan.loanNumber}?`, text: "The application and its guarantor pledges will be removed.", confirmText: "Delete", danger: true, icon: "warning" }))
            attempt(() => deleteLoan(loan.id), "Application deleted");
    };

    const handleReopen = async (loan) => {
        if (await confirmAction({ title: `Re-open ${loan.loanNumber}?`, text: "It will return to the Draft stage for a fresh appraisal." }))
            attempt(() => reopenLoan(loan.id), "Application re-opened");
    };

    const act = (title, Icon, color, onClick) => (
        <Button key={title} variant="ghost" size="icon" title={title} aria-label={title} onClick={onClick}>
            <Icon className={`w-4 h-4 ${color}`} />
        </Button>
    );

    const baseColumns = [
        { key: "loanNumber", header: "Loan No.", render: (l) => <button type="button" className="font-medium text-indigo-700 hover:underline cursor-pointer" onClick={() => setViewId(l.id)}>{l.loanNumber}</button> },
        {
            key: "memberName",
            header: "Member",
            render: (l) => (
                <div>
                    <p className="font-medium text-gray-900">{l.memberName}</p>
                    <p className="text-xs text-gray-500">{l.memberNumber}</p>
                </div>
            ),
        },
        { key: "productName", header: "Product" },
    ];

    const stageColumns = {
        Registered: [
            { key: "amountApplied", header: "Amount Applied", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.amountApplied)}</span> },
            { key: "termMonths", header: "Term", align: "center", render: (l) => `${l.termMonths} m` },
            { key: "guarantors", header: "Guarantors", align: "center", render: (l) => l.guarantors.length },
            { key: "receivedDate", header: "Received", render: (l) => fmtDate(l.receivedDate) },
            { key: "status", header: "Status", align: "center", render: (l) => <StatusBadge status={l.status} deferred={l.deferred} /> },
        ],
        Appraised: [
            { key: "amountApplied", header: "Applied", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.amountApplied)}</span> },
            { key: "appraised", header: "Appraised", align: "right", sortValue: (l) => l.appraisal?.amount, render: (l) => <span className="tabular-nums font-medium">{fmt(l.appraisal?.amount)}</span> },
            { key: "ability", header: "Ability", align: "center", render: (l) => <Badge tone={l.appraisal?.abilityPercentage >= 100 ? "emerald" : "amber"}>{l.appraisal?.abilityPercentage ?? "—"}%</Badge> },
            { key: "twoThird", header: "2/3 Rule", align: "center", render: (l) => (l.appraisal?.twoThirdOk ? <Badge tone="emerald">OK</Badge> : <Badge tone="rose">Breached</Badge>) },
            { key: "appraisedBy", header: "Appraised", render: (l) => `${fmtDate(l.appraisal?.date)} · ${l.appraisal?.by}` },
        ],
        Approved: [
            { key: "approved", header: "Approved Amount", align: "right", sortValue: (l) => l.approval?.amount, render: (l) => <span className="tabular-nums font-medium">{fmt(l.approval?.amount)}</span> },
            { key: "term", header: "Term", align: "center", render: (l) => `${l.appraisal?.termMonths || l.termMonths} m` },
            { key: "approvedOn", header: "Approved", render: (l) => `${fmtDate(l.approval?.date)} · ${l.approval?.by}` },
        ],
        Rejected: [
            { key: "amountApplied", header: "Applied", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.amountApplied)}</span> },
            { key: "stage", header: "Stage", render: (l) => l.rejection?.stage },
            { key: "reason", header: "Reason", className: "max-w-xs", render: (l) => <span className="text-gray-600 line-clamp-2">{l.rejection?.reason}</span> },
            { key: "rejectedOn", header: "Rejected", render: (l) => `${fmtDate(l.rejection?.date)} · ${l.rejection?.by}` },
        ],
        Disbursed: [
            { key: "disbursedAmount", header: "Disbursed", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.disbursedAmount)}</span> },
            { key: "disbDate", header: "Date", render: (l) => fmtDate(l.disbursement?.date) },
            { key: "balance", header: "Balance", align: "right", sortValue: (l) => loanPosition(l).balance, render: (l) => <span className="tabular-nums font-medium">{fmt(loanPosition(l).balance)}</span> },
            {
                key: "arrears",
                header: "Arrears",
                align: "right",
                sortValue: (l) => loanPosition(l).arrears,
                render: (l) => {
                    const a = loanPosition(l).arrears;
                    return <span className={`tabular-nums ${a > 0 ? "text-rose-600 font-medium" : "text-gray-400"}`}>{fmt(a)}</span>;
                },
            },
            {
                key: "class",
                header: "Class",
                align: "center",
                render: (l) => <StatusBadge status={classifyLoan(loanPosition(l).daysInArrears)} />,
            },
        ],
        Closed: [
            { key: "disbursedAmount", header: "Disbursed", align: "right", render: (l) => <span className="tabular-nums">{fmt(l.disbursedAmount)}</span> },
            { key: "paid", header: "Total Paid", align: "right", render: (l) => <span className="tabular-nums">{fmt(loanPosition(l).totalPaid)}</span> },
            { key: "disbDate", header: "Disbursed On", render: (l) => fmtDate(l.disbursement?.date) },
            { key: "closedDate", header: "Closed On", render: (l) => fmtDate(l.closedDate || l.repayments?.at(-1)?.date) },
        ],
    };

    const actions = {
        key: "actions",
        header: "Actions",
        align: "center",
        sortable: false,
        render: (l) => (
            <div className="flex justify-center gap-0.5">
                {act("View details", Eye, "text-indigo-600", () => setViewId(l.id))}
                {l.status === "Registered" && can("loans.draft") && act("Edit application", Pencil, "text-amber-600", () => openEdit(l))}
                {l.status === "Registered" && can("loans.appraise") && act("Appraise", ClipboardCheck, "text-sky-600", () => setAppraiseId(l.id))}
                {l.status === "Appraised" && can("loans.approve") && act("Approve", CheckCircle2, "text-emerald-600", () => setApproveId(l.id))}
                {["Appraised", "Approved"].includes(l.status) && can("loans.reject") && act("Reject", XCircle, "text-rose-600", () => setRejectId(l.id))}
                {l.status === "Approved" && can("loans.disburse") && act("Disburse", Banknote, "text-emerald-600", () => setDisburseId(l.id))}
                {l.status === "Disbursed" && can("loans.repay") && act("Record repayment", HandCoins, "text-emerald-600", () => setRepayId(l.id))}
                {l.status === "Rejected" && can("loans.draft") && act("Re-open as draft", RotateCcw, "text-sky-600", () => handleReopen(l))}
                {["Registered", "Rejected"].includes(l.status) && can("loans.draft") && act("Delete", Trash2, "text-rose-500", () => handleDelete(l))}
            </div>
        ),
    };

    const current = STAGES.find((s) => s.value === stage);

    return (
        <div>
            <PageHeader
                icon={ListChecks}
                title="Loan Applications"
                subtitle="Draft → Appraisal → Approval → Disbursement"
                actions={
                    can("loans.draft") && (
                        <Button className="bg-white text-indigo-800! hover:bg-indigo-50" onClick={openNew}>
                            <Plus className="w-4 h-4" /> New Loan Application
                        </Button>
                    )
                }
            />

            <Tabs dark className="mb-4 justify-center" value={stage} onChange={setStage} tabs={STAGES.map((s) => ({ ...s, count: counts[s.value] }))} />

            <Card className="p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="font-semibold text-gray-900">{current.label} loans</p>
                    <p className="text-xs text-gray-500">
                        {
                            {
                                Registered: "Applications awaiting appraisal (includes deferred applications).",
                                Appraised: "Appraised and recommended — awaiting approval by the credit committee.",
                                Approved: "Approved — awaiting disbursement.",
                                Rejected: "Rejected at appraisal or approval. They can be re-opened as drafts.",
                                Disbursed: "Running loans being repaid.",
                                Closed: "Fully repaid loans.",
                            }[stage]
                        }
                    </p>
                </div>
                <SearchInput value={search} onChange={setSearch} placeholder="Search loan no, member, product..." className="w-full sm:w-80" />
            </Card>

            <DataTable
                rows={rows}
                columns={[...baseColumns, ...stageColumns[stage], actions]}
                emptyTitle={`No ${current.label.toLowerCase()} loans`}
                emptyMessage={stage === "Registered" && can("loans.draft") ? "Click “New Loan Application” to capture one." : undefined}
            />

            <AddLoanApplicationDrawer
                open={drawer.open}
                editLoanId={drawer.editId}
                onClose={() => setDrawer({ open: false, editId: null })}
            />
            <LoanCaseDrawer loanId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
            <LoanAppraisalDrawer loanId={appraiseId} open={!!appraiseId} onClose={() => setAppraiseId(null)} />
            <ApproveModal loanId={approveId} open={!!approveId} onClose={() => setApproveId(null)} />
            <RejectModal loanId={rejectId} open={!!rejectId} onClose={() => setRejectId(null)} />
            <DisbursementModal loanId={disburseId} open={!!disburseId} onClose={() => setDisburseId(null)} />
            <RepaymentModal loanId={repayId} open={!!repayId} onClose={() => setRepayId(null)} />
        </div>
    );
}

export default function LoanApplication() {
    return (
        <LoanApplicationProvider>
            <LoanApplicationPage />
        </LoanApplicationProvider>
    );
}
