import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button, Card, Field, Input, Select, Textarea, SectionTitle } from "@/components/ui";
import {
    banks, branches, genders, idTypes, maritalStatuses, memberTypes, nationalities, relationships, salutations, termsOfService,
} from "@/lib/selectData";
import { ageFrom, compressImage, patterns, today } from "@/lib/format";
import { errorAlert } from "@/lib/alert";
import { initialNextOfKin } from "./MemberRegistrationContext";

export const MEMBER_STEPS = ["Personal Details", "Employment & Bank", "Next of Kin", "Uploads & Opening"];

/** Returns { field: message } for the given step (0 = all steps) */
export function validateMember(step, customer, nextOfKins, idTaken) {
    const e = {};
    const all = step === 0;
    if (all || step === 1) {
        if (!customer.individualLastName?.trim()) e.individualLastName = "Surname is required";
        if (!customer.individualFirstName?.trim()) e.individualFirstName = "Other name is required";
        if (!customer.individualIdentityCardNumber?.trim()) e.individualIdentityCardNumber = "ID / Passport number is required";
        else if (customer.individualIdentityCardNumber.trim().length < 5) e.individualIdentityCardNumber = "Enter a valid ID number";
        else if (idTaken) e.individualIdentityCardNumber = "This ID number is already registered";
        if (!customer.individualGender) e.individualGender = "Gender is required";
        if (!customer.addressMobileLine) e.addressMobileLine = "Mobile number is required";
        else if (!patterns.mobile.test(customer.addressMobileLine)) e.addressMobileLine = "Phone must start with +254 and be 12 digits";
        if (customer.addressEmail && !patterns.email.test(customer.addressEmail)) e.addressEmail = "Enter a valid email address";
        if (customer.personalIdentificationNumber && !patterns.kraPin.test(customer.personalIdentificationNumber))
            e.personalIdentificationNumber = "KRA PIN must be in format A123456789B";
        if (customer.individualBirthDate) {
            const age = ageFrom(customer.individualBirthDate);
            if (age < 18) e.individualBirthDate = "Member must be at least 18 years old";
        }
        if (!customer.branchId) e.branchId = "Branch is required";
    }
    if (all || step === 3) {
        nextOfKins.forEach((k, i) => {
            if (!k.firstName?.trim() || !k.lastName?.trim()) e[`nok_${i}_name`] = "First and last name are required";
            if (!k.relationship) e[`nok_${i}_relationship`] = "Relationship is required";
            if (k.addressMobileLine && !patterns.mobile.test(k.addressMobileLine)) e[`nok_${i}_mobile`] = "Phone must start with +254 and be 12 digits";
        });
        const total = nextOfKins.reduce((s, k) => s + Number(k.nominatedPercentage || 0), 0);
        if (total !== 100) e.nokTotal = `Nominated percentages must add up to 100% (currently ${total}%)`;
    }
    return e;
}

