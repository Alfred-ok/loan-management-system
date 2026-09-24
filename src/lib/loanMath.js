import { addMonths, today } from "./format";

export const INTEREST_METHODS = {
    reducing: "Reducing Balance (Amortized)",
    flat: "Flat Rate (Straight Line)",
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Build a monthly repayment schedule.
 *  - reducing: equal installments, interest charged on the outstanding balance
 *  - flat:     interest charged on the original principal every month
 */
export function generateSchedule({ principal, annualRate, termMonths, method = "reducing", startDate = today() }) {
    const P = Number(principal) || 0;
    const n = Math.max(1, Number(termMonths) || 1);
    const r = (Number(annualRate) || 0) / 12 / 100;
    const rows = [];
    let balance = P;

    // Every figure is rounded to cents as it is produced, and the last row takes
    // whatever principal is left, so the schedule closes at exactly zero.
    const push = (i, opening, pp, interest) => {
        balance = round2(opening - pp);
        rows.push({
            no: i,
            dueDate: addMonths(startDate, i),
            openingBalance: opening,
            principal: pp,
            interest,
            installment: round2(pp + interest),
            closingBalance: balance,
        });
    };

    if (method === "flat") {
        const interest = round2(P * r);
        const principalPart = round2(P / n);
        for (let i = 1; i <= n; i++) push(i, balance, i === n ? balance : Math.min(principalPart, balance), interest);
        return rows;
    }

    const payment = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    for (let i = 1; i <= n; i++) {
        const interest = round2(balance * r);
        push(i, balance, i === n ? balance : Math.min(round2(payment - interest), balance), interest);
    }
    return rows;
}

export function summarizeSchedule(rows) {
    const totalInterest = rows.reduce((s, r) => s + r.interest, 0);
    const totalPrincipal = rows.reduce((s, r) => s + r.principal, 0);
    return {
        installment: rows[0]?.installment || 0,
        totalInterest: round2(totalInterest),
        totalPrincipal: round2(totalPrincipal),
        totalRepayable: round2(totalInterest + totalPrincipal),
    };
}

export const monthlyRepayment = (amount, annualRate, termMonths, method) =>
    summarizeSchedule(generateSchedule({ principal: amount, annualRate, termMonths, method })).installment;

// ── Appraisal rules (ported from LoanAppraisalDrawer) ────────────────────────

/** Salary appraisal amount = (Net take-home ÷ 3) × loan term */
export function salaryAppraisal({ netPay, termMonths, amount }) {
    const netTakeHomePay = Number(netPay) || 0;
    const loanTerm = Number(termMonths) || 0;
    const proposedLoanAmount = Number(amount) || 0;
    const oneThirdOfNetPay = netTakeHomePay / 3;
    const salaryAppraisalAmount = oneThirdOfNetPay * loanTerm;
    const abilityPercentage = proposedLoanAmount > 0 ? (salaryAppraisalAmount / proposedLoanAmount) * 100 : 0;
    return {
        netTakeHomePay,
        oneThirdOfNetPay,
        loanTerm,
        salaryAppraisalAmount,
        proposedLoanAmount,
        abilityPercentage: Math.round(abilityPercentage),
        isAffordable: proposedLoanAmount <= salaryAppraisalAmount,
        shortfall: Math.max(0, proposedLoanAmount - salaryAppraisalAmount),
    };
}

/** Kenyan 2/3 rule — total deductions must not exceed ⅔ of gross pay */
export function twoThirdRule({ basic, allowance, deductions, repayment }) {
    const grossSalary = (Number(basic) || 0) + (Number(allowance) || 0);
    const maxAllowedDeduction = (2 / 3) * grossSalary;
    const minimumTakeHome = grossSalary / 3;
    const currentTotalDeductions = Number(deductions) || 0;
    const proposedMonthlyRepayment = Number(repayment) || 0;
    const totalWithNewLoan = currentTotalDeductions + proposedMonthlyRepayment;
    return {
        grossSalary,
        maxAllowedDeduction,
        minimumTakeHome,
        currentTotalDeductions,
        availableForNewLoan: Math.max(0, maxAllowedDeduction - currentTotalDeductions),
        proposedMonthlyRepayment,
        totalWithNewLoan,
        isTwoThirdRuleBroken: grossSalary > 0 && totalWithNewLoan > maxAllowedDeduction,
        excessAmount: Math.max(0, totalWithNewLoan - maxAllowedDeduction),
    };
}

/**
 * Where a disbursed loan stands on a given date. Payments are allocated to
 * installments oldest first, interest before principal.
 */
export function loanPosition(loan, asOf = today()) {
    const schedule = loan.schedule || [];
    const repayments = loan.repayments || [];
    let pool = repayments.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalPaid = pool;

    let principalPaid = 0;
    let interestPaid = 0;
    let arrears = 0;
    let installmentsInArrears = 0;
    let nextDue = null;

    const installments = schedule.map((row) => {
        // Round at every step so float dust never shows up as a "partial" payment
        const iPaid = round2(Math.min(pool, row.interest));
        pool = round2(pool - iPaid);
        const pPaid = round2(Math.min(pool, row.principal));
        pool = round2(pool - pPaid);
        interestPaid += iPaid;
        principalPaid += pPaid;
        const paid = round2(iPaid + pPaid);
        const outstanding = round2(row.installment - paid);

        let status = "Pending";
        if (outstanding <= 0.01) status = "Paid";
        else if (row.dueDate < asOf) {
            status = paid > 0 ? "Partial / Overdue" : "Overdue";
            arrears += outstanding;
            installmentsInArrears++;
        } else if (paid > 0) status = "Partial";

        if (!nextDue && outstanding > 0.01 && row.dueDate >= asOf) nextDue = { ...row, outstanding };
        return { ...row, paid: round2(paid), outstanding: Math.max(0, outstanding), status };
    });

    const summary = summarizeSchedule(schedule);
    const principalBalance = Math.max(0, (Number(loan.disbursedAmount) || summary.totalPrincipal) - principalPaid);
    const interestBalance = Math.max(0, summary.totalInterest - interestPaid);
    const daysInArrears = (() => {
        const first = installments.find((i) => i.status.includes("Overdue"));
        if (!first) return 0;
        return Math.floor((new Date(asOf) - new Date(first.dueDate)) / 86_400_000);
    })();

    return {
        installments,
        totalPaid: round2(totalPaid),
        principalPaid: round2(principalPaid),
        interestPaid: round2(interestPaid),
        principalBalance: round2(principalBalance),
        interestBalance: round2(interestBalance),
        balance: round2(principalBalance + interestBalance),
        arrears: round2(arrears),
        installmentsInArrears,
        daysInArrears,
        nextDue,
        overpayment: round2(Math.max(0, pool)),
        totalRepayable: summary.totalRepayable,
        installment: summary.installment,
    };
}

/** CBK-style classification by days in arrears */
export function classifyLoan(daysInArrears) {
    if (daysInArrears <= 0) return "Performing";
    if (daysInArrears <= 30) return "Watch";
    if (daysInArrears <= 90) return "Substandard";
    if (daysInArrears <= 180) return "Doubtful";
    return "Loss";
}
