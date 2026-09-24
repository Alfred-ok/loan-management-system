import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Badge, EmptyState, SearchInput } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { fmt } from "@/lib/format";
import { INTEREST_METHODS } from "@/lib/loanMath";

export default function LoanProductSelectModal({ open, onClose, onSelect, memberId }) {
    const { products, eligibility } = useData();
    const [search, setSearch] = useState("");
    const q = search.trim().toLowerCase();
    const rows = products.filter((p) => p.active && (!q || `${p.code} ${p.name} ${p.category}`.toLowerCase().includes(q)));

    return (
        <Modal open={open} onClose={onClose} title="Select Loan Product" width="max-w-3xl">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products..." className="mb-4" />
            <div className="grid sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                {rows.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelect(p)}
                        className="text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition"
                    >
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                                <p className="font-semibold text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-500">
                                    {p.code} · {p.section}
                                </p>
                            </div>
                            <Badge tone="indigo">{p.annualRate}% p.a.</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                            <span>Max: KES {fmt(p.maxAmount)}</span>
                            <span>Up to {p.maxTermMonths} months</span>
                            <span>{p.minGuarantors} guarantor(s) min</span>
                            <span>{p.multiplier}× deposits</span>
                            <span className="col-span-2">{INTEREST_METHODS[p.method]}</span>
                        </div>
                        {memberId && (
                            <p className="mt-2 text-xs font-medium text-emerald-700">Member qualifies up to KES {fmt(eligibility(memberId, p))}</p>
                        )}
                    </button>
                ))}
                {rows.length === 0 && <EmptyState title="No active loan products" message="Create one under Loan Setup → Loan Products." />}
            </div>
        </Modal>
    );
}
