import { createContext, useContext, useState } from "react";

const SESSION_KEY = "lms_session";

// Each role can work only on certain loan workflow stages — mirrors the
// capability checks in the original LoanApplication module.
export const ROLES = {
    admin: {
        label: "Administrator",
        capabilities: ["members", "loans.draft", "loans.appraise", "loans.approve", "loans.reject", "loans.disburse", "loans.repay", "setup"],
    },
    officer: { label: "Loan Officer", capabilities: ["members", "loans.draft", "loans.appraise"] },
    manager: { label: "Credit Manager", capabilities: ["loans.approve", "loans.reject", "setup"] },
    cashier: { label: "Cashier", capabilities: ["members.transactions", "loans.disburse", "loans.repay"] },
};

export const DEMO_USERS = [
    { username: "admin", password: "admin123", name: "System Admin", role: "admin" },
    { username: "officer", password: "officer123", name: "Alice Loan Officer", role: "officer" },
    { username: "manager", password: "manager123", name: "Brian Credit Manager", role: "manager" },
    { username: "cashier", password: "cashier123", name: "Carol Cashier", role: "cashier" },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
        } catch {
            return null;
        }
    });

    const login = (username, password) => {
        const found = DEMO_USERS.find(
            (u) => u.username === username.trim().toLowerCase() && u.password === password
        );
        if (!found) return false;
        const session = { username: found.username, name: found.name, role: found.role };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        setUser(session);
        return true;
    };

    const logout = () => {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
    };

    const can = (capability) => {
        if (!user) return false;
        const caps = ROLES[user.role]?.capabilities || [];
        // "members" implies every members.* capability
        return caps.includes(capability) || caps.includes(capability.split(".")[0]);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, can, roleLabel: ROLES[user?.role]?.label }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
