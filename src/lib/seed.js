import { addMonths, today } from "./format";
import { generateSchedule } from "./loanMath";

// Demo data so every screen has something to show on first run.
// Dates are relative to "today" so arrears and due dates stay meaningful.

const t = today();
const monthsAgo = (m) => addMonths(t, -m);
const ts = (date) => `${date}T09:00:00.000Z`;

export const seedProducts = [
    {
        id: "prd_normal", code: "LP001", name: "Normal Development Loan", category: "Normal", section: "BOSA",
        description: "Long-term loan secured by deposits and guarantors.",
        annualRate: 12, method: "reducing", minAmount: 10000, maxAmount: 3000000, maxTermMonths: 48,
        minGuarantors: 2, maxGuarantees: 4, multiplier: 3, allowSelfGuarantee: false,
        processingFeePct: 1, insurancePct: 0.5, active: true,
    },
    {
        id: "prd_emergency", code: "LP002", name: "Emergency Loan", category: "Emergency", section: "BOSA",
        description: "Quick access loan for emergencies.",
        annualRate: 15, method: "flat", minAmount: 5000, maxAmount: 200000, maxTermMonths: 12,
        minGuarantors: 1, maxGuarantees: 4, multiplier: 2, allowSelfGuarantee: true,
        processingFeePct: 2, insurancePct: 0, active: true,
    },
    {
        id: "prd_school", code: "LP003", name: "School Fees Loan", category: "School Fees", section: "BOSA",
        description: "Payable within the school year.",
        annualRate: 10, method: "reducing", minAmount: 5000, maxAmount: 500000, maxTermMonths: 12,
        minGuarantors: 1, maxGuarantees: 4, multiplier: 3, allowSelfGuarantee: true,
        processingFeePct: 1, insurancePct: 0, active: true,
    },
    {
        id: "prd_asset", code: "LP004", name: "Asset Finance Loan", category: "Asset Finance", section: "FOSA",
        description: "Finance for vehicles, equipment and household assets.",
        annualRate: 14, method: "reducing", minAmount: 50000, maxAmount: 5000000, maxTermMonths: 60,
        minGuarantors: 2, maxGuarantees: 3, multiplier: 4, allowSelfGuarantee: false,
        processingFeePct: 1.5, insurancePct: 1, active: true,
    },
];

export const seedSectors = [
    { id: "sec_01", code: "01", name: "Agriculture", active: true },
    { id: "sec_02", code: "02", name: "Education", active: true },
    { id: "sec_03", code: "03", name: "Trade & Commerce", active: true },
    { id: "sec_04", code: "04", name: "Real Estate & Housing", active: true },
    { id: "sec_05", code: "05", name: "Personal & Household", active: true },
    { id: "sec_06", code: "06", name: "Transport", active: true },
];

export const seedSubSectors = [
    { id: "sub_0101", code: "0101", name: "Crop farming", sectorCode: "01", active: true },
    { id: "sub_0102", code: "0102", name: "Dairy & livestock", sectorCode: "01", active: true },
    { id: "sub_0201", code: "0201", name: "Primary & secondary fees", sectorCode: "02", active: true },
    { id: "sub_0202", code: "0202", name: "University & college fees", sectorCode: "02", active: true },
    { id: "sub_0301", code: "0301", name: "Retail shop", sectorCode: "03", active: true },
    { id: "sub_0302", code: "0302", name: "Wholesale", sectorCode: "03", active: true },
    { id: "sub_0401", code: "0401", name: "Home construction", sectorCode: "04", active: true },
    { id: "sub_0402", code: "0402", name: "Land purchase", sectorCode: "04", active: true },
    { id: "sub_0501", code: "0501", name: "Medical", sectorCode: "05", active: true },
    { id: "sub_0502", code: "0502", name: "Household goods", sectorCode: "05", active: true },
    { id: "sub_0601", code: "0601", name: "Boda boda / motorcycle", sectorCode: "06", active: true },
    { id: "sub_0602", code: "0602", name: "Matatu / PSV", sectorCode: "06", active: true },
];

const baseMember = {
    stationId: "", companyId: "", type: "1", serialNumber: 0, individualType: 1,
    individualIdentityCardType: 1, individualSalutation: 1, individualNationality: "Kenya",
    addressAddressLine1: "", addressAddressLine2: "", addressStreet: "", addressLandLine: "",
    passportImageId: null, signatureImageId: null, identityCardFrontSideImageId: null,
    identityCardBackSideImageId: null, remarks: "", recruitedBy: "SYSTEM", recordStatus: 1,
    createdBy: "admin", reference1: "", branchName: "",
};

