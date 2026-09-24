import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
    LayoutDashboard, Users, Landmark, FileText, BookOpen, Calculator, Package, Layers, ListTree,
    LogOut, Menu, X, RotateCcw, HandCoins,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { confirmAction, toast } from "@/lib/alert";
import { Avatar, cx } from "@/components/ui";

const NAV = [
    { section: null, items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
    { section: "Membership", items: [{ to: "/membership/members", label: "Members", icon: Users }] },
    {
        section: "Loaning",
        items: [
            { to: "/loaning", label: "Loan Dashboard", icon: Landmark, end: true },
            { to: "/loaning/applications", label: "Loan Applications", icon: FileText },
            { to: "/loaning/register", label: "Loan Register", icon: BookOpen },
            { to: "/loaning/repayments", label: "Repayments", icon: HandCoins },
            { to: "/loaning/calculator", label: "Loan Calculator", icon: Calculator },
        ],
    },
    {
        section: "Loan Setup",
        items: [
            { to: "/loaning/products", label: "Loan Products", icon: Package },
            { to: "/loaning/sectors", label: "Loan Sectors", icon: Layers },
            { to: "/loaning/sub-sectors", label: "Loan Sub Sectors", icon: ListTree },
        ],
    },
];

export default function Layout() {
    const { user, logout, roleLabel } = useAuth();
    const { resetDemoData } = useData();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const handleReset = async () => {
        const ok = await confirmAction({
            title: "Reset demo data?",
            text: "All members, loans and transactions will be replaced with the original demo data.",
            confirmText: "Reset",
            danger: true,
            icon: "warning",
        });
        if (ok) {
            resetDemoData();
            toast("Demo data restored");
        }
    };

    const sidebar = (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-5 h-16 border-b border-indigo-800">
                <div className="w-9 h-9 rounded-xl bg-white text-indigo-800 font-black flex items-center justify-center">L</div>
                <div>
                    <p className="font-bold text-white leading-tight">LoanSys</p>
                    <p className="text-[11px] text-indigo-300">Sacco Loan Management</p>
                </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {NAV.map((group) => (
                    <div key={group.section || "main"}>
                        {group.section && (
                            <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">{group.section}</p>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    onClick={() => setMobileOpen(false)}
                                    className={({ isActive }) =>
                                        cx(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                                            isActive ? "bg-white text-indigo-800 font-semibold shadow" : "text-indigo-100 hover:bg-indigo-800"
                                        )
                                    }
                                >
                                    <item.icon className="w-4 h-4 shrink-0" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="p-3 border-t border-indigo-800">
                <button
                    type="button"
                    onClick={handleReset}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-indigo-200 hover:bg-indigo-800 cursor-pointer"
                >
                    <RotateCcw className="w-4 h-4" /> Reset demo data
                </button>
            </div>
        </div>
    );

    const current = NAV.flatMap((g) => g.items).find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)));

    return (
        <div className="h-full flex">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-64 shrink-0 bg-indigo-900">{sidebar}</aside>

            {/* Mobile sidebar */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-40 flex">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                    <aside className="relative w-64 bg-indigo-900 h-full">
                        <button type="button" onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 text-white cursor-pointer" aria-label="Close menu">
                            <X className="w-5 h-5" />
                        </button>
                        {sidebar}
                    </aside>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        <button type="button" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 cursor-pointer" onClick={() => setMobileOpen(true)} aria-label="Open menu">
                            <Menu className="w-5 h-5" />
                        </button>
                        <p className="font-semibold text-gray-800">{current?.label || "LoanSys"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
                            <p className="text-xs text-gray-500">{roleLabel}</p>
                        </div>
                        <Avatar text={user?.name?.[0] || "?"} size="sm" />
                        <button
                            type="button"
                            onClick={logout}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-rose-600 cursor-pointer"
                            title="Log out"
                            aria-label="Log out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-[1500px] mx-auto p-4 lg:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
