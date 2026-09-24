import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { seedActivity, seedLoans, seedMembers, seedProducts, seedSectors, seedSubSectors, seedTransactions } from "@/lib/seed";
import { generateSchedule, loanPosition } from "@/lib/loanMath";
import { today, uid } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// The data layer. Everything is persisted in localStorage so the system runs
// without a backend; each action below maps 1:1 to what would be an API call
// (e.g. registerMember → POST /api/customers, appraiseLoan → POST /api/Loaning/Appraise),
// so swapping in a real API later only touches this file.
// ─────────────────────────────────────────────────────────────────────────────

const DB_KEY = "lms_db_v1";

const freshDb = () => ({
    members: seedMembers,
    transactions: seedTransactions,
    products: seedProducts,
    sectors: seedSectors,
    subSectors: seedSubSectors,
    loans: seedLoans,
    activity: seedActivity,
});

const loadDb = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(DB_KEY));
        if (saved?.members && saved?.loans) return saved;
    } catch {
        // corrupt data — fall through to seed
    }
    return freshDb();
};

// Loan stages in which a guarantor's pledge is still tied up
export const ACTIVE_LOAN_STATUSES = ["Registered", "Appraised", "Approved", "Disbursed"];

const nextNumber = (items, field, prefix) => {
    const max = items.reduce((mx, i) => Math.max(mx, Number(String(i[field] || "").replace(/\D/g, "")) || 0), 0);
    return `${prefix}${String(max + 1).padStart(5, "0")}`;
};

const DataContext = createContext(null);

