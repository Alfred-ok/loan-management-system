import { useState } from "react";
import { HandCoins, Printer } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import DataTable from "@/components/ui/DataTable";
import { Badge, Button, Card, EmptyState, InfoGrid, SectionTitle, StatCard, StatusBadge, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { fmt, fmtDate, fmtDateTime, fullName, kes } from "@/lib/format";
import { classifyLoan, generateSchedule, INTEREST_METHODS, loanPosition, salaryAppraisal, summarizeSchedule, twoThirdRule } from "@/lib/loanMath";
import ScheduleTable from "./ScheduleTable";
import RepaymentModal from "./RepaymentModal";

/** Full view of one loan case — used from every stage, the register and member profiles */
export default function LoanCaseDrawer({ loanId, open, onClose }) {
    const { can } = useAuth();
    const { getLoan, getMember, sectors, subSectors, memberBalances } = useData();
    const [tab, setTab] = useState("overview");
    const [repayOpen, setRepayOpen] = useState(false);
    const loan = getLoan(loanId);
    if (!loan) return null;

    const member = getMember(loan.memberId);
    const isLive = ["Disbursed", "Closed"].includes(loan.status);
    const pos = isLive ? loanPosition(loan) : null;
    const amount = Number(loan.disbursedAmount || loan.approval?.amount || loan.appraisal?.amount || loan.amountApplied);
    const term = Number(loan.appraisal?.termMonths || loan.termMonths);
    const projected = isLive ? null : generateSchedule({ principal: amount, annualRate: loan.annualRate, termMonths: term, method: loan.method });
    const projectedSummary = projected ? summarizeSchedule(projected) : null;
    const income = loan.income || {};
    const netPay = Number(income.basic || 0) + Number(income.allowance || 0) - Number(income.deductions || 0);
    const installment = pos?.installment || projectedSummary?.installment || 0;
    const sal = salaryAppraisal({ netPay, termMonths: term, amount });
    const tt = twoThirdRule({ basic: income.basic, allowance: income.allowance, deductions: income.deductions, repayment: installment });

    const tabs = [
        { value: "overview", label: "Overview" },
        { value: "schedule", label: isLive ? "Schedule" : "Projected Schedule" },
        { value: "repayments", label: "Repayments", count: loan.repayments?.length || 0 },
        { value: "guarantors", label: "Guarantors", count: loan.guarantors?.length || 0 },
        { value: "appraisal", label: "Appraisal" },
        { value: "history", label: "History" },
    ];

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                title={`Loan ${loan.loanNumber} — ${fullName(member)}`}
                subtitle={`${loan.productName} · applied ${fmtDate(loan.receivedDate)}`}
                width="max-w-6xl"
                actions={
                    <>
                        {loan.status === "Disbursed" && can("loans.repay") && (
                            <Button variant="light" size="sm" onClick={() => setRepayOpen(true)}>
                                <HandCoins className="w-4 h-4" /> <span className="hidden sm:inline">Repay</span>
                            </Button>
                        )}
                        <Button variant="light" size="sm" onClick={() => window.print()}>
                            <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Print</span>
                        </Button>
                    </>
                }
            >
                <div className="print-area">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <StatusBadge status={loan.status} deferred={loan.deferred} />
                        {pos && loan.status === "Disbursed" && (
                            <Badge tone={pos.daysInArrears > 0 ? "rose" : "emerald"}>
                                {classifyLoan(pos.daysInArrears)}
                                {pos.daysInArrears > 0 && ` · ${pos.daysInArrears} days in arrears`}
                            </Badge>
                        )}
                    </div>

                    {pos ? (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                            <StatCard label="Disbursed" value={kes(loan.disbursedAmount)} />
                            <StatCard label="Total Repayable" value={kes(pos.totalRepayable)} />
                            <StatCard label="Paid" value={kes(pos.totalPaid)} tone="emerald" />
                            <StatCard label="Balance" value={kes(pos.balance)} sub={`Principal ${fmt(pos.principalBalance)}`} tone="amber" />
                            <StatCard label="Arrears" value={kes(pos.arrears)} sub={pos.nextDue ? `Next due ${fmtDate(pos.nextDue.dueDate)}` : "—"} tone={pos.arrears > 0 ? "rose" : "slate"} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                            <StatCard label="Amount Applied" value={kes(loan.amountApplied)} />
                            <StatCard label={loan.approval ? "Approved Amount" : loan.appraisal ? "Appraised Amount" : "Amount"} value={kes(amount)} tone="violet" />
                            <StatCard label="Monthly Installment" value={kes(projectedSummary.installment)} sub={`${term} months`} tone="sky" />
                            <StatCard label="Total Interest" value={kes(projectedSummary.totalInterest)} tone="amber" />
                        </div>
                    )}

                    <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4 no-print" />

                    {tab === "overview" && (
                        <div className="space-y-4">
                            <Card className="p-5">
                                <SectionTitle>Applicant</SectionTitle>
                                <InfoGrid
                                    cols={4}
                                    items={[
                                        ["Member", fullName(member)],
                                        ["Member No.", member?.memberNumber],
                                        ["ID Number", member?.individualIdentityCardNumber],
                                        ["Mobile", member?.addressMobileLine],
                                        ["Payroll No.", member?.individualPayrollNumbers],
                                        ["Employer", member?.employerName],
                                        ["Deposits", kes(memberBalances(loan.memberId).deposits)],
                                        ["Share Capital", kes(memberBalances(loan.memberId).shares)],
                                    ]}
                                />
                            </Card>
                            <Card className="p-5">
                                <SectionTitle>Loan Details</SectionTitle>
                                <InfoGrid
                                    cols={4}
                                    items={[
                                        ["Loan Number", loan.loanNumber],
                                        ["Product", loan.productName],
                                        ["Interest Rate", `${loan.annualRate}% p.a.`],
                                        ["Interest Method", INTEREST_METHODS[loan.method]],
                                        ["Amount Applied", kes(loan.amountApplied)],
                                        ["Term", `${term} months`],
                                        ["Purpose", loan.purpose],
                                        ["Application Date", fmtDate(loan.receivedDate)],
                                        ["Sector", sectors.find((s) => s.code === loan.sectorCode)?.name],
                                        ["Sub Sector", subSectors.find((s) => s.code === loan.subSectorCode)?.name],
                                        ["Reference", loan.reference],
                                        ["Registered By", loan.createdBy],
                                    ]}
                                />
                                {loan.remarks && <p className="mt-4 text-sm bg-gray-50 p-3 rounded-lg text-gray-600">{loan.remarks}</p>}
                            </Card>
                            {loan.disbursement && (
                                <Card className="p-5">
                                    <SectionTitle>Disbursement</SectionTitle>
                                    <InfoGrid
                                        cols={4}
                                        items={[
                                            ["Date", fmtDate(loan.disbursement.date)],
                                            ["Mode", loan.disbursement.mode],
                                            ["Reference", loan.disbursement.reference],
                                            ["Disbursed By", loan.disbursement.by],
                                            ["Gross Amount", kes(loan.disbursedAmount)],
                                            ["Processing Fee", kes(loan.disbursement.processingFee)],
                                            ["Insurance", kes(loan.disbursement.insuranceFee)],
                                            ["Net Paid Out", kes(loan.disbursement.netAmount)],
                                        ]}
                                    />
                                </Card>
                            )}
                            {loan.rejection && (
                                <Card className="p-5 border-rose-200 bg-rose-50/40">
                                    <p className="font-semibold text-rose-700 mb-1">
                                        Rejected at {loan.rejection.stage} on {fmtDate(loan.rejection.date)} by {loan.rejection.by}
                                    </p>
                                    <p className="text-sm text-gray-700">{loan.rejection.reason}</p>
                                </Card>
                            )}
                        </div>
                    )}

                    {tab === "schedule" && <ScheduleTable rows={pos ? pos.installments : projected} showStatus={!!pos} />}

                    {tab === "repayments" && (
                        <DataTable
                            rows={[...(loan.repayments || [])].reverse()}
                            emptyTitle="No repayments yet"
                            emptyMessage={isLive ? "Repayments posted on this loan will appear here." : "The loan has not been disbursed."}
                            columns={[
                                { key: "date", header: "Date", render: (r) => fmtDate(r.date) },
                                { key: "amount", header: "Amount", align: "right", render: (r) => <span className="font-medium tabular-nums">{fmt(r.amount)}</span> },
                                { key: "mode", header: "Mode" },
                                { key: "reference", header: "Reference" },
                                { key: "by", header: "Posted By" },
                            ]}
                        />
                    )}

                    {tab === "guarantors" && (
                        <DataTable
                            rowKey="memberId"
                            rows={loan.guarantors || []}
                            emptyTitle="No guarantors"
                            columns={[
                                { key: "name", header: "Guarantor", render: (g) => fullName(getMember(g.memberId)) },
                                { key: "no", header: "Member No.", render: (g) => getMember(g.memberId)?.memberNumber },
                                { key: "id", header: "ID No.", render: (g) => getMember(g.memberId)?.individualIdentityCardNumber },
                                { key: "mobile", header: "Mobile", render: (g) => getMember(g.memberId)?.addressMobileLine },
                                { key: "amountGuaranteed", header: "Amount Guaranteed", align: "right", render: (g) => fmt(g.amountGuaranteed) },
                                {
                                    key: "outstanding",
                                    header: "Current Exposure",
                                    align: "right",
                                    render: (g) =>
                                        loan.status === "Closed" || loan.status === "Rejected"
                                            ? "Released"
                                            : fmt(pos ? (g.amountGuaranteed * pos.principalBalance) / loan.disbursedAmount : g.amountGuaranteed),
                                },
                            ]}
                        />
                    )}

                    {tab === "appraisal" && (
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <Card className="p-5">
                                    <SectionTitle>Salary Appraisal</SectionTitle>
                                    <InfoGrid
                                        cols={2}
                                        items={[
                                            ["Basic Salary", kes(income.basic)],
                                            ["Allowances", kes(income.allowance)],
                                            ["Deductions", kes(income.deductions)],
                                            ["Net Take-Home", kes(netPay)],
                                            ["Appraisal Amount (⅓ net × term)", kes(sal.salaryAppraisalAmount)],
                                            ["Ability to Pay", `${sal.abilityPercentage}%`],
                                        ]}
                                    />
                                    <p className={`mt-3 text-sm font-medium ${sal.isAffordable ? "text-emerald-700" : "text-rose-600"}`}>
                                        {sal.isAffordable ? "✓ Within salary appraisal" : `⚠ Exceeds salary appraisal by ${kes(sal.shortfall)}`}
                                    </p>
                                </Card>
                                <Card className="p-5">
                                    <SectionTitle>2/3 Rule</SectionTitle>
                                    <InfoGrid
                                        cols={2}
                                        items={[
                                            ["Gross Salary", kes(tt.grossSalary)],
                                            ["Max Deductions (⅔)", kes(tt.maxAllowedDeduction)],
                                            ["Current Deductions", kes(tt.currentTotalDeductions)],
                                            ["Proposed Installment", kes(tt.proposedMonthlyRepayment)],
                                            ["Total with New Loan", kes(tt.totalWithNewLoan)],
                                            ["Minimum Take-Home (⅓)", kes(tt.minimumTakeHome)],
                                        ]}
                                    />
                                    <p className={`mt-3 text-sm font-medium ${tt.isTwoThirdRuleBroken ? "text-rose-600" : "text-emerald-700"}`}>
                                        {tt.isTwoThirdRuleBroken ? `⚠ Violates the 2/3 rule by ${kes(tt.excessAmount)}` : "✓ Complies with the 2/3 rule"}
                                    </p>
                                </Card>
                            </div>
                            {loan.appraisal ? (
                                <Card className="p-5">
                                    <SectionTitle>Appraisal Decision</SectionTitle>
                                    <InfoGrid
                                        cols={4}
                                        items={[
                                            ["Decision", { 1: "Recommend approval", 2: "Reject", 4: "Defer" }[loan.appraisal.option]],
                                            ["Appraised Amount", kes(loan.appraisal.amount)],
                                            ["Appraised Term", `${loan.appraisal.termMonths} months`],
                                            ["Appraised On", `${fmtDate(loan.appraisal.date)} by ${loan.appraisal.by}`],
                                        ]}
                                    />
                                    {loan.appraisal.remarks && <p className="mt-3 text-sm text-gray-600">{loan.appraisal.remarks}</p>}
                                </Card>
                            ) : (
                                <EmptyState title="Not yet appraised" />
                            )}
                            {loan.approval && (
                                <Card className="p-5">
                                    <SectionTitle>Approval</SectionTitle>
                                    <InfoGrid
                                        cols={3}
                                        items={[
                                            ["Approved Amount", kes(loan.approval.amount)],
                                            ["Approved On", fmtDate(loan.approval.date)],
                                            ["Approved By", loan.approval.by],
                                        ]}
                                    />
                                    {loan.approval.remarks && <p className="mt-3 text-sm text-gray-600">{loan.approval.remarks}</p>}
                                </Card>
                            )}
                        </div>
                    )}

                    {tab === "history" && (
                        <Card className="p-5">
                            <ol className="relative border-l-2 border-indigo-100 ml-2 space-y-5">
                                {[...(loan.history || [])].reverse().map((h, i) => (
                                    <li key={i} className="ml-5">
                                        <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                                        <p className="text-sm font-medium text-gray-900">{h.action}</p>
                                        <p className="text-xs text-gray-500">
                                            {fmtDateTime(h.date)} · {h.by}
                                        </p>
                                        {h.note && <p className="text-sm text-gray-600 mt-0.5">{h.note}</p>}
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    )}
                </div>
            </Drawer>
            <RepaymentModal loanId={loan.id} open={repayOpen} onClose={() => setRepayOpen(false)} />
        </>
    );
}
