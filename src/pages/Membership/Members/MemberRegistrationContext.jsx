import { createContext, useContext, useState } from "react";
import { today } from "@/lib/format";

export const initialCustomerState = {
    stationId: "",
    companyId: "",
    branchId: "",
    type: "1",
    serialNumber: 0,
    personalIdentificationNumber: "",
    individualType: 1,
    individualFirstName: "",
    individualLastName: "",
    individualIdentityCardType: 1,
    individualIdentityCardNumber: "",
    individualPayrollNumbers: "",
    individualSalutation: 1,
    individualGender: "",
    individualMaritalStatus: "",
    individualNationality: "Kenya",
    individualBirthDate: "",
    individualEmploymentDesignation: "",
    individualEmploymentTermsOfService: "",
    individualEmploymentDate: "",
    employerName: "",
    addressAddressLine1: "",
    addressAddressLine2: "",
    addressStreet: "",
    addressPostalCode: "",
    addressCity: "",
    addressEmail: "",
    addressLandLine: "",
    addressMobileLine: "",
    passportImageId: null,
    signatureImageId: null,
    identityCardFrontSideImageId: null,
    identityCardBackSideImageId: null,
    remarks: "",
    recruitedBy: "",
    recordStatus: 1,
    createdBy: "SYSTEM",
    createdDate: "",
    reference1: "",
    bankName: "",
    branchName: "",
    registrationDate: "",
    initialShares: "",
    initialDeposit: "",
    registrationFee: 1000,
};

export const initialNextOfKin = {
    salutation: "",
    gender: "",
    relationship: "",
    firstName: "",
    lastName: "",
    identityCardType: 1,
    identityCardNumber: "",
    addressAddressLine1: "",
    addressStreet: "",
    addressPostalCode: "",
    addressCity: "",
    addressEmail: "",
    addressMobileLine: "",
    nominatedPercentage: 100,
    remarks: "",
    createdBy: "SYSTEM",
};

export const blankCustomer = () => ({ ...initialCustomerState, createdDate: today(), registrationDate: today() });

const MemberRegistrationContext = createContext(null);

export function MemberRegistrationProvider({ children }) {
    const [customer, setCustomer] = useState(blankCustomer);
    const [nextOfKins, setNextOfKins] = useState([{ ...initialNextOfKin }]);
    const [step, setStep] = useState(1);

    const hasDraft = Boolean(customer.individualFirstName || customer.individualLastName || customer.individualIdentityCardNumber);

    const clearDraft = () => {
        setCustomer(blankCustomer());
        setNextOfKins([{ ...initialNextOfKin }]);
        setStep(1);
    };

    // Registration-only money fields are not part of the member record
    const getSubmitPayload = () => {
        const { initialShares, initialDeposit, registrationFee, ...rest } = customer;
        return {
            customer: { ...rest, companyId: rest.companyId || rest.stationId },
            nextOfKins,
            opening: { initialShares: Number(initialShares) || 0, initialDeposit: Number(initialDeposit) || 0, registrationFee: Number(registrationFee) || 0 },
        };
    };

    return (
        <MemberRegistrationContext.Provider
            value={{ customer, setCustomer, nextOfKins, setNextOfKins, step, setStep, hasDraft, clearDraft, initialNextOfKin, getSubmitPayload }}
        >
            {children}
        </MemberRegistrationContext.Provider>
    );
}

export function useMemberRegistration() {
    const ctx = useContext(MemberRegistrationContext);
    if (!ctx) throw new Error("useMemberRegistration must be used inside MemberRegistrationProvider");
    return ctx;
}
