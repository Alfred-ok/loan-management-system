import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, FolderOpen, Plus, Save, Search, Trash2, UserPlus } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Avatar, Badge, Button, Card, Field, InfoGrid, Input, InfoRow, SectionTitle, Select, Textarea, cx } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { Swal, confirmAction, errorAlert, toast } from "@/lib/alert";
import { fmt, fmtDateTime, fullName, initials, kes, today } from "@/lib/format";
import { generateSchedule, INTEREST_METHODS, salaryAppraisal, summarizeSchedule, twoThirdRule } from "@/lib/loanMath";
import { loanPurposes } from "@/lib/selectData";
import MemberSelectModal from "../components/MemberSelectModal";
import LoanProductSelectModal from "../components/LoanProductSelectModal";
import ScheduleTable from "../components/ScheduleTable";
import { initialGuarantor, useLoanApplication } from "./LoanApplicationContext";

const STEPS = ["Member & Product", "Loan Details", "Income (Payslip)", "Guarantors", "Review & Submit"];

export default function AddLoanApplicationDrawer({ open, onClose, editLoanId = null }) {
    const {
        form, setForm, guarantors, setGuarantors, step, setStep, hasDraft,
        drafts, activeDraftId, activeDraft, saveNewDraft, loadDraft, deleteDraft, newForm,
    } = useLoanApplication();
    const data = useData();
    const {
        getMember, getProduct, getLoan, memberBalances, eligibility, freeDeposits, guaranteeCount, outstandingPrincipal,
        sectors, subSectors, createLoan, updateLoanApplication,
    } = data;

    const [errors, setErrors] = useState({});
    const [memberModal, setMemberModal] = useState(false);
    const [productModal, setProductModal] = useState(false);
    const [guarantorModalIndex, setGuarantorModalIndex] = useState(null);
    const [draftsOpen, setDraftsOpen] = useState(false);

    useEffect(() => {
        if (open) setErrors({});
    }, [open]);

    const member = getMember(form.memberId);
    const product = getProduct(form.productId);
    const balances = member ? memberBalances(member.id) : { deposits: 0, shares: 0 };
    const maxEligible = eligibility(form.memberId, product);
    const amount = Number(form.amountApplied) || 0;
    const term = Number(form.termMonths) || 0;
    const isEdit = Boolean(editLoanId);
    const editingLoan = isEdit ? getLoan(editLoanId) : null;

    const schedule = useMemo(
        () => (amount > 0 && term > 0 ? generateSchedule({ principal: amount, annualRate: form.annualRate, termMonths: term, method: form.method, startDate: form.receivedDate }) : []),
        [amount, term, form.annualRate, form.method, form.receivedDate]
    );
    const summary = summarizeSchedule(schedule);
    const income = form.income || {};
    const netPay = Number(income.basic || 0) + Number(income.allowance || 0) - Number(income.deductions || 0);
    const sal = salaryAppraisal({ netPay, termMonths: term, amount });
    const tt = twoThirdRule({ basic: income.basic, allowance: income.allowance, deductions: income.deductions, repayment: summary.installment });

    const totalGuaranteed = guarantors.reduce((s, g) => s + (Number(g.amountGuaranteed) || 0), 0);
    const applicantFree = member ? freeDeposits(member.id, editLoanId) : 0;
    const security = applicantFree + totalGuaranteed;
    const coverage = amount > 0 ? (security / amount) * 100 : 0;

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const updateIncome = (key, value) => setForm((prev) => ({ ...prev, income: { ...prev.income, [key]: value } }));
    const updateGuarantor = (i, key, value) => setGuarantors((prev) => prev.map((g, idx) => (idx === i ? { ...g, [key]: value } : g)));

    const selectProduct = (p) => {
        setForm((prev) => ({
            ...prev,
            productId: p.id,
            productName: p.name,
            annualRate: p.annualRate,
            method: p.method,
            termMonths: prev.termMonths && Number(prev.termMonths) <= p.maxTermMonths ? prev.termMonths : p.maxTermMonths,
        }));
        // Make sure there are at least as many guarantor rows as the product needs
        setGuarantors((prev) => (prev.length >= p.minGuarantors ? prev : [...prev, ...Array.from({ length: p.minGuarantors - prev.length }, () => ({ ...initialGuarantor }))]));
        setProductModal(false);
    };

    // ── Validation per step (0 = everything) ──────────────────────────────────
    const validate = (s) => {
        const e = {};
        const all = s === 0;
        if (all || s === 1) {
            if (!form.memberId) e.memberId = "Select the applicant";
            else if (member?.status !== "Active") e.memberId = "Member is not active";
            if (!form.productId) e.productId = "Select a loan product";
        }
        if ((all || s === 2) && product) {
            if (amount <= 0) e.amountApplied = "Enter the amount applied";
            else if (amount < product.minAmount) e.amountApplied = `Minimum for this product is ${kes(product.minAmount)}`;
            else if (amount > product.maxAmount) e.amountApplied = `Maximum for this product is ${kes(product.maxAmount)}`;
            if (term <= 0) e.termMonths = "Enter the repayment period";
            else if (term > product.maxTermMonths) e.termMonths = `Maximum period is ${product.maxTermMonths} months`;
            if (!form.purpose) e.purpose = "Select the loan purpose";
            if (!form.sectorCode) e.sectorCode = "Select a sector";
            if (!form.subSectorCode) e.subSectorCode = "Select a sub sector";
            if (!form.receivedDate) e.receivedDate = "Enter the application date";
        }
        if (all || s === 3) {
            if (!(Number(income.basic) > 0)) e.basic = "Basic salary / monthly income is required for appraisal";
            if (Number(income.deductions) < 0) e.deductions = "Deductions cannot be negative";
        }
        if ((all || s === 4) && product) {
            if (guarantors.length < product.minGuarantors) e.guarantors = `This product requires at least ${product.minGuarantors} guarantor(s)`;
            const seen = new Set();
            guarantors.forEach((g, i) => {
                if (!g.memberId) e[`g_${i}`] = "Select a guarantor";
                else if (seen.has(g.memberId)) e[`g_${i}`] = "Guarantor listed twice";
                else if (g.memberId === form.memberId && !product.allowSelfGuarantee) e[`g_${i}`] = "Self-guarantee is not allowed on this product";
                else if (guaranteeCount(g.memberId, editLoanId) >= product.maxGuarantees)
                    e[`g_${i}`] = `Already guaranteeing ${product.maxGuarantees} loans (the product maximum)`;
                else if (!(Number(g.amountGuaranteed) > 0)) e[`g_${i}`] = "Enter the amount guaranteed";
                else if (Number(g.amountGuaranteed) > freeDeposits(g.memberId, editLoanId) + 0.01)
                    e[`g_${i}`] = `Exceeds free deposits of ${kes(freeDeposits(g.memberId, editLoanId))}`;
                if (g.memberId) seen.add(g.memberId);
            });
            if (totalGuaranteed > amount) e.guarantors = "Total guaranteed amount cannot exceed the amount applied";
        }
        return e;
    };

    // Once errors are showing, re-check the current step as the user edits
    useEffect(() => {
        if (Object.values(errors).some(Boolean)) setErrors(validate(step));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form, guarantors]);

    const stepOfError = (key) => {
        if (["memberId", "productId"].includes(key)) return 1;
        if (["basic", "deductions"].includes(key)) return 3;
        if (key === "guarantors" || key.startsWith("g_")) return 4;
        return 2;
    };

    const goNext = () => {
        const e = validate(step);
        setErrors(e);
        if (!Object.keys(e).length) setStep((s) => Math.min(STEPS.length, s + 1));
    };

    // ── Drafts ────────────────────────────────────────────────────────────────
    const handleSaveDraft = () => {
        if (!hasDraft) return Swal.fire("Nothing to save", "Select a member or product first.", "info");
        if (activeDraftId) return toast("Draft updated");
        saveNewDraft(member ? `${fullName(member)} — ${product?.name || "no product"}` : undefined);
        toast("Draft saved");
    };

    const handleClose = async () => {
        if (!isEdit && hasDraft && !activeDraftId) {
            const res = await Swal.fire({
                title: "Save before closing?",
                text: "Save this application as a draft so you can continue later?",
                icon: "warning",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonColor: "#4f46e5",
                confirmButtonText: "Save Draft & Close",
                denyButtonText: "Discard",
                cancelButtonText: "Stay",
            });
            if (res.isConfirmed) {
                saveNewDraft(member ? `${fullName(member)} — ${product?.name || "no product"}` : undefined);
                newForm();
                onClose();
            } else if (res.isDenied) {
                newForm();
                onClose();
            }
            return;
        }
        if (isEdit || activeDraftId) newForm();
        onClose();
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const e = validate(0);
        setErrors(e);
        if (Object.keys(e).length) {
            const first = Object.keys(e)[0];
            setStep(stepOfError(first));
            return errorAlert(new Error(e[first]), "Please fix the application");
        }

        const warnings = [];
        if (amount > maxEligible) warnings.push(`Amount exceeds the member's deposit-based eligibility of <b>${kes(maxEligible)}</b>.`);
        if (coverage < 100) warnings.push(`Loan is only <b>${coverage.toFixed(0)}%</b> secured by free deposits and guarantees.`);
        if (!sal.isAffordable) warnings.push(`Amount exceeds the salary appraisal (⅓ of net pay × term) by <b>${kes(sal.shortfall)}</b>.`);
        if (tt.isTwoThirdRuleBroken) warnings.push(`Repayment would break the 2/3 rule by <b>${kes(tt.excessAmount)}</b>.`);
        if (warnings.length) {
            const ok = await confirmAction({
                title: "Submit with warnings?",
                html: `<ul style="text-align:left;line-height:1.6">${warnings.map((w) => `<li>⚠️ ${w}</li>`).join("")}</ul><p style="margin-top:10px;font-size:13px;color:#6b7280">The appraiser will review these before the loan can proceed.</p>`,
                icon: "warning",
                confirmText: "Submit anyway",
            });
            if (!ok) return;
        }

        const payload = {
            memberId: form.memberId,
            productId: form.productId,
            productName: product.name,
            annualRate: Number(form.annualRate),
            method: form.method,
            termMonths: term,
            amountApplied: amount,
            purpose: form.purpose,
            sectorCode: form.sectorCode,
            subSectorCode: form.subSectorCode,
            receivedDate: form.receivedDate,
            reference: form.reference,
            remarks: form.remarks,
            income: { basic: Number(income.basic) || 0, allowance: Number(income.allowance) || 0, deductions: Number(income.deductions) || 0 },
            guarantors: guarantors.map((g) => ({ memberId: g.memberId, amountGuaranteed: Number(g.amountGuaranteed), remarks: g.remarks || "" })),
        };

        try {
            if (isEdit) {
                updateLoanApplication(editLoanId, payload);
                toast("Application updated");
            } else {
                const loan = createLoan(payload);
                if (activeDraftId) deleteDraft(activeDraftId);
                await Swal.fire({
                    icon: "success",
                    title: "Application registered",
                    html: `Loan <b>${loan.loanNumber}</b> for <b>${fullName(member)}</b> is now in the Draft stage awaiting appraisal.`,
                    confirmButtonColor: "#4f46e5",
                });
            }
            newForm();
            onClose();
        } catch (err) {
            errorAlert(err);
        }
    };

    const filteredSubSectors = subSectors.filter((s) => s.active && form.sectorCode && s.sectorCode === form.sectorCode);
    const stepHasError = (i) => Object.keys(errors).some((k) => errors[k] && stepOfError(k) === i);

    return (
        <>
            <Drawer
                open={open}
                onClose={handleClose}
                title={isEdit ? `Edit Loan Application — ${editingLoan?.loanNumber}` : "New Loan Application"}
                subtitle={isEdit ? "Only draft applications can be edited" : activeDraft ? `📝 Draft — ${activeDraft.label} · saved ${fmtDateTime(activeDraft.lastSaved)}` : "Capture a member's loan request"}
                width="max-w-6xl"
                actions={
                    !isEdit && (
                        <>
                            <Button variant="light" size="sm" onClick={handleSaveDraft}>
                                <Save className="w-4 h-4" /> <span className="hidden sm:inline">Save Draft</span>
                            </Button>
                            <div className="relative">
                                <Button variant="light" size="sm" onClick={() => setDraftsOpen((v) => !v)}>
                                    <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Drafts</span>
                                </Button>
                                {drafts.length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{drafts.length}</span>
                                )}
                            </div>
                        </>
                    )
                }
                footer={
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
                            <ChevronLeft className="w-4 h-4" /> Back
                        </Button>
                        {step < STEPS.length ? (
                            <Button onClick={goNext}>
                                Next <ChevronRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button variant="success" onClick={handleSubmit}>
                                <Check className="w-4 h-4" /> {isEdit ? "Save Changes" : "Submit Application"}
                            </Button>
                        )}
                    </div>
                }
            >
                <AnimatePresence>
                    {draftsOpen && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-3 bg-white rounded-xl p-3 shadow-lg border border-indigo-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-indigo-700 font-semibold text-sm">Saved Loan Drafts</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        newForm();
                                        setDraftsOpen(false);
                                    }}
                                    className="text-xs text-indigo-600 hover:underline cursor-pointer"
                                >
                                    + New Form
                                </button>
                            </div>
                            {drafts.length === 0 ? (
                                <p className="text-gray-400 text-xs text-center py-2">No drafts saved yet</p>
                            ) : (
                                <ul className="space-y-2 max-h-52 overflow-y-auto">
                                    {drafts.map((d) => (
                                        <li
                                            key={d.id}
                                            onClick={() => {
                                                loadDraft(d.id);
                                                setDraftsOpen(false);
                                                setErrors({});
                                            }}
                                            className={cx("flex justify-between items-center p-2 rounded-lg cursor-pointer text-sm hover:bg-indigo-50", activeDraftId === d.id ? "bg-indigo-100 border border-indigo-300" : "bg-gray-50")}
                                        >
                                            <div>
                                                <p className="font-medium text-gray-700">{d.label}</p>
                                                <p className="text-gray-400 text-[11px]">
                                                    Step {d.step || 1} of {STEPS.length} · Saved {fmtDateTime(d.lastSaved)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async (ev) => {
                                                    ev.stopPropagation();
                                                    if (await confirmAction({ title: "Delete this draft?", confirmText: "Delete", danger: true, icon: "warning" })) deleteDraft(d.id);
                                                }}
                                                className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer"
                                                aria-label="Delete draft"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* STEP SIDEBAR */}
                    <aside className="md:col-span-3 space-y-3">
                        <div className="bg-gray-200/70 p-3 rounded-xl">
                            {STEPS.map((label, i) => (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={() => setStep(i + 1)}
                                    className={cx(
                                        "w-full text-left p-3 mb-2 last:mb-0 rounded-lg border text-sm font-medium flex items-center gap-3 cursor-pointer transition",
                                        step === i + 1 ? "bg-indigo-700 border-indigo-500 text-white shadow" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    <span
                                        className={cx(
                                            "w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0",
                                            step === i + 1 ? "bg-white text-indigo-700" : stepHasError(i + 1) ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"
                                        )}
                                    >
                                        {i + 1}
                                    </span>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {member && (
                            <Card className="p-3 text-sm">
                                <p className="text-xs font-semibold text-gray-500 mb-1">APPLICATION SUMMARY</p>
                                <InfoRow label="Applicant" value={fullName(member)} />
                                <InfoRow label="Product" value={product?.name || "—"} />
                                <InfoRow label="Amount" value={amount ? fmt(amount) : "—"} />
                                <InfoRow label="Installment" value={summary.installment ? fmt(summary.installment) : "—"} />
                                <InfoRow label="Security" value={amount ? `${coverage.toFixed(0)}%` : "—"} />
                            </Card>
                        )}
                    </aside>

                    <section className="md:col-span-9 space-y-4">
                        {/* STEP 1 — MEMBER & PRODUCT */}
                        {step === 1 && (
                            <>
                                <Card className="p-5">
                                    <SectionTitle>Applicant (Member)</SectionTitle>
                                    {member ? (
                                        <div className="flex flex-wrap items-center gap-4">
                                            <Avatar src={member.passportImageId} text={initials(member)} size="lg" />
                                            <div className="flex-1 min-w-48">
                                                <p className="font-semibold text-gray-900">{fullName(member)}</p>
                                                <p className="text-sm text-gray-500">
                                                    {member.memberNumber} · ID {member.individualIdentityCardNumber} · {member.addressMobileLine}
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Badge tone="indigo">Deposits {fmt(balances.deposits)}</Badge>
                                                    <Badge tone="emerald">Shares {fmt(balances.shares)}</Badge>
                                                    <Badge tone="amber">Running loans {fmt(outstandingPrincipal(member.id))}</Badge>
                                                </div>
                                            </div>
                                            {!isEdit && (
                                                <Button variant="outline" size="sm" onClick={() => setMemberModal(true)}>
                                                    Change
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setMemberModal(true)}
                                            className={cx(
                                                "w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl text-sm cursor-pointer hover:bg-indigo-50",
                                                errors.memberId ? "border-rose-300 text-rose-600" : "border-gray-300 text-gray-500 hover:border-indigo-400"
                                            )}
                                        >
                                            <Search className="w-4 h-4" /> Click to search and select a member
                                        </button>
                                    )}
                                    {errors.memberId && <p className="text-xs text-rose-600 mt-2">{errors.memberId}</p>}
                                </Card>

                                <Card className="p-5">
                                    <SectionTitle>Loan Product</SectionTitle>
                                    {product ? (
                                        <div>
                                            <div className="flex justify-between items-start gap-3 mb-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{product.name}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {product.code} · {product.category} · {product.section}
                                                    </p>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => setProductModal(true)}>
                                                    Change
                                                </Button>
                                            </div>
                                            <InfoGrid
                                                cols={4}
                                                items={[
                                                    ["Interest Rate", `${product.annualRate}% p.a.`],
                                                    ["Interest Method", INTEREST_METHODS[product.method]],
                                                    ["Amount Range", `${fmt(product.minAmount)} – ${fmt(product.maxAmount)}`],
                                                    ["Max Period", `${product.maxTermMonths} months`],
                                                    ["Deposits Multiplier", `${product.multiplier}×`],
                                                    ["Min Guarantors", product.minGuarantors],
                                                    ["Max Guarantees / Guarantor", product.maxGuarantees],
                                                    ["Self Guarantee", product.allowSelfGuarantee ? "Allowed" : "Not allowed"],
                                                ]}
                                            />
                                            {member && (
                                                <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
                                                    Based on deposits of {kes(balances.deposits)} × {product.multiplier} less running loans, this member qualifies for up to{" "}
                                                    <b>{kes(maxEligible)}</b>.
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setProductModal(true)}
                                            className={cx(
                                                "w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl text-sm cursor-pointer hover:bg-indigo-50",
                                                errors.productId ? "border-rose-300 text-rose-600" : "border-gray-300 text-gray-500 hover:border-indigo-400"
                                            )}
                                        >
                                            <Search className="w-4 h-4" /> Click to select a loan product
                                        </button>
                                    )}
                                    {errors.productId && <p className="text-xs text-rose-600 mt-2">{errors.productId}</p>}
                                </Card>
                            </>
                        )}

                        {/* STEP 2 — LOAN DETAILS */}
                        {step === 2 && (
                            <>
                                {!product ? (
                                    <Card className="p-6 text-center text-sm text-gray-500">Select a loan product in step 1 first.</Card>
                                ) : (
                                    <Card className="p-5">
                                        <SectionTitle>Loan Details</SectionTitle>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <Field label="Amount Applied (KES)" required error={errors.amountApplied} hint={member ? `Eligible up to ${kes(maxEligible)}` : undefined}>
                                                <Input type="number" min={0} value={form.amountApplied} onChange={(e) => update("amountApplied", e.target.value)} error={errors.amountApplied} />
                                            </Field>
                                            <Field label="Repayment Period (months)" required error={errors.termMonths} hint={`Max ${product.maxTermMonths} months`}>
                                                <Input type="number" min={1} max={product.maxTermMonths} value={form.termMonths} onChange={(e) => update("termMonths", e.target.value)} error={errors.termMonths} />
                                            </Field>
                                            <Field label="Interest Rate (% p.a.)">
                                                <Input value={form.annualRate} readOnly />
                                            </Field>
                                            <Field label="Purpose" required error={errors.purpose}>
                                                <Select value={form.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="Select purpose" error={errors.purpose}>
                                                    {loanPurposes.map((p) => (
                                                        <option key={p}>{p}</option>
                                                    ))}
                                                </Select>
                                            </Field>
                                            <Field label="Loan Sector" required error={errors.sectorCode}>
                                                <Select
                                                    value={form.sectorCode}
                                                    onChange={(e) => setForm((f) => ({ ...f, sectorCode: e.target.value, subSectorCode: "" }))}
                                                    placeholder="Select sector"
                                                    error={errors.sectorCode}
                                                >
                                                    {sectors.filter((s) => s.active).map((s) => (
                                                        <option key={s.id} value={s.code}>
                                                            {s.code} — {s.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </Field>
                                            <Field label="Loan Sub Sector" required error={errors.subSectorCode}>
                                                <Select value={form.subSectorCode} onChange={(e) => update("subSectorCode", e.target.value)} placeholder={form.sectorCode ? "Select sub sector" : "Select a sector first"} disabled={!form.sectorCode} error={errors.subSectorCode}>
                                                    {filteredSubSectors.map((s) => (
                                                        <option key={s.id} value={s.code}>
                                                            {s.code} — {s.name}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </Field>
                                            <Field label="Application Date" required error={errors.receivedDate}>
                                                <Input type="date" max={today()} value={form.receivedDate} onChange={(e) => update("receivedDate", e.target.value)} />
                                            </Field>
                                            <Field label="Reference">
                                                <Input value={form.reference} onChange={(e) => update("reference", e.target.value)} placeholder="Form / file number" />
                                            </Field>
                                            <Field label="Remarks" className="sm:col-span-2 lg:col-span-3">
                                                <Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} />
                                            </Field>
                                        </div>
                                    </Card>
                                )}
                                {schedule.length > 0 && (
                                    <Card className="p-5">
                                        <SectionTitle>Repayment Preview</SectionTitle>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 text-sm">
                                            <div className="bg-indigo-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500">Monthly installment</p>
                                                <p className="font-bold tabular-nums">{kes(summary.installment)}</p>
                                            </div>
                                            <div className="bg-indigo-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500">Total interest</p>
                                                <p className="font-bold tabular-nums">{kes(summary.totalInterest)}</p>
                                            </div>
                                            <div className="bg-indigo-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500">Total repayable</p>
                                                <p className="font-bold tabular-nums">{kes(summary.totalRepayable)}</p>
                                            </div>
                                            <div className="bg-indigo-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500">Method</p>
                                                <p className="font-bold">{form.method === "flat" ? "Flat rate" : "Reducing balance"}</p>
                                            </div>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto">
                                            <ScheduleTable rows={schedule} />
                                        </div>
                                    </Card>
                                )}
                            </>
                        )}

                        {/* STEP 3 — INCOME */}
                        {step === 3 && (
                            <>
                                <Card className="p-5">
                                    <SectionTitle>Monthly Income (from latest payslip)</SectionTitle>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <Field label="Basic Salary / Income" required error={errors.basic}>
                                            <Input type="number" min={0} value={income.basic} onChange={(e) => updateIncome("basic", e.target.value)} error={errors.basic} />
                                        </Field>
                                        <Field label="Total Allowances">
                                            <Input type="number" min={0} value={income.allowance} onChange={(e) => updateIncome("allowance", e.target.value)} />
                                        </Field>
                                        <Field label="Total Deductions" hint="Taxes + existing loan deductions" error={errors.deductions}>
                                            <Input type="number" min={0} value={income.deductions} onChange={(e) => updateIncome("deductions", e.target.value)} />
                                        </Field>
                                        <Field label="Net Take-Home Pay">
                                            <Input value={fmt(netPay)} readOnly />
                                        </Field>
                                    </div>
                                </Card>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Card className={cx("p-5", amount && !sal.isAffordable && "border-rose-200")}>
                                        <p className="font-semibold text-gray-900 mb-2">Salary Appraisal</p>
                                        <InfoRow label="⅓ of net pay" value={kes(sal.oneThirdOfNetPay)} />
                                        <InfoRow label={`× ${term || 0} months`} value={kes(sal.salaryAppraisalAmount)} />
                                        <InfoRow label="Amount applied" value={kes(amount)} />
                                        <p className={cx("mt-2 text-sm font-medium", sal.isAffordable ? "text-emerald-700" : "text-rose-600")}>
                                            {sal.isAffordable ? `✓ Affordable (ability ${sal.abilityPercentage}%)` : `⚠ Short by ${kes(sal.shortfall)}`}
                                        </p>
                                    </Card>
                                    <Card className={cx("p-5", tt.isTwoThirdRuleBroken && "border-rose-200")}>
                                        <p className="font-semibold text-gray-900 mb-2">2/3 Rule</p>
                                        <InfoRow label="Max deductions (⅔ gross)" value={kes(tt.maxAllowedDeduction)} />
                                        <InfoRow label="Current deductions" value={kes(tt.currentTotalDeductions)} />
                                        <InfoRow label="+ New installment" value={kes(tt.proposedMonthlyRepayment)} />
                                        <p className={cx("mt-2 text-sm font-medium", tt.isTwoThirdRuleBroken ? "text-rose-600" : "text-emerald-700")}>
                                            {tt.isTwoThirdRuleBroken ? `⚠ Exceeds limit by ${kes(tt.excessAmount)}` : "✓ Within the 2/3 rule"}
                                        </p>
                                    </Card>
                                </div>
                            </>
                        )}

                        {/* STEP 4 — GUARANTORS */}
                        {step === 4 && (
                            <>
                                <Card className="p-4">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-gray-500">Amount applied</p>
                                            <p className="font-semibold tabular-nums">{kes(amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Applicant free deposits</p>
                                            <p className="font-semibold tabular-nums">{kes(applicantFree)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Total guaranteed</p>
                                            <p className="font-semibold tabular-nums">{kes(totalGuaranteed)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Security coverage</p>
                                            <p className={cx("font-semibold tabular-nums", coverage >= 100 ? "text-emerald-700" : "text-amber-700")}>{amount ? `${coverage.toFixed(0)}%` : "—"}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2 bg-gray-100 rounded overflow-hidden">
                                        <div className={cx("h-full rounded", coverage >= 100 ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${Math.min(100, coverage)}%` }} />
                                    </div>
                                    {errors.guarantors && <p className="text-xs text-rose-600 mt-2">{errors.guarantors}</p>}
                                </Card>

                                {guarantors.map((g, i) => {
                                    const gm = getMember(g.memberId);
                                    return (
                                        <Card key={i} className={cx("p-5", errors[`g_${i}`] && "border-rose-200")}>
                                            <SectionTitle
                                                right={
                                                    <Button
                                                        variant="light"
                                                        size="xs"
                                                        onClick={() => {
                                                            if (product && guarantors.length <= product.minGuarantors)
                                                                return Swal.fire("Not allowed", `Minimum ${product.minGuarantors} guarantor(s) required for this loan`, "warning");
                                                            setGuarantors((prev) => prev.filter((_, idx) => idx !== i));
                                                        }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                                    </Button>
                                                }
                                            >
                                                Guarantor #{i + 1}
                                            </SectionTitle>
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                                                <div className="lg:col-span-2">
                                                    {gm ? (
                                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                            <Avatar src={gm.passportImageId} text={initials(gm)} size="sm" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 truncate">{fullName(gm)}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {gm.memberNumber} · ID {gm.individualIdentityCardNumber} · Free deposits {kes(freeDeposits(gm.id, editLoanId))}
                                                                </p>
                                                            </div>
                                                            <Button variant="ghost" size="xs" onClick={() => setGuarantorModalIndex(i)}>
                                                                Change
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setGuarantorModalIndex(i)}
                                                            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"
                                                        >
                                                            <UserPlus className="w-4 h-4" /> Select guarantor
                                                        </button>
                                                    )}
                                                </div>
                                                <Field label="Amount Guaranteed (KES)" required>
                                                    <div className="flex gap-2">
                                                        <Input type="number" min={0} value={g.amountGuaranteed} onChange={(e) => updateGuarantor(i, "amountGuaranteed", e.target.value)} />
                                                        {gm && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-10"
                                                                title="Guarantee the lesser of free deposits and the unsecured balance"
                                                                onClick={() => {
                                                                    const others = totalGuaranteed - (Number(g.amountGuaranteed) || 0);
                                                                    const needed = Math.max(0, amount - others);
                                                                    updateGuarantor(i, "amountGuaranteed", Math.min(needed, freeDeposits(gm.id, editLoanId)).toFixed(0));
                                                                }}
                                                            >
                                                                Max
                                                            </Button>
                                                        )}
                                                    </div>
                                                </Field>
                                            </div>
                                            {errors[`g_${i}`] && <p className="text-xs text-rose-600 mt-2">{errors[`g_${i}`]}</p>}
                                        </Card>
                                    );
                                })}
                                <Button variant="secondary" onClick={() => setGuarantors((prev) => [...prev, { ...initialGuarantor }])}>
                                    <Plus className="w-4 h-4" /> Add Guarantor
                                </Button>
                            </>
                        )}

                        {/* STEP 5 — REVIEW */}
                        {step === 5 && (
                            <>
                                <Card className="p-5">
                                    <SectionTitle>Review Application</SectionTitle>
                                    <InfoGrid
                                        cols={3}
                                        items={[
                                            ["Applicant", member ? `${fullName(member)} (${member.memberNumber})` : null],
                                            ["Product", product?.name],
                                            ["Amount Applied", kes(amount)],
                                            ["Period", `${term} months`],
                                            ["Interest", `${form.annualRate}% p.a. — ${form.method === "flat" ? "flat rate" : "reducing balance"}`],
                                            ["Monthly Installment", kes(summary.installment)],
                                            ["Total Repayable", kes(summary.totalRepayable)],
                                            ["Purpose", form.purpose],
                                            ["Sector / Sub Sector", [sectors.find((s) => s.code === form.sectorCode)?.name, subSectors.find((s) => s.code === form.subSectorCode)?.name].filter(Boolean).join(" / ")],
                                            ["Application Date", form.receivedDate],
                                            ["Net Take-Home", kes(netPay)],
                                            ["Security Coverage", `${coverage.toFixed(0)}%`],
                                        ]}
                                    />
                                </Card>
                                <Card className="p-5">
                                    <p className="font-semibold text-gray-900 mb-3">Guarantors ({guarantors.length})</p>
                                    {guarantors.map((g, i) => (
                                        <InfoRow key={i} label={fullName(getMember(g.memberId)) || "Not selected"} value={kes(g.amountGuaranteed)} />
                                    ))}
                                    {!guarantors.length && <p className="text-sm text-gray-500">No guarantors</p>}
                                </Card>
                                <Card className="p-5">
                                    <p className="font-semibold text-gray-900 mb-3">Checks</p>
                                    <ul className="text-sm space-y-1.5">
                                        {[
                                            [amount <= maxEligible, `Within deposit eligibility (${kes(maxEligible)})`],
                                            [coverage >= 100, `Fully secured (${coverage.toFixed(0)}%)`],
                                            [sal.isAffordable, `Salary appraisal (ability ${sal.abilityPercentage}%)`],
                                            [!tt.isTwoThirdRuleBroken, "2/3 rule"],
                                            [guarantors.length >= (product?.minGuarantors || 0), `Minimum guarantors (${product?.minGuarantors || 0})`],
                                        ].map(([ok, label]) => (
                                            <li key={label} className={ok ? "text-emerald-700" : "text-amber-700"}>
                                                {ok ? "✓" : "⚠"} {label}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </>
                        )}
                    </section>
                </div>
            </Drawer>

            <MemberSelectModal
                open={memberModal}
                onClose={() => setMemberModal(false)}
                title="Select Applicant"
                onSelect={(m) => {
                    update("memberId", m.id);
                    setMemberModal(false);
                    setErrors((e) => ({ ...e, memberId: "" }));
                }}
            />
            <LoanProductSelectModal open={productModal} onClose={() => setProductModal(false)} onSelect={selectProduct} memberId={form.memberId} />
            <MemberSelectModal
                open={guarantorModalIndex !== null}
                onClose={() => setGuarantorModalIndex(null)}
                title="Select Guarantor"
                mode="guarantor"
                excludeLoanId={editLoanId}
                excludeIds={[
                    ...guarantors.filter((_, i) => i !== guarantorModalIndex).map((g) => g.memberId),
                    ...(product?.allowSelfGuarantee ? [] : [form.memberId]),
                ]}
                onSelect={(m) => {
                    updateGuarantor(guarantorModalIndex, "memberId", m.id);
                    setGuarantorModalIndex(null);
                }}
            />
        </>
    );
}
