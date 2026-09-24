import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button, Field, Input, Select } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { attempt } from "@/lib/alert";
import { fullName, kes, today } from "@/lib/format";
import { paymentModes } from "@/lib/selectData";

export const ACCOUNTS = {
    DEPOSITS: "Member Deposits",
    SHARES: "Share Capital",
    REGISTRATION: "Registration Fee",
};

const blank = { account: "DEPOSITS", type: "Credit", amount: "", date: today(), mode: "M-Pesa", reference: "", description: "" };

export default function PostTransactionModal({ open, onClose, member }) {
    const { postTransaction, memberBalances, freeDeposits } = useData();
    const [form, setForm] = useState(blank);

    useEffect(() => {
        if (open) setForm({ ...blank, date: today() });
    }, [open]);

    if (!member) return null;
    const balances = memberBalances(member.id);
    const free = freeDeposits(member.id);
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = () => {
        const ok = attempt(
            () =>
                postTransaction({
                    ...form,
                    memberId: member.id,
                    description: form.description || `${form.type === "Credit" ? "Contribution to" : "Withdrawal from"} ${ACCOUNTS[form.account]}`,
                }),
            "Transaction posted"
        );
        if (ok) onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Post Transaction — ${fullName(member)}`}
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit}>Post Transaction</Button>
                </>
            }
        >
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-indigo-50 rounded-lg p-2">
                    <p className="text-[11px] text-gray-500">Deposits</p>
                    <p className="text-sm font-semibold tabular-nums">{kes(balances.deposits)}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2">
                    <p className="text-[11px] text-gray-500">Free deposits</p>
                    <p className="text-sm font-semibold tabular-nums">{kes(free)}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2">
                    <p className="text-[11px] text-gray-500">Shares</p>
                    <p className="text-sm font-semibold tabular-nums">{kes(balances.shares)}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Account">
                    <Select value={form.account} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value, type: e.target.value === "DEPOSITS" ? f.type : "Credit" }))}>
                        {Object.entries(ACCOUNTS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Transaction Type">
                    <Select value={form.type} onChange={(e) => update("type", e.target.value)}>
                        <option value="Credit">Credit (Contribution)</option>
                        {form.account === "DEPOSITS" && <option value="Debit">Debit (Withdrawal)</option>}
                    </Select>
                </Field>
                <Field label="Amount (KES)" required>
                    <Input type="number" min={0} value={form.amount} onChange={(e) => update("amount", e.target.value)} autoFocus />
                </Field>
                <Field label="Date">
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
                    <Input value={form.reference} onChange={(e) => update("reference", e.target.value)} placeholder="e.g. M-Pesa code" />
                </Field>
                <Field label="Description" className="col-span-2">
                    <Input value={form.description} onChange={(e) => update("description", e.target.value)} />
                </Field>
            </div>
        </Modal>
    );
}