const m = (n, first, last, gender, id, phone, city, designation, joinedMonthsAgo, extra = {}) => ({
    ...baseMember,
    id: `mem_${n}`,
    memberNumber: `M${String(n).padStart(5, "0")}`,
    status: "Active",
    individualFirstName: first,
    individualLastName: last,
    individualGender: gender,
    individualSalutation: gender === "Male" ? 1 : 2,
    individualIdentityCardNumber: id,
    personalIdentificationNumber: `A${id.padStart(9, "0").slice(0, 9)}${String.fromCharCode(65 + n)}`,
    individualPayrollNumbers: `PR${1000 + n}`,
    individualMaritalStatus: n % 3 === 0 ? "Single" : "Married",
    individualBirthDate: `19${80 + n}-0${(n % 9) + 1}-15`,
    individualEmploymentDesignation: designation,
    individualEmploymentTermsOfService: "Permanent",
    individualEmploymentDate: `20${10 + n}-01-01`,
    addressMobileLine: phone,
    addressEmail: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    addressCity: city,
    addressPostalCode: "00100",
    branchId: "BR01",
    bankName: "EQUITY",
    reference1: `01802${id}`,
    registrationDate: monthsAgo(joinedMonthsAgo),
    createdDate: monthsAgo(joinedMonthsAgo),
    createdAt: ts(monthsAgo(joinedMonthsAgo)),
    nextOfKins: [
        {
            salutation: "", gender: gender === "Male" ? "Female" : "Male", relationship: "Spouse",
            firstName: "Jane", lastName: last, identityCardType: 1, identityCardNumber: "",
            addressAddressLine1: "", addressStreet: "", addressPostalCode: "", addressCity: city,
            addressEmail: "", addressMobileLine: "", nominatedPercentage: 100, remarks: "", createdBy: "admin",
        },
    ],
    ...extra,
});

export const seedMembers = [
    m(1, "James", "Mwangi", "Male", "23456781", "+254712345601", "Nairobi", "Accountant", 30),
    m(2, "Grace", "Wanjiku", "Female", "24567892", "+254712345602", "Nairobi", "Teacher", 28),
    m(3, "Peter", "Otieno", "Male", "25678903", "+254712345603", "Kisumu", "Engineer", 26),
    m(4, "Mary", "Achieng", "Female", "26789014", "+254712345604", "Kisumu", "Nurse", 24),
    m(5, "John", "Kamau", "Male", "27890125", "+254712345605", "Nakuru", "Driver", 20),
    m(6, "Faith", "Njeri", "Female", "28901236", "+254712345606", "Mombasa", "Clerk", 18),
    m(7, "David", "Kiprop", "Male", "29012347", "+254712345607", "Eldoret", "Farmer", 14),
    m(8, "Lucy", "Mutua", "Female", "30123458", "+254712345608", "Nairobi", "Pharmacist", 10),
];

// Monthly deposit contributions + a one-off share capital purchase per member
const contributions = [
    [1, 8000, 20000], [2, 6000, 15000], [3, 10000, 25000], [4, 5000, 10000],
    [5, 3000, 10000], [6, 4000, 10000], [7, 5000, 20000], [8, 7000, 15000],
];

export const seedTransactions = contributions.flatMap(([n, monthly, shares]) => {
    const member = seedMembers[n - 1];
    const months = Math.min(12, Math.round((new Date(t) - new Date(member.registrationDate)) / 2.6e9));
    const txns = [
        {
            id: `txn_${n}_reg`, memberId: member.id, account: "REGISTRATION", type: "Credit", amount: 1000,
            date: member.registrationDate, mode: "M-Pesa", reference: `REG${n}`, description: "Registration fee", by: "admin",
        },
        {
            id: `txn_${n}_sh`, memberId: member.id, account: "SHARES", type: "Credit", amount: shares,
            date: member.registrationDate, mode: "M-Pesa", reference: `SH${n}`, description: "Share capital", by: "admin",
        },
    ];
    for (let i = months; i >= 1; i--) {
        txns.push({
            id: `txn_${n}_d${i}`, memberId: member.id, account: "DEPOSITS", type: "Credit", amount: monthly * 3,
            date: monthsAgo(i), mode: "Payroll Check-off", reference: `CHK${n}${i}`, description: "Monthly deposit contribution", by: "admin",
        });
    }
    return txns;
});

const product = (id) => seedProducts.find((p) => p.id === id);

