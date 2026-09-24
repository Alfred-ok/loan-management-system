import { createContext, useContext, useEffect, useRef, useState } from "react";
import { today, uid } from "@/lib/format";

const DRAFTS_KEY = "loan_application_drafts";

export const initialForm = () => ({
    memberId: "",
    productId: "",
    productName: "",
    annualRate: 0,
    method: "reducing",
    termMonths: "",
    amountApplied: "",
    purpose: "",
    sectorCode: "",
    subSectorCode: "",
    receivedDate: today(),
    reference: "",
    remarks: "",
    income: { basic: "", allowance: "", deductions: "" },
});

export const initialGuarantor = { memberId: "", amountGuaranteed: "", remarks: "" };

const LoanApplicationContext = createContext(null);

export function LoanApplicationProvider({ children }) {
    const [form, setForm] = useState(initialForm);
    const [guarantors, setGuarantors] = useState([]);
    const [step, setStep] = useState(1);
    const [drafts, setDrafts] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem(DRAFTS_KEY));
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [activeDraftId, setActiveDraftId] = useState(null);
    const isRestoring = useRef(false);

    useEffect(() => {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    }, [drafts]);

    // Auto-save every change back into the active draft
    useEffect(() => {
        if (!activeDraftId || isRestoring.current) return;
        setDrafts((prev) => prev.map((d) => (d.id === activeDraftId ? { ...d, form, guarantors, step, lastSaved: new Date().toISOString() } : d)));
    }, [form, guarantors, step, activeDraftId]);

    const hasDraft = Boolean(form.memberId || form.productId || form.amountApplied);

    const saveNewDraft = (label) => {
        const id = uid("ldraft_");
        const ts = new Date().toISOString();
        setDrafts((prev) => [{ id, label: label || `Draft ${prev.length + 1}`, createdAt: ts, lastSaved: ts, form, guarantors, step }, ...prev]);
        setActiveDraftId(id);
    };

    const restore = (f, g, s, id) => {
        isRestoring.current = true;
        setForm(f);
        setGuarantors(g);
        setStep(s);
        setActiveDraftId(id);
        setTimeout(() => {
            isRestoring.current = false;
        }, 0);
    };

    const loadDraft = (id) => {
        const d = drafts.find((x) => x.id === id);
        if (d) restore({ ...initialForm(), ...d.form }, d.guarantors || [], d.step || 1, id);
    };

    const deleteDraft = (id) => {
        setDrafts((prev) => prev.filter((d) => d.id !== id));
        if (activeDraftId === id) setActiveDraftId(null);
    };

    const newForm = (preset = {}) => restore({ ...initialForm(), ...preset }, [], 1, null);

    /** Load an existing registered loan for editing (not tied to a local draft) */
    const loadLoan = (loan) =>
        restore(
            { ...initialForm(), ...loan, income: { ...initialForm().income, ...loan.income } },
            (loan.guarantors || []).map((g) => ({ ...g })),
            1,
            null
        );

    return (
        <LoanApplicationContext.Provider
            value={{
                form, setForm, guarantors, setGuarantors, step, setStep, hasDraft,
                drafts, activeDraftId, activeDraft: drafts.find((d) => d.id === activeDraftId) || null,
                saveNewDraft, loadDraft, deleteDraft, newForm, loadLoan,
            }}
        >
            {children}
        </LoanApplicationContext.Provider>
    );
}

export function useLoanApplication() {
    const ctx = useContext(LoanApplicationContext);
    if (!ctx) throw new Error("useLoanApplication must be used inside LoanApplicationProvider");
    return ctx;
}
