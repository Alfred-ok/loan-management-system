import { useMemo, useState } from "react";
import { Calculator, Download, Printer } from "lucide-react";
import { Button, Card, Field, Input, PageHeader, SectionTitle, Select, StatCard } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { downloadCsv, kes, today } from "@/lib/format";
import { generateSchedule, INTEREST_METHODS, summarizeSchedule } from "@/lib/loanMath";
import ScheduleTable from "../components/ScheduleTable";

export default function LoanCalculator() {
    const { products } = useData();
    const [form, setForm] = useState({ productId: "", amount: 100000, rate: 12, term: 12, method: "reducing", startDate: today() });
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const pickProduct = (id) => {
        const p = products.find((x) => x.id === id);
        setForm((f) => (p ? { ...f, productId: id, rate: p.annualRate, method: p.method, term: Math.min(Number(f.term) || p.maxTermMonths, p.maxTermMonths) } : { ...f, productId: "" }));
    };

    const product = products.find((p) => p.id === form.productId);
    const valid = Number(form.amount) > 0 && Number(form.term) > 0 && Number(form.rate) >= 0;
    const schedule = useMemo(
        () => (valid ? generateSchedule({ principal: Number(form.amount), annualRate: Number(form.rate), termMonths: Math.min(600, Number(form.term)), method: form.method, startDate: form.startDate || today() }) : []),
        [form, valid]
    );
    const s = summarizeSchedule(schedule);
    const fees = product ? (Number(form.amount) * (product.processingFeePct + product.insurancePct)) / 100 : 0;

    return (
        <div>
            <PageHeader icon={Calculator} title="Loan Calculator" subtitle="Estimate installments and generate a repayment schedule" />
            <div className="grid lg:grid-cols-3 gap-4 mb-4">
                <Card className="p-5 lg:col-span-1 h-fit">
                    <SectionTitle>Loan Parameters</SectionTitle>
                    <div className="space-y-4">
                        <Field label="Loan Product (optional)">
                            <Select value={form.productId} onChange={(e) => pickProduct(e.target.value)} placeholder="Custom">
                                {products.filter((p) => p.active).map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Loan Amount (KES)" hint={product ? `Product limit ${kes(product.maxAmount)}` : undefined}>
                            <Input type="number" min={0} value={form.amount} onChange={(e) => update("amount", e.target.value)} />
                        </Field>
                        <Field label="Annual Interest Rate (%)">
                            <Input type="number" min={0} step="0.01" value={form.rate} onChange={(e) => update("rate", e.target.value)} disabled={!!product} />
                        </Field>
                        <Field label="Repayment Period (months)" hint={product ? `Max ${product.maxTermMonths} months` : undefined}>
                            <Input type="number" min={1} max={product?.maxTermMonths} value={form.term} onChange={(e) => update("term", e.target.value)} />
                        </Field>
                        <Field label="Interest Method">
                            <Select value={form.method} onChange={(e) => update("method", e.target.value)} disabled={!!product}>
                                {Object.entries(INTEREST_METHODS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Disbursement Date">
                            <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
                        </Field>
                    </div>
                </Card>

                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Monthly Installment" value={kes(s.installment)} sub={form.method === "flat" ? "Fixed every month" : "Fixed (amortized)"} tone="indigo" />
                        <StatCard label="Total Interest" value={kes(s.totalInterest)} tone="amber" />
                        <StatCard label="Total Repayable" value={kes(s.totalRepayable)} tone="violet" />
                        <StatCard label="Net Disbursement" value={kes(Number(form.amount) - fees)} sub={product ? `After ${product.processingFeePct + product.insurancePct}% fees` : "No product fees"} tone="emerald" />
                    </div>
                    <Card className="p-5">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Principal vs. interest</p>
                        <div className="flex h-4 rounded overflow-hidden gap-0.5" role="img" aria-label={`Principal ${kes(form.amount)}, interest ${kes(s.totalInterest)}`}>
                            <div className="bg-indigo-600 rounded-l" style={{ width: `${s.totalRepayable ? (s.totalPrincipal / s.totalRepayable) * 100 : 0}%` }} title={`Principal ${kes(s.totalPrincipal)}`} />
                            <div className="bg-indigo-300 rounded-r flex-1" title={`Interest ${kes(s.totalInterest)}`} />
                        </div>
                        <div className="flex gap-5 mt-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" /> Principal {s.totalRepayable ? ((s.totalPrincipal / s.totalRepayable) * 100).toFixed(1) : 0}%
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-300" /> Interest {s.totalRepayable ? ((s.totalInterest / s.totalRepayable) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="print-area">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                    <div>
                        <p className="font-semibold text-gray-900">Repayment Schedule</p>
                        <p className="text-xs text-gray-500">
                            {kes(form.amount)} at {form.rate}% p.a. ({form.method === "flat" ? "flat" : "reducing balance"}) over {form.term} months
                        </p>
                    </div>
                    <div className="flex gap-2 no-print">
                        <Button
                            variant="outline"
                            disabled={!schedule.length}
                            onClick={() =>
                                downloadCsv(
                                    "loan-schedule.csv",
                                    schedule.map((r) => ({ No: r.no, DueDate: r.dueDate, Opening: r.openingBalance, Principal: r.principal, Interest: r.interest, Installment: r.installment, Closing: r.closingBalance }))
                                )
                            }
                        >
                            <Download className="w-4 h-4" /> CSV
                        </Button>
                        <Button variant="outline" onClick={() => window.print()} disabled={!schedule.length}>
                            <Printer className="w-4 h-4" /> Print
                        </Button>
                    </div>
                </div>
                {schedule.length ? <ScheduleTable rows={schedule} /> : <Card className="p-8 text-center text-sm text-gray-500">Enter a valid amount, rate and period.</Card>}
            </div>
        </div>
    );
}