export function DataProvider({ children }) {
    const { user } = useAuth();
    const [db, setDb] = useState(loadDb);
    const dbRef = useRef(db);
    const by = user?.username || "system";

    useEffect(() => {
        try {
            localStorage.setItem(DB_KEY, JSON.stringify(db));
        } catch (err) {
            console.error("Failed to persist data (storage full?)", err);
        }
    }, [db]);

    const commit = useCallback((updater) => {
        const next = updater(dbRef.current);
        dbRef.current = next;
        setDb(next);
    }, []);

    const log = (action, entity) => ({ id: uid("act_"), date: new Date().toISOString(), user: by, action, entity });
    const withLog = (d, action, entity) => ({ ...d, activity: [log(action, entity), ...d.activity].slice(0, 200) });

    // ── Lookups ───────────────────────────────────────────────────────────────
    const getMember = (id) => db.members.find((m) => m.id === id);
    const getProduct = (id) => db.products.find((p) => p.id === id);
    const getLoan = (id) => db.loans.find((l) => l.id === id);

    const memberBalances = (memberId, data = db) => {
        const sum = (account) =>
            data.transactions
                .filter((t) => t.memberId === memberId && t.account === account)
                .reduce((s, t) => s + (t.type === "Credit" ? 1 : -1) * Number(t.amount || 0), 0);
        return { deposits: sum("DEPOSITS"), shares: sum("SHARES"), registration: sum("REGISTRATION") };
    };

    // Guarantees are released as the guaranteed loan is repaid
    const guaranteeCommitments = (memberId, excludeLoanId = null, data = db) =>
        data.loans
            .filter((l) => l.id !== excludeLoanId && ACTIVE_LOAN_STATUSES.includes(l.status))
            .reduce((sum, l) => {
                const g = l.guarantors?.filter((x) => x.memberId === memberId) || [];
                if (!g.length) return sum;
                let ratio = 1;
                if (l.status === "Disbursed") {
                    const pos = loanPosition(l);
                    ratio = l.disbursedAmount ? pos.principalBalance / l.disbursedAmount : 1;
                }
                return sum + g.reduce((s, x) => s + Number(x.amountGuaranteed || 0) * ratio, 0);
            }, 0);

    const guaranteeCount = (memberId, excludeLoanId = null) =>
        db.loans.filter(
            (l) => l.id !== excludeLoanId && ACTIVE_LOAN_STATUSES.includes(l.status) && l.guarantors?.some((g) => g.memberId === memberId)
        ).length;

    const freeDeposits = (memberId, excludeLoanId = null) =>
        Math.max(0, memberBalances(memberId).deposits - guaranteeCommitments(memberId, excludeLoanId));

    const memberLoans = (memberId) => db.loans.filter((l) => l.memberId === memberId);

    const outstandingPrincipal = (memberId) =>
        memberLoans(memberId)
            .filter((l) => l.status === "Disbursed")
            .reduce((s, l) => s + loanPosition(l).principalBalance, 0);

    /** How much the member may borrow on a product: deposits × multiplier − running loans */
    const eligibility = (memberId, product) => {
        if (!memberId || !product) return 0;
        const { deposits } = memberBalances(memberId);
        const byDeposits = deposits * Number(product.multiplier || 1) - outstandingPrincipal(memberId);
        return Math.max(0, Math.min(byDeposits, Number(product.maxAmount || Infinity)));
    };

    // ── Members ───────────────────────────────────────────────────────────────
    const idNumberTaken = (idNumber, exceptId = null) =>
        db.members.some(
            (m) => m.id !== exceptId && m.individualIdentityCardNumber?.trim().toLowerCase() === idNumber?.trim().toLowerCase()
        );

    const registerMember = (customer, nextOfKins) => {
        if (idNumberTaken(customer.individualIdentityCardNumber)) throw new Error("This ID number is already registered.");
        const member = {
            ...customer,
            id: uid("mem_"),
            memberNumber: nextNumber(dbRef.current.members, "memberNumber", "M"),
            status: "Active",
            nextOfKins,
            createdBy: by,
            createdAt: new Date().toISOString(),
        };
        commit((d) =>
            withLog({ ...d, members: [member, ...d.members] }, `Registered member ${member.memberNumber}`, "Member")
        );
        return member;
    };

    const updateMember = (id, customer, nextOfKins) => {
        if (idNumberTaken(customer.individualIdentityCardNumber, id)) throw new Error("This ID number belongs to another member.");
        commit((d) =>
            withLog(
                { ...d, members: d.members.map((m) => (m.id === id ? { ...m, ...customer, nextOfKins, updatedAt: new Date().toISOString(), updatedBy: by } : m)) },
                `Updated member ${customer.memberNumber || ""}`,
                "Member"
            )
        );
    };

    const setMemberStatus = (id, status) => {
        commit((d) =>
            withLog(
                { ...d, members: d.members.map((m) => (m.id === id ? { ...m, status } : m)) },
                `Member ${getMember(id)?.memberNumber} set to ${status}`,
                "Member"
            )
        );
    };

    const deleteMember = (id) => {
        const hasLoans = db.loans.some((l) => l.memberId === id || l.guarantors?.some((g) => g.memberId === id));
        const hasTxns = db.transactions.some((t) => t.memberId === id);
        if (hasLoans || hasTxns) throw new Error("Member has loans, guarantees or transactions. Deactivate the member instead.");
        const mem = getMember(id);
        commit((d) => withLog({ ...d, members: d.members.filter((m) => m.id !== id) }, `Deleted member ${mem?.memberNumber}`, "Member"));
    };

    const postTransaction = ({ memberId, account, type, amount, date, mode, reference, description }) => {
        const amt = Number(amount);
        if (!amt || amt <= 0) throw new Error("Enter a valid amount.");
        if (type === "Debit") {
            if (account === "DEPOSITS" && amt > freeDeposits(memberId))
                throw new Error("Withdrawal exceeds free deposits (deposits pledged as guarantees are locked).");
            if (account === "SHARES") throw new Error("Share capital is non-withdrawable; transfer it instead.");
        }
        const txn = { id: uid("txn_"), memberId, account, type, amount: amt, date: date || today(), mode, reference, description, by };
        commit((d) =>
            withLog(
                { ...d, transactions: [txn, ...d.transactions] },
                `${type} ${account} ${amt.toLocaleString()} — ${d.members.find((m) => m.id === memberId)?.memberNumber}`,
                "Transaction"
            )
        );
        return txn;
    };

    // ── Setup: products, sectors, sub sectors ─────────────────────────────────
    const saveProduct = (product) => {
        if (db.products.some((p) => p.id !== product.id && p.code.toLowerCase() === product.code.toLowerCase()))
            throw new Error("Product code already exists.");
        commit((d) => {
            const exists = d.products.some((p) => p.id === product.id);
            const products = exists
                ? d.products.map((p) => (p.id === product.id ? product : p))
                : [...d.products, { ...product, id: uid("prd_") }];
            return withLog({ ...d, products }, `${exists ? "Updated" : "Created"} product ${product.name}`, "Loan Product");
        });
    };

    const deleteProduct = (id) => {
        if (db.loans.some((l) => l.productId === id)) throw new Error("Product has loans. Deactivate it instead.");
        commit((d) => withLog({ ...d, products: d.products.filter((p) => p.id !== id) }, "Deleted loan product", "Loan Product"));
    };

    const saveSector = (sector) => {
        if (db.sectors.some((s) => s.id !== sector.id && s.code === sector.code)) throw new Error("Sector code already exists.");
        commit((d) => {
            const exists = d.sectors.some((s) => s.id === sector.id);
            const sectors = exists ? d.sectors.map((s) => (s.id === sector.id ? sector : s)) : [...d.sectors, { ...sector, id: uid("sec_") }];
            return withLog({ ...d, sectors }, `${exists ? "Updated" : "Created"} sector ${sector.name}`, "Loan Sector");
        });
    };

    const deleteSector = (id) => {
        const sec = db.sectors.find((s) => s.id === id);
        if (db.subSectors.some((s) => s.sectorCode === sec?.code) || db.loans.some((l) => l.sectorCode === sec?.code))
            throw new Error("Sector has sub sectors or loans attached.");
        commit((d) => withLog({ ...d, sectors: d.sectors.filter((s) => s.id !== id) }, `Deleted sector ${sec?.name}`, "Loan Sector"));
    };

    const saveSubSector = (sub) => {
        if (!sub.code.startsWith(sub.sectorCode)) throw new Error(`Sub sector code must start with the sector code (${sub.sectorCode}).`);
        if (db.subSectors.some((s) => s.id !== sub.id && s.code === sub.code)) throw new Error("Sub sector code already exists.");
        commit((d) => {
            const exists = d.subSectors.some((s) => s.id === sub.id);
            const subSectors = exists ? d.subSectors.map((s) => (s.id === sub.id ? sub : s)) : [...d.subSectors, { ...sub, id: uid("sub_") }];
            return withLog({ ...d, subSectors }, `${exists ? "Updated" : "Created"} sub sector ${sub.name}`, "Loan Sub Sector");
        });
    };

    const deleteSubSector = (id) => {
        const sub = db.subSectors.find((s) => s.id === id);
        if (db.loans.some((l) => l.subSectorCode === sub?.code)) throw new Error("Sub sector has loans attached.");
        commit((d) => withLog({ ...d, subSectors: d.subSectors.filter((s) => s.id !== id) }, `Deleted sub sector ${sub?.name}`, "Loan Sub Sector"));
    };

    // ── Loans: workflow Registered → Appraised → Approved → Disbursed → Closed ──
    const updateLoanRecord = (id, patch, action, note = "") =>
        commit((d) =>
            withLog(
                {
                    ...d,
                    loans: d.loans.map((l) =>
                        l.id === id
                            ? { ...l, ...patch, history: [...(l.history || []), { date: new Date().toISOString(), action, by, note }] }
                            : l
                    ),
                },
                `${action} — ${d.loans.find((l) => l.id === id)?.loanNumber}`,
                "Loan"
            )
        );

    const createLoan = (data) => {
        const loan = {
            ...data,
            id: uid("loan_"),
            loanNumber: nextNumber(dbRef.current.loans, "loanNumber", "LN"),
            status: "Registered",
            repayments: [],
            createdAt: new Date().toISOString(),
            createdBy: by,
            history: [{ date: new Date().toISOString(), action: "Application registered", by, note: "" }],
        };
        commit((d) => withLog({ ...d, loans: [loan, ...d.loans] }, `Loan application ${loan.loanNumber} registered`, "Loan"));
        return loan;
    };

    const updateLoanApplication = (id, data) => {
        const loan = getLoan(id);
        if (loan?.status !== "Registered") throw new Error("Only draft (registered) applications can be edited.");
        updateLoanRecord(id, data, "Application updated");
    };

    const deleteLoan = (id) => {
        const loan = getLoan(id);
        if (!["Registered", "Rejected"].includes(loan?.status)) throw new Error("Only draft or rejected applications can be deleted.");
        commit((d) => withLog({ ...d, loans: d.loans.filter((l) => l.id !== id) }, `Deleted loan application ${loan.loanNumber}`, "Loan"));
    };

    const appraiseLoan = (id, appraisal) => {
        const appraisalRecord = { ...appraisal, date: appraisal.date || today(), by };
        if (appraisal.option === "1")
            return updateLoanRecord(id, { status: "Appraised", deferred: false, appraisal: appraisalRecord, income: appraisal.income }, "Appraised — recommended for approval", appraisal.remarks);
        if (appraisal.option === "2")
            return updateLoanRecord(
                id,
                { status: "Rejected", appraisal: appraisalRecord, income: appraisal.income, rejection: { reason: appraisal.remarks, date: today(), by, stage: "Appraisal" } },
                "Rejected at appraisal",
                appraisal.remarks
            );
        return updateLoanRecord(id, { deferred: true, appraisal: appraisalRecord, income: appraisal.income }, "Deferred at appraisal", appraisal.remarks);
    };

    const approveLoan = (id, { amount, remarks }) => {
        const loan = getLoan(id);
        if (loan?.status !== "Appraised") throw new Error("Only appraised loans can be approved.");
        if (Number(amount) <= 0) throw new Error("Approved amount must be greater than zero.");
        updateLoanRecord(id, { status: "Approved", approval: { amount: Number(amount), remarks, date: today(), by } }, "Approved", remarks);
    };

    const rejectLoan = (id, { reason }) => {
        const loan = getLoan(id);
        if (!reason?.trim()) throw new Error("A rejection reason is required.");
        updateLoanRecord(id, { status: "Rejected", rejection: { reason, date: today(), by, stage: loan.status } }, "Rejected", reason);
    };

    const reopenLoan = (id) => {
        updateLoanRecord(id, { status: "Registered", deferred: false, rejection: null, appraisal: null, approval: null }, "Re-opened as draft");
    };

    const disbursementPreview = (loan, date = today()) => {
        const product = getProduct(loan.productId) || {};
        const amount = Number(loan.approval?.amount || loan.appraisal?.amount || loan.amountApplied);
        const termMonths = Number(loan.appraisal?.termMonths || loan.termMonths);
        const processingFee = (amount * Number(product.processingFeePct || 0)) / 100;
        const insuranceFee = (amount * Number(product.insurancePct || 0)) / 100;
        const schedule = generateSchedule({ principal: amount, annualRate: loan.annualRate, termMonths, method: loan.method, startDate: date });
        return { amount, termMonths, processingFee, insuranceFee, netAmount: amount - processingFee - insuranceFee, schedule };
    };

    const disburseLoan = (id, { date, mode, reference }) => {
        const loan = getLoan(id);
        if (loan?.status !== "Approved") throw new Error("Only approved loans can be disbursed.");
        if (!date) throw new Error("Disbursement date is required.");
        const p = disbursementPreview(loan, date);
        updateLoanRecord(
            id,
            {
                status: "Disbursed",
                disbursedAmount: p.amount,
                termMonths: p.termMonths,
                schedule: p.schedule,
                disbursement: { date, mode, reference, processingFee: p.processingFee, insuranceFee: p.insuranceFee, netAmount: p.netAmount, by },
            },
            "Disbursed",
            `${mode} ${reference || ""} — net ${p.netAmount.toFixed(2)}`
        );
    };

    const recordRepayment = (id, { amount, date, mode, reference }) => {
        const loan = getLoan(id);
        if (loan?.status !== "Disbursed") throw new Error("Repayments can only be posted to disbursed loans.");
        const amt = Number(amount);
        if (!amt || amt <= 0) throw new Error("Enter a valid amount.");
        const pos = loanPosition(loan);
        if (amt > pos.balance + 0.01) throw new Error(`Amount exceeds the loan balance of ${pos.balance.toLocaleString()}.`);
        const repayment = { id: uid("rep_"), date: date || today(), amount: amt, mode, reference, by };
        const repayments = [...(loan.repayments || []), repayment];
        const closed = loanPosition({ ...loan, repayments }).balance <= 0.01;
        updateLoanRecord(
            id,
            { repayments, status: closed ? "Closed" : "Disbursed", closedDate: closed ? repayment.date : null },
            closed ? "Repayment received — loan fully repaid & closed" : "Repayment received",
            `${amt.toLocaleString()} via ${mode}`
        );
        return { closed };
    };

    const resetDemoData = () => {
        const fresh = freshDb();
        dbRef.current = fresh;
        setDb(fresh);
        localStorage.removeItem("loan_application_drafts");
        localStorage.removeItem("member_registration_drafts");
    };

    const value = useMemo(
        () => ({
            ...db,
            getMember, getProduct, getLoan,
            memberBalances, guaranteeCommitments, guaranteeCount, freeDeposits, memberLoans, outstandingPrincipal, eligibility,
            idNumberTaken, registerMember, updateMember, setMemberStatus, deleteMember, postTransaction,
            saveProduct, deleteProduct, saveSector, deleteSector, saveSubSector, deleteSubSector,
            createLoan, updateLoanApplication, deleteLoan, appraiseLoan, approveLoan, rejectLoan, reopenLoan,
            disbursementPreview, disburseLoan, recordRepayment, resetDemoData,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [db, by]
    );

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error("useData must be used inside DataProvider");
    return ctx;
}