export default function MemberFormSteps({ step, customer, setCustomer, nextOfKins, setNextOfKins, errors, mode = "create" }) {
    const update = (key, value) => setCustomer((prev) => ({ ...prev, [key]: value }));
    const updateNok = (index, key, value) =>
        setNextOfKins((prev) => prev.map((k, i) => (i === index ? { ...k, [key]: value } : k)));
    const totalNok = nextOfKins.reduce((s, k) => s + Number(k.nominatedPercentage || 0), 0);

    const addNok = () => {
        if (totalNok >= 100 && nextOfKins.length >= 1) {
            // Split the allocation so the new kin gets a share without going over 100
            const last = nextOfKins[nextOfKins.length - 1];
            const half = Math.floor(Number(last.nominatedPercentage || 0) / 2);
            setNextOfKins((prev) => [
                ...prev.slice(0, -1),
                { ...last, nominatedPercentage: Number(last.nominatedPercentage) - half },
                { ...initialNextOfKin, nominatedPercentage: half },
            ]);
            return;
        }
        setNextOfKins((prev) => [...prev, { ...initialNextOfKin, nominatedPercentage: 100 - totalNok }]);
    };

    const handleImage = async (e, key) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return errorAlert(new Error("Please choose an image file."));
        try {
            update(key, await compressImage(file));
        } catch (err) {
            errorAlert(err);
        }
        e.target.value = "";
    };

    const text = (label, key, props = {}) => (
        <Field label={label} required={props.required} error={errors[key]} hint={props.hint}>
            <Input
                value={customer[key] ?? ""}
                onChange={(e) => update(key, props.upper ? e.target.value.toUpperCase() : e.target.value)}
                error={errors[key]}
                type={props.type || "text"}
                placeholder={props.placeholder}
                max={props.max}
            />
        </Field>
    );

    const select = (label, key, options, props = {}) => (
        <Field label={label} required={props.required} error={errors[key]}>
            <Select value={customer[key] ?? ""} onChange={(e) => update(key, e.target.value)} placeholder={`Select ${label.toLowerCase()}`} error={errors[key]}>
                {options.map((o) =>
                    typeof o === "string" ? (
                        <option key={o} value={o}>
                            {o}
                        </option>
                    ) : (
                        <option key={o.value ?? o.id} value={o.value ?? o.id}>
                            {o.label ?? o.name}
                        </option>
                    )
                )}
            </Select>
        </Field>
    );

    if (step === 1)
        return (
            <Card className="p-5">
                <SectionTitle>Personal Details</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {select("Member Type", "type", memberTypes)}
                    {select("Salutation", "individualSalutation", salutations)}
                    {text("Surname", "individualLastName", { required: true })}
                    {text("Other Names", "individualFirstName", { required: true })}
                    {select("ID Type", "individualIdentityCardType", idTypes)}
                    {text("ID / Passport Number", "individualIdentityCardNumber", { required: true })}
                    {text("Date of Birth", "individualBirthDate", { type: "date", max: today() })}
                    {select("Gender", "individualGender", genders, { required: true })}
                    {select("Marital Status", "individualMaritalStatus", maritalStatuses)}
                    {text("Mobile", "addressMobileLine", { required: true, placeholder: "+2547XXXXXXXX" })}
                    {text("Landline", "addressLandLine")}
                    {text("Email", "addressEmail", { type: "email", placeholder: "name@example.com" })}
                    {text("KRA PIN (Optional)", "personalIdentificationNumber", { upper: true, placeholder: "A123456789B" })}
                    <Field label="Nationality">
                        <Input list="nationality-list" value={customer.individualNationality} onChange={(e) => update("individualNationality", e.target.value)} />
                        <datalist id="nationality-list">
                            {nationalities.map((n) => (
                                <option key={n} value={n} />
                            ))}
                        </datalist>
                    </Field>
                    {text("Place of Birth", "addressAddressLine2")}
                    {text("City / Town", "addressCity")}
                    {text("Postal Address", "addressAddressLine1", { placeholder: "P.O. Box" })}
                    {text("Postal Code", "addressPostalCode")}
                    {select("Branch", "branchId", branches, { required: true })}
                    {text("Registration Date", "registrationDate", { type: "date", max: today() })}
                </div>
            </Card>
        );

    if (step === 2)
        return (
            <Card className="p-5">
                <SectionTitle>Employment Details</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {text("Employer", "employerName")}
                    {text("Payroll Number", "individualPayrollNumbers")}
                    {text("Designation", "individualEmploymentDesignation")}
                    {select("Terms of Service", "individualEmploymentTermsOfService", termsOfService)}
                    {text("Employment Date", "individualEmploymentDate", { type: "date", max: today() })}
                    {text("Recruited By", "recruitedBy", { placeholder: "Member no. or staff name" })}
                </div>
                <SectionTitle>Bank Details</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Bank Name">
                        <Input list="bank-list" value={customer.bankName} onChange={(e) => update("bankName", e.target.value)} placeholder="Search bank..." />
                        <datalist id="bank-list">
                            {banks.map((b) => (
                                <option key={b} value={b} />
                            ))}
                        </datalist>
                    </Field>
                    {text("Bank Branch", "branchName")}
                    {text("Bank Account Number", "reference1")}
                </div>
            </Card>
        );

    if (step === 3)
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-sm text-gray-600">
                            Total nominated:{" "}
                            <span className={totalNok === 100 ? "font-semibold text-emerald-700" : "font-semibold text-rose-600"}>{totalNok}%</span>
                        </p>
                        {errors.nokTotal && <p className="text-xs text-rose-600">{errors.nokTotal}</p>}
                    </div>
                    <Button variant="secondary" size="sm" onClick={addNok}>
                        <Plus className="w-4 h-4" /> Add Next of Kin
                    </Button>
                </div>
                {nextOfKins.map((k, i) => (
                    <Card key={i} className="p-5">
                        <SectionTitle
                            right={
                                nextOfKins.length > 1 && (
                                    <Button variant="light" size="xs" onClick={() => setNextOfKins((prev) => prev.filter((_, idx) => idx !== i))}>
                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                    </Button>
                                )
                            }
                        >
                            Next of Kin #{i + 1}
                        </SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Field label="First Name" required error={errors[`nok_${i}_name`]}>
                                <Input value={k.firstName} onChange={(e) => updateNok(i, "firstName", e.target.value)} />
                            </Field>
                            <Field label="Last Name" required>
                                <Input value={k.lastName} onChange={(e) => updateNok(i, "lastName", e.target.value)} />
                            </Field>
                            <Field label="Gender">
                                <Select value={k.gender} onChange={(e) => updateNok(i, "gender", e.target.value)} placeholder="Select gender">
                                    {genders.map((g) => (
                                        <option key={g}>{g}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Relationship" required error={errors[`nok_${i}_relationship`]}>
                                <Select value={k.relationship} onChange={(e) => updateNok(i, "relationship", e.target.value)} placeholder="Select relationship">
                                    {relationships.map((r) => (
                                        <option key={r}>{r}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="ID / Passport Number">
                                <Input value={k.identityCardNumber} onChange={(e) => updateNok(i, "identityCardNumber", e.target.value)} />
                            </Field>
                            <Field label="Mobile Number" error={errors[`nok_${i}_mobile`]}>
                                <Input value={k.addressMobileLine} onChange={(e) => updateNok(i, "addressMobileLine", e.target.value)} placeholder="+2547XXXXXXXX" />
                            </Field>
                            <Field label="Email">
                                <Input value={k.addressEmail} onChange={(e) => updateNok(i, "addressEmail", e.target.value)} />
                            </Field>
                            <Field label="Address">
                                <Input value={k.addressAddressLine1} onChange={(e) => updateNok(i, "addressAddressLine1", e.target.value)} />
                            </Field>
                            <Field label="Nominated Percentage (%)" required>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={k.nominatedPercentage}
                                    onChange={(e) => updateNok(i, "nominatedPercentage", Math.min(100, Math.max(0, Number(e.target.value))))}
                                />
                            </Field>
                        </div>
                    </Card>
                ))}
            </div>
        );

    const uploads = [
        ["ID Front Image", "identityCardFrontSideImageId"],
        ["ID Back Image", "identityCardBackSideImageId"],
        ["Passport Photo", "passportImageId"],
        ["Signature", "signatureImageId"],
    ];

    return (
        <div className="space-y-4">
            <Card className="p-5">
                <SectionTitle>Documents</SectionTitle>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {uploads.map(([label, key]) => (
                        <div key={key}>
                            <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
                            {customer[key] ? (
                                <div className="relative group">
                                    <img src={customer[key]} alt={label} className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                                    <button
                                        type="button"
                                        onClick={() => update(key, null)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-white shadow text-rose-600 cursor-pointer"
                                        aria-label={`Remove ${label}`}
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer text-gray-500 text-xs gap-1">
                                    <Upload className="w-5 h-5" />
                                    Click to upload
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e, key)} />
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {mode === "create" && (
                <Card className="p-5">
                    <SectionTitle>Opening Contributions (optional)</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Registration Fee (KES)">
                            <Input type="number" min={0} value={customer.registrationFee} onChange={(e) => update("registrationFee", e.target.value)} />
                        </Field>
                        <Field label="Share Capital (KES)" hint="Non-withdrawable ownership shares">
                            <Input type="number" min={0} value={customer.initialShares} onChange={(e) => update("initialShares", e.target.value)} />
                        </Field>
                        <Field label="Initial Deposit (KES)" hint="Deposits determine loan eligibility">
                            <Input type="number" min={0} value={customer.initialDeposit} onChange={(e) => update("initialDeposit", e.target.value)} />
                        </Field>
                    </div>
                </Card>
            )}

            <Card className="p-5">
                <Field label="Remarks">
                    <Textarea value={customer.remarks} onChange={(e) => update("remarks", e.target.value)} />
                </Field>
            </Card>
        </div>
    );
}
