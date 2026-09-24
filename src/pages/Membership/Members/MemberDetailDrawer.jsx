import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Pencil, Printer, Receipt, UserCheck, UserX } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import DataTable from "@/components/ui/DataTable";
import { Avatar, Badge, Button, Card, EmptyState, InfoGrid, Select, SectionTitle, StatCard, StatusBadge, Tabs } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ACTIVE_LOAN_STATUSES, useData } from "@/context/DataContext";
import { attempt, confirmAction } from "@/lib/alert";
import { ageFrom, fmt, fmtDate, fullName, initials, kes } from "@/lib/format";
import { loanPosition } from "@/lib/loanMath";
import { branches, idTypes, memberTypes, salutations } from "@/lib/selectData";
import LoanCaseDrawer from "@/pages/Loaning/components/LoanCaseDrawer";
import MemberEditDrawer from "./MemberEditDrawer";
import PostTransactionModal, { ACCOUNTS } from "./PostTransactionModal";

const labelOf = (list, v) => list.find((x) => String(x.value) === String(v))?.label || v;

export default function MemberDetailDrawer({ memberId, open, onClose }) {
    const navigate = useNavigate();
    const { can } = useAuth();
    const data = useData();
    const { getMember, memberBalances, memberLoans, guaranteeCommitments, freeDeposits, transactions, loans, setMemberStatus } = data;
    const member = getMember(memberId);

    const [tab, setTab] = useState("info");
    const [editOpen, setEditOpen] = useState(false);
    const [txnOpen, setTxnOpen] = useState(false);
    const [loanId, setLoanId] = useState(null);
    const [stmtAccount, setStmtAccount] = useState("ALL");

    const statement = useMemo(() => {
        if (!member) return [];
        const rows = transactions
            .filter((t) => t.memberId === member.id && (stmtAccount === "ALL" || t.account === stmtAccount))
            .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        const running = {};
        return rows.map((t) => {
            const signed = (t.type === "Credit" ? 1 : -1) * Number(t.amount);
            running[t.account] = (running[t.account] || 0) + signed;
            return { ...t, balance: running[t.account] };
        });
    }, [member, transactions, stmtAccount]);

    if (!member) return null;

    const balances = memberBalances(member.id);
    const myLoans = memberLoans(member.id);
    const activeLoans = myLoans.filter((l) => l.status === "Disbursed");
    const outstanding = activeLoans.reduce((s, l) => s + loanPosition(l).balance, 0);
    const guarantees = loans.filter((l) => l.guarantors?.some((g) => g.memberId === member.id));
    const committed = guaranteeCommitments(member.id);

    const toggleStatus = async () => {
        const next = member.status === "Active" ? "Inactive" : "Active";
        if (await confirmAction({ title: `Set member to ${next}?`, confirmText: `Set ${next}`, danger: next === "Inactive" }))
            attempt(() => setMemberStatus(member.id, next), `Member is now ${next}`);
    };

    const tabs = [
        { value: "info", label: "Member Info" },
        { value: "kin", label: "Next of Kin", count: member.nextOfKins?.length || 0 },
        { value: "accounts", label: "Accounts" },
        { value: "loans", label: "Loans", count: myLoans.length },
        { value: "guarantees", label: "Guarantees", count: guarantees.length },
        { value: "statement", label: "Statement" },
        { value: "documents", label: "Documents" },
    ];

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                title={fullName(member)}
                subtitle={`${member.memberNumber} · ID ${member.individualIdentityCardNumber} · Joined ${fmtDate(member.registrationDate)}`}
                width="max-w-6xl"
                actions={
                    can("members") && (
                        <Button variant="light" size="sm" onClick={() => setEditOpen(true)}>
                            <Pencil className="w-4 h-4" /> <span className="hidden sm:inline">Edit</span>
                        </Button>
                    )
                }
            >
                <Card className="p-4 mb-4 flex flex-wrap items-center gap-4">
                    <Avatar src={member.passportImageId} text={initials(member)} size="lg" />
                    <div className="flex-1 min-w-48">
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-lg text-gray-900">{fullName(member)}</p>
                            <StatusBadge status={member.status} />
                        </div>
                        <p className="text-sm text-gray-500">
                            {member.addressMobileLine} · {member.addressEmail || "no email"} · {branches.find((b) => b.id === member.branchId)?.name}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {can("members.transactions") && (
                            <Button variant="secondary" size="sm" onClick={() => setTxnOpen(true)} disabled={member.status !== "Active"}>
                                <Receipt className="w-4 h-4" /> Post Transaction
                            </Button>
                        )}
                        {can("loans.draft") && (
                            <Button size="sm" onClick={() => navigate(`/loaning/applications?member=${member.id}`)} disabled={member.status !== "Active"}>
                                <FilePlus2 className="w-4 h-4" /> New Loan Application
                            </Button>
                        )}
                        {can("members") && (
                            <Button variant="outline" size="sm" onClick={toggleStatus}>
                                {member.status === "Active" ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                {member.status === "Active" ? "Deactivate" : "Activate"}
                            </Button>
                        )}
                    </div>
                </Card>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <StatCard label="Deposits" value={kes(balances.deposits)} sub={`Free: ${kes(freeDeposits(member.id))}`} tone="indigo" />
                    <StatCard label="Share Capital" value={kes(balances.shares)} tone="emerald" />
                    <StatCard label="Loan Balance" value={kes(outstanding)} sub={`${activeLoans.length} running loan(s)`} tone="amber" />
                    <StatCard label="Guarantee Commitments" value={kes(committed)} sub={`${guarantees.filter((l) => ACTIVE_LOAN_STATUSES.includes(l.status)).length} active`} tone="violet" />
                </div>

                <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />

                {tab === "info" && (
                    <div className="space-y-4">
                        <Card className="p-5">
                            <SectionTitle>Personal Details</SectionTitle>
                            <InfoGrid
                                items={[
                                    ["Member Number", member.memberNumber],
                                    ["Member Type", labelOf(memberTypes, member.type)],
                                    ["Salutation", labelOf(salutations, member.individualSalutation)],
                                    ["Surname", member.individualLastName],
                                    ["Other Names", member.individualFirstName],
                                    ["ID Type", labelOf(idTypes, member.individualIdentityCardType)],
                                    ["ID / Passport No.", member.individualIdentityCardNumber],
                                    ["KRA PIN", member.personalIdentificationNumber],
                                    ["Date of Birth", member.individualBirthDate ? `${fmtDate(member.individualBirthDate)} (${ageFrom(member.individualBirthDate)} yrs)` : null],
                                    ["Gender", member.individualGender],
                                    ["Marital Status", member.individualMaritalStatus],
                                    ["Nationality", member.individualNationality],
                                    ["Mobile", member.addressMobileLine],
                                    ["Landline", member.addressLandLine],
                                    ["Email", member.addressEmail],
                                    ["Postal Address", [member.addressAddressLine1, member.addressPostalCode].filter(Boolean).join(" - ")],
                                    ["City / Town", member.addressCity],
                                    ["Place of Birth", member.addressAddressLine2],
                                    ["Branch", branches.find((b) => b.id === member.branchId)?.name],
                                    ["Registration Date", fmtDate(member.registrationDate)],
                                    ["Registered By", member.createdBy],
                                ]}
                            />
                        </Card>
                        <Card className="p-5">
                            <SectionTitle>Employment & Bank</SectionTitle>
                            <InfoGrid
                                items={[
                                    ["Employer", member.employerName],
                                    ["Payroll Number", member.individualPayrollNumbers],
                                    ["Designation", member.individualEmploymentDesignation],
                                    ["Terms of Service", member.individualEmploymentTermsOfService],
                                    ["Employment Date", fmtDate(member.individualEmploymentDate)],
                                    ["Recruited By", member.recruitedBy],
                                    ["Bank", member.bankName],
                                    ["Bank Branch", member.branchName],
                                    ["Account Number", member.reference1],
                                ]}
                            />
                            {member.remarks && <p className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{member.remarks}</p>}
                        </Card>
                    </div>
                )}

                {tab === "kin" && (
                    <div className="grid md:grid-cols-2 gap-4">
                        {(member.nextOfKins || []).map((k, i) => (
                            <Card key={i} className="p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="font-semibold text-gray-900">
                                        {k.firstName} {k.lastName}
                                    </p>
                                    <Badge tone="indigo">{k.nominatedPercentage}%</Badge>
                                </div>
                                <InfoGrid
                                    cols={2}
                                    items={[
                                        ["Relationship", k.relationship],
                                        ["Gender", k.gender],
                                        ["ID Number", k.identityCardNumber],
                                        ["Mobile", k.addressMobileLine],
                                        ["Email", k.addressEmail],
                                        ["Address", k.addressAddressLine1],
                                    ]}
                                />
                            </Card>
                        ))}
                        {!member.nextOfKins?.length && <EmptyState title="No next of kin recorded" />}
                    </div>
                )}

                {tab === "accounts" && (
                    <DataTable
                        rowKey="account"
                        rows={Object.entries(ACCOUNTS).map(([account, name]) => {
                            const txns = transactions.filter((t) => t.memberId === member.id && t.account === account);
                            return {
                                account,
                                name,
                                count: txns.length,
                                last: txns.map((t) => t.date).sort().pop(),
                                balance: balances[account === "DEPOSITS" ? "deposits" : account === "SHARES" ? "shares" : "registration"],
                            };
                        })}
                        columns={[
                            { key: "name", header: "Account", render: (r) => <span className="font-medium">{r.name}</span> },
                            { key: "account", header: "Code" },
                            { key: "count", header: "Transactions", align: "center" },
                            { key: "last", header: "Last Activity", render: (r) => fmtDate(r.last) },
                            { key: "balance", header: "Balance", align: "right", render: (r) => <span className="font-semibold tabular-nums">{kes(r.balance)}</span> },
                        ]}
                    />
                )}

                {tab === "loans" && (
                    <DataTable
                        rows={myLoans}
                        emptyTitle="No loans yet"
                        emptyMessage="Applications made by this member will appear here."
                        onRowClick={(l) => setLoanId(l.id)}
                        columns={[
                            { key: "loanNumber", header: "Loan No.", render: (l) => <span className="font-medium text-indigo-700">{l.loanNumber}</span> },
                            { key: "productName", header: "Product" },
                            { key: "receivedDate", header: "Applied", render: (l) => fmtDate(l.receivedDate) },
                            { key: "amountApplied", header: "Amount", align: "right", render: (l) => fmt(l.disbursedAmount || l.amountApplied) },
                            {
                                key: "balance",
                                header: "Balance",
                                align: "right",
                                render: (l) => (["Disbursed", "Closed"].includes(l.status) ? fmt(loanPosition(l).balance) : "—"),
                            },
                            { key: "status", header: "Status", align: "center", render: (l) => <StatusBadge status={l.status} deferred={l.deferred} /> },
                        ]}
                    />
                )}

                {tab === "guarantees" && (
                    <DataTable
                        rows={guarantees}
                        emptyTitle="Not guaranteeing any loan"
                        onRowClick={(l) => setLoanId(l.id)}
                        columns={[
                            { key: "loanNumber", header: "Loan No.", render: (l) => <span className="font-medium text-indigo-700">{l.loanNumber}</span> },
                            { key: "borrower", header: "Borrower", render: (l) => fullName(getMember(l.memberId)) },
                            { key: "productName", header: "Product" },
                            {
                                key: "guaranteed",
                                header: "Amount Guaranteed",
                                align: "right",
                                render: (l) => fmt(l.guarantors.filter((g) => g.memberId === member.id).reduce((s, g) => s + Number(g.amountGuaranteed), 0)),
                            },
                            { key: "status", header: "Loan Status", align: "center", render: (l) => <StatusBadge status={l.status} deferred={l.deferred} /> },
                        ]}
                    />
                )}

                {tab === "statement" && (
                    <div className="print-area">
                        <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                            <div>
                                <p className="font-semibold text-gray-900">Member Statement — {fullName(member)}</p>
                                <p className="text-xs text-gray-500">
                                    {member.memberNumber} · printed {fmtDate(new Date())}
                                </p>
                            </div>
                            <div className="flex gap-2 no-print">
                                <Select value={stmtAccount} onChange={(e) => setStmtAccount(e.target.value)} className="w-48">
                                    <option value="ALL">All accounts</option>
                                    {Object.entries(ACCOUNTS).map(([k, v]) => (
                                        <option key={k} value={k}>
                                            {v}
                                        </option>
                                    ))}
                                </Select>
                                <Button variant="outline" onClick={() => window.print()}>
                                    <Printer className="w-4 h-4" /> Print
                                </Button>
                            </div>
                        </div>
                        <DataTable
                            rows={statement}
                            pageSize={1000}
                            compact
                            emptyTitle="No transactions"
                            columns={[
                                { key: "date", header: "Date", render: (t) => fmtDate(t.date) },
                                { key: "account", header: "Account", render: (t) => ACCOUNTS[t.account] },
                                { key: "description", header: "Description" },
                                { key: "reference", header: "Ref" },
                                { key: "debit", header: "Debit", align: "right", render: (t) => (t.type === "Debit" ? fmt(t.amount) : "") },
                                { key: "credit", header: "Credit", align: "right", render: (t) => (t.type === "Credit" ? fmt(t.amount) : "") },
                                { key: "balance", header: "Balance", align: "right", render: (t) => <span className="font-medium tabular-nums">{fmt(t.balance)}</span> },
                            ]}
                        />
                    </div>
                )}

                {tab === "documents" && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            ["ID Front", member.identityCardFrontSideImageId],
                            ["ID Back", member.identityCardBackSideImageId],
                            ["Passport Photo", member.passportImageId],
                            ["Signature", member.signatureImageId],
                        ].map(([label, src]) => (
                            <Card key={label} className="p-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">{label}</p>
                                {src ? (
                                    <img src={src} alt={label} className="w-full h-40 object-contain bg-gray-50 rounded-lg" />
                                ) : (
                                    <div className="h-40 rounded-lg bg-gray-50 flex items-center justify-center text-xs text-gray-400">Not uploaded</div>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </Drawer>

            <MemberEditDrawer member={member} open={editOpen} onClose={() => setEditOpen(false)} />
            <PostTransactionModal open={txnOpen} onClose={() => setTxnOpen(false)} member={member} />
            <LoanCaseDrawer loanId={loanId} open={!!loanId} onClose={() => setLoanId(null)} />
        </>
    );
}