function loan(n, { memberId, productId, amount, term, status, receivedMonthsAgo, purpose, sector, sub, guarantors, disbursedMonthsAgo, paidInstallments = 0 }) {
    const p = product(productId);
    const receivedDate = monthsAgo(receivedMonthsAgo);
    const base = {
        id: `loan_${n}`,
        loanNumber: `LN${String(n).padStart(5, "0")}`,
        memberId,
        productId,
        productName: p.name,
        annualRate: p.annualRate,
        method: p.method,
        termMonths: term,
        amountApplied: amount,
        purpose,
        sectorCode: sector,
        subSectorCode: sub,
        receivedDate,
        reference: "",
        remarks: "",
        income: { basic: 85000, allowance: 20000, deductions: 30000 },
        guarantors: guarantors.map(([gid, amt]) => ({ memberId: gid, amountGuaranteed: amt, remarks: "" })),
        status,
        createdAt: ts(receivedDate),
        createdBy: "officer",
        history: [{ date: ts(receivedDate), action: "Application registered", by: "officer", note: "" }],
        repayments: [],
    };

    if (["Appraised", "Approved", "Disbursed", "Closed"].includes(status)) {
        base.appraisal = { option: "1", amount, termMonths: term, remarks: "Member qualifies", date: receivedDate, by: "officer", abilityPercentage: 140, twoThirdOk: true };
        base.history.push({ date: ts(receivedDate), action: "Appraised — recommended for approval", by: "officer", note: "" });
    }
    if (["Approved", "Disbursed", "Closed"].includes(status)) {
        base.approval = { amount, remarks: "Approved by credit committee", date: receivedDate, by: "manager" };
        base.history.push({ date: ts(receivedDate), action: "Approved", by: "manager", note: "" });
    }
    if (status === "Rejected") {
        base.rejection = { reason: "Insufficient deposits to support the amount applied", date: receivedDate, by: "manager", stage: "Appraised" };
        base.history.push({ date: ts(receivedDate), action: "Rejected", by: "manager", note: base.rejection.reason });
    }
    if (["Disbursed", "Closed"].includes(status)) {
        const dDate = monthsAgo(disbursedMonthsAgo);
        const processingFee = (amount * p.processingFeePct) / 100;
        const insuranceFee = (amount * p.insurancePct) / 100;
        base.disbursedAmount = amount;
        base.disbursement = {
            date: dDate, mode: "Bank Transfer", reference: `DSB${n}`, processingFee, insuranceFee,
            netAmount: amount - processingFee - insuranceFee, by: "cashier",
        };
        base.schedule = generateSchedule({ principal: amount, annualRate: p.annualRate, termMonths: term, method: p.method, startDate: dDate });
        base.repayments = base.schedule.slice(0, paidInstallments).map((row, i) => ({
            id: `rep_${n}_${i}`, date: row.dueDate, amount: row.installment, mode: "Payroll Check-off",
            reference: `CHK-L${n}-${i + 1}`, by: "cashier",
        }));
        base.history.push({ date: ts(dDate), action: "Disbursed", by: "cashier", note: `Net ${base.disbursement.netAmount.toFixed(2)}` });
    }
    return base;
}

export const seedLoans = [
    loan(1, { memberId: "mem_1", productId: "prd_normal", amount: 300000, term: 24, status: "Disbursed", receivedMonthsAgo: 7, disbursedMonthsAgo: 6, paidInstallments: 6, purpose: "Home improvement", sector: "04", sub: "0401", guarantors: [["mem_2", 150000], ["mem_3", 150000]] }),
    loan(2, { memberId: "mem_3", productId: "prd_asset", amount: 500000, term: 36, status: "Disbursed", receivedMonthsAgo: 5, disbursedMonthsAgo: 5, paidInstallments: 2, purpose: "Asset purchase", sector: "06", sub: "0602", guarantors: [["mem_1", 150000], ["mem_8", 150000]] }),
    loan(3, { memberId: "mem_2", productId: "prd_school", amount: 60000, term: 6, status: "Closed", receivedMonthsAgo: 9, disbursedMonthsAgo: 8, paidInstallments: 6, purpose: "School fees", sector: "02", sub: "0201", guarantors: [["mem_4", 60000]] }),
    loan(4, { memberId: "mem_4", productId: "prd_emergency", amount: 50000, term: 6, status: "Approved", receivedMonthsAgo: 0, purpose: "Medical", sector: "05", sub: "0501", guarantors: [["mem_6", 50000]] }),
    loan(5, { memberId: "mem_7", productId: "prd_normal", amount: 250000, term: 24, status: "Appraised", receivedMonthsAgo: 0, purpose: "Agriculture", sector: "01", sub: "0102", guarantors: [["mem_5", 80000], ["mem_1", 100000]] }),
    loan(6, { memberId: "mem_8", productId: "prd_school", amount: 80000, term: 10, status: "Registered", receivedMonthsAgo: 0, purpose: "School fees", sector: "02", sub: "0202", guarantors: [["mem_2", 80000]] }),
    loan(7, { memberId: "mem_5", productId: "prd_normal", amount: 900000, term: 36, status: "Rejected", receivedMonthsAgo: 1, purpose: "Land purchase", sector: "04", sub: "0402", guarantors: [["mem_6", 100000], ["mem_7", 100000]] }),
    loan(8, { memberId: "mem_6", productId: "prd_emergency", amount: 40000, term: 6, status: "Disbursed", receivedMonthsAgo: 4, disbursedMonthsAgo: 4, paidInstallments: 1, purpose: "Emergency", sector: "05", sub: "0501", guarantors: [["mem_4", 40000]] }),
];

export const seedActivity = [
    { id: "act_seed", date: new Date().toISOString(), user: "system", action: "Demo data loaded", entity: "System" },
];
