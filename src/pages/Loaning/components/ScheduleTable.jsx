import { StatusBadge } from "@/components/ui";
import { fmt, fmtDate } from "@/lib/format";

/** Repayment schedule; pass `installments` from loanPosition() to show paid/overdue status */
export default function ScheduleTable({ rows, showStatus = false }) {
    const totals = rows.reduce(
        (t, r) => ({ principal: t.principal + r.principal, interest: t.interest + r.interest, installment: t.installment + r.installment, paid: t.paid + (r.paid || 0) }),
        { principal: 0, interest: 0, installment: 0, paid: 0 }
    );
    const th = "px-3 py-2 text-xs font-semibold uppercase tracking-wide";
    const td = "px-3 py-1.5 tabular-nums";

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                    <tr>
                        <th className={`${th} text-center`}>#</th>
                        <th className={`${th} text-left`}>Due Date</th>
                        <th className={`${th} text-right`}>Opening</th>
                        <th className={`${th} text-right`}>Principal</th>
                        <th className={`${th} text-right`}>Interest</th>
                        <th className={`${th} text-right`}>Installment</th>
                        <th className={`${th} text-right`}>Closing</th>
                        {showStatus && <th className={`${th} text-right`}>Paid</th>}
                        {showStatus && <th className={`${th} text-center`}>Status</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((r) => (
                        <tr key={r.no} className="hover:bg-indigo-50/40">
                            <td className={`${td} text-center text-gray-500`}>{r.no}</td>
                            <td className={td}>{fmtDate(r.dueDate)}</td>
                            <td className={`${td} text-right`}>{fmt(r.openingBalance)}</td>
                            <td className={`${td} text-right`}>{fmt(r.principal)}</td>
                            <td className={`${td} text-right`}>{fmt(r.interest)}</td>
                            <td className={`${td} text-right font-medium`}>{fmt(r.installment)}</td>
                            <td className={`${td} text-right`}>{fmt(r.closingBalance)}</td>
                            {showStatus && <td className={`${td} text-right`}>{fmt(r.paid)}</td>}
                            {showStatus && (
                                <td className={`${td} text-center`}>
                                    <StatusBadge status={r.status} />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold border-t border-gray-200">
                    <tr>
                        <td className={td} colSpan={3}>
                            Totals
                        </td>
                        <td className={`${td} text-right`}>{fmt(totals.principal)}</td>
                        <td className={`${td} text-right`}>{fmt(totals.interest)}</td>
                        <td className={`${td} text-right`}>{fmt(totals.installment)}</td>
                        <td className={td} />
                        {showStatus && <td className={`${td} text-right`}>{fmt(totals.paid)}</td>}
                        {showStatus && <td className={td} />}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
