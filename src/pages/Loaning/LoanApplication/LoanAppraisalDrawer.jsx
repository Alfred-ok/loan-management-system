import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Button, Card, Field, InfoGrid, InfoRow, Input, SectionTitle, Select, Textarea, cx } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { Swal, errorAlert, toast } from "@/lib/alert";
import { fmt, fullName, kes, today } from "@/lib/format";
import { generateSchedule, salaryAppraisal, summarizeSchedule, twoThirdRule } from "@/lib/loanMath";

const OPTIONS = { 1: "Recommend for approval", 2: "Reject", 4: "Defer (return to draft)" };

export default function LoanAppraisalDrawer({ loanId, open, onClose }) {
    const { getLoan, getMember, getProduct, memberBalances, freeDeposits, eligibility, outstandingPrincipal, appraiseLoan } = useData();
    const loan = getLoan(loanId);
    const [form, setForm] = useState(null);

    useEffect(() => {
        if (open && loan) {
            setForm({
                option: "",
                amount: loan.amountApplied,
                termMonths: loan.termMonths,
                remarks: "",
                date: today(),
                income: { basic: loan.income?.basic || 0, allowance: loan.income?.allowance || 0, deductions: loan.income?.deductions || 0 },
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, loanId]);

    const amount = Number(form?.amount) || 0;
    const term = Number(form?.termMonths) || 0;
    const summary = useMemo(
        () => (loan && amount > 0 && term > 0 ? summarizeSchedule(generateSchedule({ principal: amount, annualRate: loan.annualRate, termMonths: term, method: loan.method })) : { installment: 0, totalInterest: 0, totalRepayable: 0 }),
        [loan, amount, term]
    );

    if (!loan || !form) return null;
    const member = getMember(loan.memberId);
    const product = getProduct(loan.productId);
    const balances = memberBalances(loan.memberId);
    const income = form.income;
    const netPay = Number(income.basic) + Number(income.allowance) - Number(income.deductions);
    const sal = salaryAppraisal({ netPay, termMonths: term, amount });
    const tt = twoThirdRule({ basic: income.basic, allowance: income.allowance, deductions: income.deductions, repayment: summary.installment });
    const totalGuaranteed = loan.guarantors.reduce((s, g) => s + Number(g.amountGuaranteed), 0);
    const maxEligible = eligibility(loan.memberId, product);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const updateIncome = (k, v) => setForm((f) => ({ ...f, income: { ...f.income, [k]: v } }));

    const handleSubmit = async () => {
        if (!form.option) return Swal.fire("Validation", "Please select an appraisal option", "warning");
        if (form.option !== "1" && !form.remarks.trim()) return Swal.fire("Validation", "Remarks are required when rejecting or deferring", "warning");

        if (form.option === "1") {
            if (amount <= 0) return Swal.fire("Validation", "Enter the appraised amount", "warning");
            if (product && amount > product.maxAmount) return Swal.fire("Validation", `Appraised amount exceeds the product maximum of ${kes(product.maxAmount)}`, "warning");
            if (product && term > product.maxTermMonths) return Swal.fire("Validation", `Term exceeds the product maximum of ${product.maxTermMonths} months`, "warning");

            if (!sal.isAffordable) {
                const r = await Swal.fire({
                    title: "⚠️ Loan Amount Exceeds Salary Appraisal",
                    html: `<div style="text-align:left">
                        <p style="margin-bottom:8px;padding:8px;background:#f3f4f6;border-radius:6px">Salary Appraisal Amount = (Net Take-Home Pay ÷ 3) × Loan Term</p>
                        <ul style="line-height:1.7">
                          <li>Net Take-Home Pay: <b>${kes(sal.netTakeHomePay)}</b></li>
                          <li>One-Third of Net Pay: <b>${kes(sal.oneThirdOfNetPay)}</b></li>
                          <li>Loan Term: <b>${sal.loanTerm} months</b></li>
                          <li style="color:#059669">Salary Appraisal Amount: <b>${kes(sal.salaryAppraisalAmount)}</b></li>
                          <li style="color:#e11d48">Exceeds by: <b>${kes(sal.shortfall)}</b></li>
                        </ul>
                        <p style="margin-top:8px">The member's ability to pay is ${sal.abilityPercentage}%. Proceed with this appraisal?</p></div>`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Proceed Anyway",
                    cancelButtonText: "Review Amount",
                    confirmButtonColor: "#e11d48",
                    cancelButtonColor: "#4f46e5",
                    width: 560,
                });
                if (!r.isConfirmed) return;
            }
            if (tt.isTwoThirdRuleBroken) {
                const r = await Swal.fire({
                    title: "⚠️ 2/3 Rule Compliance Warning",
                    html: `<div style="text-align:left"><ul style="line-height:1.7">
                          <li>Gross Salary: <b>${kes(tt.grossSalary)}</b></li>
                          <li>Maximum Allowed Deductions (⅔): <b>${kes(tt.maxAllowedDeduction)}</b></li>
                          <li>Current Deductions: <b>${kes(tt.currentTotalDeductions)}</b></li>
                          <li>Proposed Monthly Repayment: <b>${kes(tt.proposedMonthlyRepayment)}</b></li>
                          <li style="color:#e11d48">Exceeds the limit by <b>${kes(tt.excessAmount)}</b></li>
                        </ul><p style="margin-top:8px">Net take-home pay must be at least ⅓ of gross salary. Proceed anyway?</p></div>`,
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Proceed Anyway",
                    cancelButtonText: "Review Amount",
                    confirmButtonColor: "#e11d48",
                    cancelButtonColor: "#4f46e5",
                    width: 560,
                });
                if (!r.isConfirmed) return;
            }
        }

        try {
            appraiseLoan(loan.id, {
                option: form.option,
                amount,
                termMonths: term,
                remarks: form.remarks,
                date: form.date,
                income: { basic: Number(income.basic), allowance: Number(income.allowance), deductions: Number(income.deductions) },
                abilityPercentage: sal.abilityPercentage,
                twoThirdOk: !tt.isTwoThirdRuleBroken,
            });
            toast({ 1: "Loan appraised and sent for approval", 2: "Loan rejected", 4: "Loan deferred" }[form.option]);
            onClose();
        } catch (err) {
            errorAlert(err);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={`Loan Appraisal — ${loan.loanNumber}`}
            subtitle={`${fullName(member)} · ${loan.productName}`}
            width="max-w-6xl"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit}>
                        <ClipboardCheck className="w-4 h-4" /> Submit Appraisal
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <Card className="p-5">
                    <SectionTitle>Application</SectionTitle>
                    <InfoGrid
                        cols={4}
                        items={[
                            ["Member", `${fullName(member)} (${member?.memberNumber})`],
                            ["Product", loan.productName],
                            ["Amount Applied", kes(loan.amountApplied)],
                            ["Term Applied", `${loan.termMonths} months`],
                            ["Interest", `${loan.annualRate}% ${loan.method === "flat" ? "flat" : "reducing"}`],
                            ["Purpose", loan.purpose],
                            ["Received", loan.receivedDate],
                            ["Status", loan.deferred ? "Deferred" : "Draft"],
                        ]}
                    />
                </Card>

                <div className="grid lg:grid-cols-3 gap-4">
                    <Card className="p-5">
                        <p className="font-semibold text-gray-900 mb-2">Member Position</p>
                        <InfoRow label="Deposits" value={kes(balances.deposits)} />
                        <InfoRow label="Free deposits" value={kes(freeDeposits(loan.memberId, loan.id))} />
                        <InfoRow label="Share capital" value={kes(balances.shares)} />
                        <InfoRow label="Running loans (principal)" value={kes(outstandingPrincipal(loan.memberId))} />
                        <InfoRow label={`Eligibility (${product?.multiplier}× deposits)`} value={kes(maxEligible)} />
                    </Card>
                    <Card className="p-5">
                        <p className="font-semibold text-gray-900 mb-2">Security</p>
                        <InfoRow label="Guarantors" value={`${loan.guarantors.length} (min ${product?.minGuarantors ?? "—"})`} />
                        <InfoRow label="Total guaranteed" value={kes(totalGuaranteed)} />
                        <InfoRow label="Applicant free deposits" value={kes(freeDeposits(loan.memberId, loan.id))} />
                        <InfoRow
                            label="Coverage"
                            value={amount ? `${(((totalGuaranteed + freeDeposits(loan.memberId, loan.id)) / amount) * 100).toFixed(0)}%` : "—"}
                        />
                    </Card>
                    <Card className="p-5">
                        <p className="font-semibold text-gray-900 mb-2">Proposed Repayment</p>
                        <InfoRow label="Monthly installment" value={kes(summary.installment)} />
                        <InfoRow label="Total interest" value={kes(summary.totalInterest)} />
                        <InfoRow label="Total repayable" value={kes(summary.totalRepayable)} />
                    </Card>
                </div>

                <Card className="p-5">
                    <SectionTitle>Income Verification</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <Field label="Basic Salary (Gross)">
                            <Input type="number" value={income.basic} onChange={(e) => updateIncome("basic", e.target.value)} />
                        </Field>
                        <Field label="Total Allowance">
                            <Input type="number" value={income.allowance} onChange={(e) => updateIncome("allowance", e.target.value)} />
                        </Field>
                        <Field label="Total Deductions (Taxes + Existing Loans)">
                            <Input type="number" value={income.deductions} onChange={(e) => updateIncome("deductions", e.target.value)} />
                        </Field>
                        <Field label="Net Take-Home Pay">
                            <Input value={fmt(netPay)} readOnly />
                        </Field>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className={cx("rounded-xl p-4", sal.isAffordable ? "bg-emerald-50" : "bg-rose-50")}>
                            <p className="font-semibold text-sm mb-1">Salary Appraisal</p>
                            <p className="text-xs text-gray-600 mb-2">(Net pay ÷ 3) × term = {kes(sal.salaryAppraisalAmount)}</p>
                            <p className={cx("text-sm font-medium", sal.isAffordable ? "text-emerald-700" : "text-rose-700")}>
                                {sal.isAffordable ? `✓ Within salary appraisal — ability ${sal.abilityPercentage}%` : `⚠ Exceeds by ${kes(sal.shortfall)} — ability ${sal.abilityPercentage}%`}
                            </p>
                        </div>
                        <div className={cx("rounded-xl p-4", tt.isTwoThirdRuleBroken ? "bg-rose-50" : "bg-emerald-50")}>
                            <p className="font-semibold text-sm mb-1">2/3 Rule</p>
                            <p className="text-xs text-gray-600 mb-2">
                                Deductions {kes(tt.totalWithNewLoan)} of max {kes(tt.maxAllowedDeduction)}
                            </p>
                            <p className={cx("text-sm font-medium", tt.isTwoThirdRuleBroken ? "text-rose-700" : "text-emerald-700")}>
                                {tt.isTwoThirdRuleBroken ? `⚠ Violates the 2/3 rule by ${kes(tt.excessAmount)}` : "✓ Complies with the 2/3 rule"}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5">
                    <SectionTitle>Appraisal Decision</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Field label="Appraisal Option" required>
                            <Select value={form.option} onChange={(e) => update("option", e.target.value)} placeholder="Select option">
                                {Object.entries(OPTIONS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Appraised Amount" hint={`Applied: ${kes(loan.amountApplied)}`}>
                            <div className="flex gap-2">
                                <Input type="number" value={form.amount} onChange={(e) => update("amount", e.target.value)} disabled={form.option === "2"} />
                                <Button variant="outline" size="sm" className="h-10" onClick={() => update("amount", loan.amountApplied)}>
                                    Match
                                </Button>
                            </div>
                        </Field>
                        <Field label="Appraised Term (months)" hint={`Max ${product?.maxTermMonths ?? "—"}`}>
                            <Input type="number" value={form.termMonths} onChange={(e) => update("termMonths", e.target.value)} disabled={form.option === "2"} />
                        </Field>
                        <Field label="Appraisal Date">
                            <Input type="date" max={today()} value={form.date} onChange={(e) => update("date", e.target.value)} />
                        </Field>
                        <Field label="Appraisal Remarks" required={form.option && form.option !== "1"} className="sm:col-span-2 lg:col-span-4">
                            <Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} placeholder="Findings, conditions or reasons..." />
                        </Field>
                    </div>
                </Card>
            </div>
        </Drawer>
    );
}
