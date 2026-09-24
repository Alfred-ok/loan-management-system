import { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { DEMO_USERS, ROLES, useAuth } from "@/context/AuthContext";
import { Button, Card, Field, Input } from "@/components/ui";

export default function Login() {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const submit = (e) => {
        e.preventDefault();
        if (!login(username, password)) setError("Invalid username or password.");
    };

    return (
        <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-600 p-4">
            <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6 items-center">
                <div className="text-white hidden md:block">
                    <div className="w-14 h-14 rounded-2xl bg-white text-indigo-800 font-black text-2xl flex items-center justify-center mb-6">L</div>
                    <h1 className="text-3xl font-bold mb-3">Sacco Loan Management System</h1>
                    <p className="text-indigo-200 mb-6">
                        Register members, capture loan applications, appraise, approve, disburse and track repayments — all in one place.
                    </p>
                    <ul className="space-y-2 text-sm text-indigo-100">
                        {["Member registration with next of kin & documents", "Loan workflow: Draft → Appraisal → Approval → Disbursement", "Salary appraisal & 2/3 rule checks", "Repayment schedules, arrears & loan register"].map((f) => (
                            <li key={f} className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-indigo-300" /> {f}
                            </li>
                        ))}
                    </ul>
                </div>

                <Card className="p-6 sm:p-8">
                    <h2 className="text-xl font-bold text-gray-900">Sign in</h2>
                    <p className="text-sm text-gray-500 mb-6">Use one of the demo accounts below.</p>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Username">
                            <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
                        </Field>
                        <Field label="Password" error={error}>
                            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                        </Field>
                        <Button type="submit" className="w-full" size="lg">
                            <LogIn className="w-4 h-4" /> Sign in
                        </Button>
                    </form>

                    <div className="mt-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Demo accounts</p>
                        <div className="grid grid-cols-2 gap-2">
                            {DEMO_USERS.map((u) => (
                                <button
                                    key={u.username}
                                    type="button"
                                    onClick={() => {
                                        setUsername(u.username);
                                        setPassword(u.password);
                                        setError("");
                                    }}
                                    className="text-left p-2.5 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer"
                                >
                                    <p className="text-sm font-medium text-gray-900">{ROLES[u.role].label}</p>
                                    <p className="text-xs text-gray-500">
                                        {u.username} / {u.password}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
