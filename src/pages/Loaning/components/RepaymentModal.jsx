import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button, Field, Input, InfoRow, Select } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { attempt, successAlert } from "@/lib/alert";
import { fullName, kes, today } from "@/lib/format";
import { loanPosition } from "@/lib/loanMath";
import { paymentModes } from "@/lib/selectData";

export default function RepaymentModal({ loanId, open, onClose }) {
    const { getLoan, getMember, recordRepayment } = useData();
    const loan = getLoan(loanId);
    const [form, setForm] = useState({ amount: "", date: today(), mode: "M-Pesa", reference: "" });

    const pos = loan ? loanPosition(loan) : null;

    useEffect(() => {
        if (open && loan) {
            const p = loanPosition(loan);
            const suggested = p.arrears > 0 ? p.arrears : p.nextDue?.outstanding || p.balance;
            setForm({ amount: Math.min(suggested, p.balance).toFixed(2), date: today(), mode: "M-Pesa", reference: "" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, loanId]);

    if (!loan) return null;
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = () => {
        const res = attempt(() => recordRepayment(loan.id, form));
        if (res) {
            if (res.closed) successAlert("Loan fully repaid", `${loan.loanNumber} is now closed and guarantors have been released.`);
            else successAlert("Repayment posted", `${kes(form.amount)} received on ${loan.loanNumber}.`);
            onClose();
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Loan Repayment — ${loan.loanNumber}`}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={submit}>
                        Post Repayment
                    </Button>
                </>
            }
        >
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <InfoRow label="Member" value={fullName(getMember(loan.memberId))} />
                <InfoRow label="Product" value={loan.productName} />
                <InfoRow label="Installment" value={kes(pos.installment)} />
                <InfoRow label="Arrears" value={<span className={pos.arrears > 0 ? "text-rose-600" : ""}>{kes(pos.arrears)}</span>} />
                <InfoRow label="Outstanding balance" value={kes(pos.balance)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Amount (KES)" required>
                    <Input type="number" min={0} value={form.amount} onChange={(e) => update("amount", e.target.value)} autoFocus />
                </Field>
                <Field label="Payment Date">
                    <Input type="date" max={today()} value={form.date} onChange={(e) => update("date", e.target.value)} />
                </Field>
                <Field label="Payment Mode">
                    <Select value={form.mode} onChange={(e) => update("mode", e.target.value)}>
                        {paymentModes.map((m) => (
                            <option key={m}>{m}</option>
                        ))}
                    </Select>
                </Field>
                <Field label="Reference">
                    <Input value={form.reference} onChange={(e) => update("reference", e.target.value)} placeholder="Receipt / M-Pesa code" />
                </Field>
            </div>
            <div className="flex gap-2 mt-3">
                <Button variant="secondary" size="xs" onClick={() => update("amount", pos.installment.toFixed(2))}>
                    One installment
                </Button>
                {pos.arrears > 0 && (
                    <Button variant="secondary" size="xs" onClick={() => update("amount", pos.arrears.toFixed(2))}>
                        Clear arrears
                    </Button>
                )}
                <Button variant="secondary" size="xs" onClick={() => update("amount", pos.balance.toFixed(2))}>
                    Pay off loan
                </Button>
            </div>
        </Modal>
    );
}
