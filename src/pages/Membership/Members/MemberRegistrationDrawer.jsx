import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, FolderOpen, Save, Trash2 } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Button, cx } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { Swal, confirmAction, errorAlert, toast } from "@/lib/alert";
import { fmtDateTime, fullName, today } from "@/lib/format";
import { blankCustomer, initialNextOfKin, useMemberRegistration } from "./MemberRegistrationContext";
import MemberFormSteps, { MEMBER_STEPS, validateMember } from "./MemberFormSteps";

const DRAFTS_KEY = "member_registration_drafts";

// ── LocalStorage helpers ──────────────────────────────────────────────────────
const getAllDrafts = () => {
    try {
        return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || [];
    } catch {
        return [];
    }
};

const saveDraftToStorage = (draft) => {
    const drafts = getAllDrafts();
    const index = drafts.findIndex((d) => d.id === draft.id);
    if (index >= 0) drafts[index] = draft;
    else drafts.unshift(draft);
    try {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    } catch {
        errorAlert(new Error("Browser storage is full — remove some drafts or images."));
    }
};

const deleteDraftFromStorage = (id) => localStorage.setItem(DRAFTS_KEY, JSON.stringify(getAllDrafts().filter((d) => d.id !== id)));

export default function MemberRegistrationDrawer({ open, onClose, onRegistered }) {
    const { customer, setCustomer, nextOfKins, setNextOfKins, step, setStep, clearDraft, getSubmitPayload } = useMemberRegistration();
    const { registerMember, postTransaction, idNumberTaken } = useData();

    const [errors, setErrors] = useState({});
    const [allDrafts, setAllDrafts] = useState([]);
    const [activeDraftId, setActiveDraftId] = useState(null);
    const [showDraftPicker, setShowDraftPicker] = useState(false);
    const isLoaded = useRef(false);

    const idTaken = idNumberTaken(customer.individualIdentityCardNumber);
    const hasData = customer.individualFirstName || customer.individualLastName || customer.individualIdentityCardNumber;

    useEffect(() => {
        if (open) setAllDrafts(getAllDrafts());
    }, [open]);

    // Live duplicate-ID feedback, like the API check in the original drawer
    useEffect(() => {
        setErrors((prev) => ({
            ...prev,
            individualIdentityCardNumber: idTaken ? "This ID number is already registered" : prev.individualIdentityCardNumber === "This ID number is already registered" ? "" : prev.individualIdentityCardNumber,
        }));
    }, [idTaken]);

    // Once errors are showing, re-check as the user types so fixed fields clear
    useEffect(() => {
        if (Object.values(errors).some(Boolean)) setErrors(validateMember(step, customer, nextOfKins, idTaken));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer, nextOfKins]);

    // Auto-save the active draft on every change
    useEffect(() => {
        if (!isLoaded.current || !open || !activeDraftId) return;
        saveDraftToStorage({
            id: activeDraftId,
            label: fullName(customer) || `Draft ${new Date().toLocaleString()}`,
            savedAt: new Date().toISOString(),
            step,
            customer,
            nextOfKins,
        });
        setAllDrafts(getAllDrafts());
    }, [customer, nextOfKins, step, open, activeDraftId]);

    // ── Draft actions ─────────────────────────────────────────────────────────
    const handleSaveAsDraft = () => {
        if (!hasData) {
            Swal.fire("Nothing to save", "Fill in at least one field first.", "info");
            return false;
        }
        const id = activeDraftId || `draft_${Date.now()}`;
        saveDraftToStorage({ id, label: fullName(customer) || `Draft ${new Date().toLocaleString()}`, savedAt: new Date().toISOString(), step, customer, nextOfKins });
        setActiveDraftId(id);
        isLoaded.current = true;
        setAllDrafts(getAllDrafts());
        toast("Draft saved");
        return true;
    };

    const handleLoadDraft = (draft) => {
        setCustomer({ ...blankCustomer(), ...draft.customer });
        setNextOfKins(draft.nextOfKins?.length ? draft.nextOfKins : [{ ...initialNextOfKin }]);
        setStep(draft.step || 1);
        setActiveDraftId(draft.id);
        setShowDraftPicker(false);
        setErrors({});
        isLoaded.current = true;
    };

    const handleNewForm = () => {
        clearDraft();
        setActiveDraftId(null);
        setShowDraftPicker(false);
        setErrors({});
        isLoaded.current = false;
    };

    const handleDeleteDraft = async (id, e) => {
        e.stopPropagation();
        if (!(await confirmAction({ title: "Delete this draft?", icon: "warning", confirmText: "Delete", danger: true }))) return;
        deleteDraftFromStorage(id);
        setAllDrafts(getAllDrafts());
        if (activeDraftId === id) handleNewForm();
    };

    // ── Close / navigation ────────────────────────────────────────────────────
    const handleSafeClose = async () => {
        if (hasData && !activeDraftId) {
            const result = await Swal.fire({
                title: "Save before closing?",
                text: "You have unsaved data. Save as draft so you can continue later?",
                icon: "warning",
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonColor: "#4f46e5",
                confirmButtonText: "Save Draft & Close",
                denyButtonText: "Close Without Saving",
                cancelButtonText: "Stay",
            });
            if (result.isConfirmed) {
                if (handleSaveAsDraft()) onClose();
            } else if (result.isDenied) {
                handleNewForm();
                onClose();
            }
            return;
        }
        onClose();
    };

    const goNext = () => {
        const errs = validateMember(step, customer, nextOfKins, idTaken);
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setStep((s) => Math.min(MEMBER_STEPS.length, s + 1));
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const errs = validateMember(0, customer, nextOfKins, idTaken);
        setErrors(errs);
        if (Object.keys(errs).length) {
            const firstStep = Object.keys(errs).some((k) => k.startsWith("nok")) && Object.keys(errs).every((k) => k.startsWith("nok")) ? 3 : 1;
            setStep(firstStep);
            Swal.fire("Check the form", Object.values(errs)[0], "error");
            return;
        }

        const { customer: payload, nextOfKins: kins, opening } = getSubmitPayload();
        try {
            const member = registerMember(payload, kins);
            const date = payload.registrationDate || today();
            const base = { memberId: member.id, type: "Credit", date, mode: "Cash", reference: `REG-${member.memberNumber}` };
            if (opening.registrationFee > 0) postTransaction({ ...base, account: "REGISTRATION", amount: opening.registrationFee, description: "Registration fee" });
            if (opening.initialShares > 0) postTransaction({ ...base, account: "SHARES", amount: opening.initialShares, description: "Opening share capital" });
            if (opening.initialDeposit > 0) postTransaction({ ...base, account: "DEPOSITS", amount: opening.initialDeposit, description: "Opening deposit" });

            if (activeDraftId) deleteDraftFromStorage(activeDraftId);
            setAllDrafts(getAllDrafts());
            handleNewForm();

            await Swal.fire({
                icon: "success",
                title: "Member registered",
                html: `<b>${fullName(member)}</b> is now member <b>${member.memberNumber}</b>.`,
                confirmButtonColor: "#4f46e5",
            });
            onRegistered?.(member);
            onClose();
        } catch (err) {
            errorAlert(err);
        }
    };

    const stepHasError = (i) => {
        const keys = Object.keys(errors).filter((k) => errors[k]);
        if (i === 3) return keys.some((k) => k.startsWith("nok"));
        if (i === 1) return keys.some((k) => !k.startsWith("nok"));
        return false;
    };

    return (
        <Drawer
            open={open}
            onClose={handleSafeClose}
            title="Member Registration"
            subtitle={activeDraftId ? `📝 Editing draft — ${allDrafts.find((d) => d.id === activeDraftId)?.label || "Draft"}` : "Register a new sacco member"}
            width="max-w-6xl"
            actions={
                <>
                    <Button variant="light" size="sm" onClick={handleSaveAsDraft}>
                        <Save className="w-4 h-4" /> <span className="hidden sm:inline">Save Draft</span>
                    </Button>
                    <div className="relative">
                        <Button variant="light" size="sm" onClick={() => setShowDraftPicker((v) => !v)}>
                            <FolderOpen className="w-4 h-4" /> <span className="hidden sm:inline">Drafts</span>
                        </Button>
                        {allDrafts.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                {allDrafts.length}
                            </span>
                        )}
                    </div>
                </>
            }
            footer={
                <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1}>
                        <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                    {step < MEMBER_STEPS.length ? (
                        <Button onClick={goNext}>
                            Next <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button variant="success" onClick={handleSubmit}>
                            <Check className="w-4 h-4" /> Register Member
                        </Button>
                    )}
                </div>
            }
        >
            <AnimatePresence>
                {showDraftPicker && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="mb-3 bg-white rounded-xl p-3 shadow-lg border border-indigo-100"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-indigo-700 font-semibold text-sm">Saved Drafts</span>
                            <button type="button" onClick={handleNewForm} className="text-xs text-indigo-600 hover:underline cursor-pointer">
                                + New Form
                            </button>
                        </div>
                        {allDrafts.length === 0 ? (
                            <p className="text-gray-400 text-xs text-center py-2">No drafts saved yet</p>
                        ) : (
                            <ul className="space-y-2 max-h-52 overflow-y-auto">
                                {allDrafts.map((draft) => (
                                    <li
                                        key={draft.id}
                                        onClick={() => handleLoadDraft(draft)}
                                        className={cx(
                                            "flex justify-between items-center p-2 rounded-lg cursor-pointer text-sm hover:bg-indigo-50",
                                            activeDraftId === draft.id ? "bg-indigo-100 border border-indigo-300" : "bg-gray-50"
                                        )}
                                    >
                                        <div>
                                            <p className="font-medium text-gray-700">{draft.label}</p>
                                            <p className="text-gray-400 text-[11px]">
                                                Step {draft.step || 1} of {MEMBER_STEPS.length} · Saved {fmtDateTime(draft.savedAt)}
                                            </p>
                                        </div>
                                        <button type="button" onClick={(e) => handleDeleteDraft(draft.id, e)} className="text-rose-400 hover:text-rose-600 p-1 cursor-pointer" aria-label="Delete draft">
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
                <aside className="md:col-span-3 bg-gray-200/70 p-3 rounded-xl h-fit">
                    {MEMBER_STEPS.map((label, index) => (
                        <button
                            type="button"
                            key={label}
                            onClick={() => setStep(index + 1)}
                            className={cx(
                                "w-full text-left p-3 mb-2 rounded-lg border text-sm font-medium flex items-center gap-3 cursor-pointer transition",
                                step === index + 1 ? "bg-indigo-700 border-indigo-500 text-white shadow" : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                            )}
                        >
                            <span
                                className={cx(
                                    "w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0",
                                    step === index + 1 ? "bg-white text-indigo-700" : stepHasError(index + 1) ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"
                                )}
                            >
                                {index + 1}
                            </span>
                            {label}
                        </button>
                    ))}
                    {allDrafts.length > 0 && (
                        <div className="mt-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2 px-1">SAVED DRAFTS</p>
                            {allDrafts.slice(0, 4).map((d) => (
                                <button
                                    type="button"
                                    key={d.id}
                                    onClick={() => handleLoadDraft(d)}
                                    className={cx(
                                        "w-full text-left text-xs p-2 mb-1 rounded-lg truncate cursor-pointer",
                                        activeDraftId === d.id ? "bg-indigo-100 text-indigo-800" : "bg-white hover:bg-indigo-50 text-gray-600"
                                    )}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    )}
                </aside>
                <section className="md:col-span-9">
                    <MemberFormSteps
                        step={step}
                        customer={customer}
                        setCustomer={setCustomer}
                        nextOfKins={nextOfKins}
                        setNextOfKins={setNextOfKins}
                        errors={errors}
                        mode="create"
                    />
                </section>
            </div>
        </Drawer>
    );
}
