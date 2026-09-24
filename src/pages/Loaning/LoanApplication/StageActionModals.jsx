import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button, Field, InfoRow, Input, Select, Textarea } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { attempt, successAlert } from "@/lib/alert";
import { fmtDate, fullName, kes, today } from "@/lib/format";
import { disbursementModes } from "@/lib/selectData";

export function ApproveModal({ loanId, open, onClose }) {
    const { getLoan, getMember, approveLoan } = useData();
    const loan = getLoan(loanId);
    const [amount, setAmount] = useState("");
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        if (open && loan) {
            setAmount(loan.appraisal?.amount || loan.amountApplied);
            setRemarks("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, loanId]);

    if (!loan) return null;
    const submit = () => {
        if (Number(amount) > Number(loan.appraisal?.amount || loan.amountApplied))
            return attempt(() => {
                throw new Error("Approved amount cannot exceed the appraised amount.");
            });
        if (attempt(() => approveLoan(loan.id, { amount, remarks }), `${loan.loanNumber} approved`)) onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Approve Loan — ${loan.loanNumber}`}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={submit}>
                        Approve Loan
                    </Button>
                </>
            }
        >
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <InfoRow label="Member" value={fullName(getMember(loan.memberId))} />
                <InfoRow label="Product" value={loan.productName} />
                <InfoRow label="Applied" value={kes(loan.amountApplied)} />
                <InfoRow label="Appraised" value={`${kes(loan.appraisal?.amount)} over ${loan.appraisal?.termMonths} months`} />
                <InfoRow label="Ability to pay" value={`${loan.appraisal?.abilityPercentage ?? "—"}% · 2/3 rule ${loan.appraisal?.twoThirdOk ? "OK" : "breached"}`} />
            </div>
            <div className="space-y-4">
                <Field label="Approved Amount (KES)" required>
                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Approval Remarks">
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Approved by credit committee, minute 12/2026" />
                </Field>
            </div>
        </Modal>
    );
}

export function RejectModal({ loanId, open, onClose }) {
    const { getLoan, rejectLoan } = useData();
    const loan = getLoan(loanId);
    const [reason, setReason] = useState("");
    useEffect(() => {
        if (open) setReason("");
    }, [open]);
    if (!loan) return null;

    const submit = () => {
        if (attempt(() => rejectLoan(loan.id, { reason }), `${loan.loanNumber} rejected`)) onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Reject Loan — ${loan.loanNumber}`}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={submit}>
                        Reject Loan
                    </Button>
                </>
            }
        >
            <Field label="Reason for rejection" required>
                <Textarea value={reason} onChange={(e) => setReason(e.target.value)} autoFocus rows={4} />
            </Field>
        </Modal>
    );
}

export function DisbursementModal({ loanId, open, onClose }) {
    const { getLoan, getMember, disbursementPreview, disburseLoan } = useData();
    const loan = getLoan(loanId);
    const member = loan ? getMember(loan.memberId) : null;
    const [form, setForm] = useState({ date: today(), mode: "Bank Transfer", reference: "" });

    useEffect(() => {
        if (open) setForm({ date: today(), mode: "Bank Transfer", reference: "" });
    }, [open]);

    if (!loan) return null;
    const preview = disbursementPreview(loan, form.date);
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = () => {
        if (attempt(() => disburseLoan(loan.id, form))) {
            successAlert("Loan disbursed", `${kes(preview.netAmount)} paid to ${fullName(member)} via ${form.mode}. First installment due ${fmtDate(preview.schedule[0]?.dueDate)}.`);
            onClose();
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Loan Disbursement — ${loan.loanNumber}`}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={submit}>
                        Disburse Loan
                    </Button>
                </>
            }
        >
            <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Disbursement Date" required>
                    <Input type="date" max={today()} value={form.date} onChange={(e) => update("date", e.target.value)} />
                </Field>
                <Field label="Mode">
                    <Select value={form.mode} onChange={(e) => update("mode", e.target.value)}>
                        {disbursementModes.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </Select>
                </Field>
                <Field label="Reference / Cheque No." className="col-span-2">
                    <Input value={form.reference} onChange={(e) => update("reference", e.target.value)} />
                </Field>
            </div>
            {form.mode === "Bank Transfer" && (
                <p className="text-xs text-gray-500 mb-3">
                    Paying to {member?.bankName || "—"} {member?.branchName} · A/C {member?.reference1 || "not on file"}
                </p>
            )}
            {form.mode === "M-Pesa" && <p className="text-xs text-gray-500 mb-3">Paying to {member?.addressMobileLine}</p>}
            <div className="bg-gray-50 rounded-xl p-3">
                <InfoRow label="Approved Amount" value={kes(preview.amount)} />
                <InfoRow label="Less: Processing Fee" value={`(${kes(preview.processingFee)})`} />
                <InfoRow label="Less: Insurance" value={`(${kes(preview.insuranceFee)})`} />
                <InfoRow label={<span className="font-semibold text-emerald-700">Net Disbursement</span>} value={<span className="text-emerald-700">{kes(preview.netAmount)}</span>} />
                <InfoRow label="Term / Installment" value={`${preview.termMonths} months × ${kes(preview.schedule[0]?.installment)}`} />
                <InfoRow label="First Due Date" value={fmtDate(preview.schedule[0]?.dueDate)} />
            </div>
        </Modal>
    );
}
