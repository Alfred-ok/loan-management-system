import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Eye, FilePlus2, Pencil, Receipt, Trash2, UserPlus, Users, UserCheck, PiggyBank, Wallet } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { Avatar, Button, Card, PageHeader, SearchInput, Select, StatCard, StatusBadge } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { attempt, confirmAction } from "@/lib/alert";
import { downloadCsv, fmt, fmtDate, fullName, initials, kes } from "@/lib/format";
import { loanPosition } from "@/lib/loanMath";
import { branches } from "@/lib/selectData";
import { MemberRegistrationProvider } from "./MemberRegistrationContext";
import MemberRegistrationDrawer from "./MemberRegistrationDrawer";
import MemberDetailDrawer from "./MemberDetailDrawer";
import MemberEditDrawer from "./MemberEditDrawer";
import PostTransactionModal from "./PostTransactionModal";

export default function Members() {
    const navigate = useNavigate();
    const { can } = useAuth();
    const { members, loans, memberBalances, deleteMember, getMember } = useData();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [registerOpen, setRegisterOpen] = useState(false);
    const [viewId, setViewId] = useState(null);
    const [editId, setEditId] = useState(null);
    const [txnId, setTxnId] = useState(null);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return members
            .map((m) => {
                const b = memberBalances(m.id);
                const running = loans.filter((l) => l.memberId === m.id && l.status === "Disbursed");
                return {
                    ...m,
                    name: fullName(m),
                    deposits: b.deposits,
                    shares: b.shares,
                    loanBalance: running.reduce((s, l) => s + loanPosition(l).balance, 0),
                    loanCount: running.length,
                };
            })
            .filter(
                (m) =>
                    (!statusFilter || m.status === statusFilter) &&
                    (!branchFilter || m.branchId === branchFilter) &&
                    (!q ||
                        [m.name, m.memberNumber, m.individualIdentityCardNumber, m.addressMobileLine, m.individualPayrollNumbers, m.addressEmail]
                            .join(" ")
                            .toLowerCase()
                            .includes(q))
            );
    }, [members, loans, search, statusFilter, branchFilter, memberBalances]);

    const totals = useMemo(() => {
        const all = members.map((m) => memberBalances(m.id));
        return {
            active: members.filter((m) => m.status === "Active").length,
            deposits: all.reduce((s, b) => s + b.deposits, 0),
            shares: all.reduce((s, b) => s + b.shares, 0),
        };
    }, [members, memberBalances]);

    const handleDelete = async (m) => {
        if (await confirmAction({ title: `Delete ${m.name}?`, text: "This cannot be undone.", confirmText: "Delete", danger: true, icon: "warning" }))
            attempt(() => deleteMember(m.id), "Member deleted");
    };

    const exportCsv = () =>
        downloadCsv(
            "members.csv",
            rows.map((m) => ({
                MemberNo: m.memberNumber,
                Name: m.name,
                IdNumber: m.individualIdentityCardNumber,
                Mobile: m.addressMobileLine,
                Email: m.addressEmail,
                Branch: branches.find((b) => b.id === m.branchId)?.name || "",
                Deposits: m.deposits,
                Shares: m.shares,
                LoanBalance: m.loanBalance.toFixed(2),
                Status: m.status,
                Registered: m.registrationDate,
            }))
        );

    return (
        <div>
            <PageHeader
                icon={Users}
                title="Members"
                subtitle="Register, view and manage sacco members"
                actions={
                    <>
                        <Button variant="light" onClick={exportCsv}>
                            <Download className="w-4 h-4" /> Export
                        </Button>
                        {can("members") && (
                            <Button className="bg-white text-indigo-800! hover:bg-indigo-50" onClick={() => setRegisterOpen(true)}>
                                <UserPlus className="w-4 h-4" /> Register Member
                            </Button>
                        )}
                    </>
                }
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users} label="Total Members" value={members.length} tone="indigo" />
                <StatCard icon={UserCheck} label="Active Members" value={totals.active} sub={`${members.length - totals.active} inactive`} tone="emerald" />
                <StatCard icon={PiggyBank} label="Total Deposits" value={kes(totals.deposits)} tone="sky" />
                <StatCard icon={Wallet} label="Share Capital" value={kes(totals.shares)} tone="violet" />
            </div>

            <Card className="p-4 mb-4 flex flex-wrap gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Search name, member no, ID, phone, payroll..." className="flex-1 min-w-64" />
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40" placeholder="All statuses">
                    <option>Active</option>
                    <option>Inactive</option>
                </Select>
                <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-52" placeholder="All branches">
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </Select>
            </Card>

            <DataTable
                rows={rows}
                emptyTitle="No members found"
                emptyMessage={search ? "Try a different search term." : "Register the first member to get started."}
                columns={[
                    {
                        key: "name",
                        header: "Member",
                        render: (m) => (
                            <button type="button" className="flex items-center gap-3 text-left cursor-pointer" onClick={() => setViewId(m.id)}>
                                <Avatar src={m.passportImageId} text={initials(m)} size="sm" />
                                <div>
                                    <p className="font-medium text-gray-900 hover:text-indigo-700">{m.name}</p>
                                    <p className="text-xs text-gray-500">{m.memberNumber}</p>
                                </div>
                            </button>
                        ),
                    },
                    { key: "individualIdentityCardNumber", header: "ID No." },
                    { key: "addressMobileLine", header: "Mobile" },
                    { key: "branchId", header: "Branch", render: (m) => branches.find((b) => b.id === m.branchId)?.name.replace(" Branch", "") || "—" },
                    { key: "deposits", header: "Deposits", align: "right", render: (m) => <span className="tabular-nums">{fmt(m.deposits)}</span> },
                    { key: "shares", header: "Shares", align: "right", render: (m) => <span className="tabular-nums">{fmt(m.shares)}</span> },
                    {
                        key: "loanBalance",
                        header: "Loan Balance",
                        align: "right",
                        render: (m) => <span className="tabular-nums">{m.loanCount ? fmt(m.loanBalance) : "—"}</span>,
                    },
                    { key: "registrationDate", header: "Joined", render: (m) => fmtDate(m.registrationDate) },
                    { key: "status", header: "Status", align: "center", render: (m) => <StatusBadge status={m.status} /> },
                    {
                        key: "actions",
                        header: "Actions",
                        align: "center",
                        sortable: false,
                        render: (m) => (
                            <div className="flex justify-center gap-1">
                                <Button variant="ghost" size="icon" title="View" onClick={() => setViewId(m.id)}>
                                    <Eye className="w-4 h-4 text-indigo-600" />
                                </Button>
                                {can("members") && (
                                    <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditId(m.id)}>
                                        <Pencil className="w-4 h-4 text-amber-600" />
                                    </Button>
                                )}
                                {can("members.transactions") && m.status === "Active" && (
                                    <Button variant="ghost" size="icon" title="Post transaction" onClick={() => setTxnId(m.id)}>
                                        <Receipt className="w-4 h-4 text-emerald-600" />
                                    </Button>
                                )}
                                {can("loans.draft") && m.status === "Active" && (
                                    <Button variant="ghost" size="icon" title="New loan application" onClick={() => navigate(`/loaning/applications?member=${m.id}`)}>
                                        <FilePlus2 className="w-4 h-4 text-violet-600" />
                                    </Button>
                                )}
                                {can("members") && (
                                    <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(m)}>
                                        <Trash2 className="w-4 h-4 text-rose-500" />
                                    </Button>
                                )}
                            </div>
                        ),
                    },
                ]}
            />

            <MemberRegistrationProvider>
                <MemberRegistrationDrawer open={registerOpen} onClose={() => setRegisterOpen(false)} onRegistered={(m) => setViewId(m.id)} />
            </MemberRegistrationProvider>
            <MemberDetailDrawer memberId={viewId} open={!!viewId} onClose={() => setViewId(null)} />
            <MemberEditDrawer member={getMember(editId)} open={!!editId} onClose={() => setEditId(null)} />
            <PostTransactionModal member={getMember(txnId)} open={!!txnId} onClose={() => setTxnId(null)} />
        </div>
    );
}
