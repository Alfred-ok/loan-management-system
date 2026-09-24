import { useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Avatar, Badge, EmptyState, SearchInput } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { fmt, fullName, initials } from "@/lib/format";

/**
 * Pick a member — used for both the loan applicant and guarantors.
 * mode "guarantor" shows free deposits (deposits not already pledged).
 */
export default function MemberSelectModal({ open, onClose, onSelect, title = "Select Member", excludeIds = [], mode = "applicant", excludeLoanId }) {
    const { members, memberBalances, freeDeposits, guaranteeCount } = useData();
    const [search, setSearch] = useState("");

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members
            .filter((m) => m.status === "Active" && !excludeIds.includes(m.id))
            .filter(
                (m) =>
                    !q ||
                    [fullName(m), m.memberNumber, m.individualIdentityCardNumber, m.addressMobileLine, m.individualPayrollNumbers].join(" ").toLowerCase().includes(q)
            )
            .slice(0, 50);
    }, [members, search, excludeIds]);

    return (
        <Modal open={open} onClose={onClose} title={title} width="max-w-2xl">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, member no, ID, phone or payroll..." className="mb-4" />
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
                {rows.map((m) => {
                    const b = memberBalances(m.id);
                    const free = freeDeposits(m.id, excludeLoanId);
                    return (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                                onSelect(m);
                                setSearch("");
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-left cursor-pointer transition"
                        >
                            <Avatar src={m.passportImageId} text={initials(m)} size="sm" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{fullName(m)}</p>
                                <p className="text-xs text-gray-500">
                                    {m.memberNumber} · ID {m.individualIdentityCardNumber} · {m.addressMobileLine}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                {mode === "guarantor" ? (
                                    <>
                                        <p className="text-xs text-gray-500">Free deposits</p>
                                        <p className="text-sm font-semibold tabular-nums">{fmt(free)}</p>
                                        <Badge tone="gray" className="mt-0.5">
                                            {guaranteeCount(m.id, excludeLoanId)} guarantee(s)
                                        </Badge>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-xs text-gray-500">Deposits</p>
                                        <p className="text-sm font-semibold tabular-nums">{fmt(b.deposits)}</p>
                                    </>
                                )}
                            </div>
                        </button>
                    );
                })}
                {rows.length === 0 && <EmptyState title="No matching active members" />}
            </div>
        </Modal>
    );
}
