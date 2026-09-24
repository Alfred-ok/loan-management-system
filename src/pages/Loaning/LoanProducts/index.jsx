import { useEffect, useState } from "react";
import { Package, Plus, Pencil, Trash2, Eye, Power } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import DataTable from "@/components/ui/DataTable";
import { Badge, Button, Card, Checkbox, Field, InfoGrid, Input, PageHeader, SearchInput, SectionTitle, Select, StatCard, Textarea } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { attempt, confirmAction, errorAlert } from "@/lib/alert";
import { fmt, kes } from "@/lib/format";
import { INTEREST_METHODS, loanPosition } from "@/lib/loanMath";
import { productCategories, productSections } from "@/lib/selectData";

const blankProduct = {
    code: "", name: "", category: "Normal", section: "BOSA", description: "",
    annualRate: 12, method: "reducing", minAmount: 1000, maxAmount: 1000000, maxTermMonths: 36,
    minGuarantors: 1, maxGuarantees: 4, multiplier: 3, allowSelfGuarantee: false,
    processingFeePct: 1, insurancePct: 0, active: true,
};

function ProductDrawer({ open, onClose, product }) {
    const { saveProduct } = useData();
    const [form, setForm] = useState(blankProduct);
    useEffect(() => {
        if (open) setForm(product ? { ...product } : { ...blankProduct });
    }, [open, product]);
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const num = (k) => ({ type: "number", value: form[k], onChange: (e) => update(k, e.target.value), min: 0 });

    const submit = () => {
        const p = { ...form };
        for (const k of ["annualRate", "minAmount", "maxAmount", "maxTermMonths", "minGuarantors", "maxGuarantees", "multiplier", "processingFeePct", "insurancePct"]) p[k] = Number(p[k]) || 0;
        const err =
            (!p.code.trim() && "Product code is required") ||
            (!p.name.trim() && "Product name is required") ||
            (p.maxAmount <= 0 && "Maximum amount must be greater than zero") ||
            (p.minAmount > p.maxAmount && "Minimum amount cannot exceed the maximum") ||
            (p.maxTermMonths < 1 && "Maximum period must be at least 1 month") ||
            (p.annualRate < 0 && "Interest rate cannot be negative") ||
            (p.multiplier <= 0 && "Deposits multiplier must be greater than zero");
        if (err) return errorAlert(new Error(err), "Check the product");
        if (attempt(() => saveProduct(p), product ? "Product updated" : "Product created")) onClose();
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={product ? `Edit Product — ${product.name}` : "New Loan Product"}
            width="max-w-4xl"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={submit}>
                        Save Product
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <Card className="p-5">
                    <SectionTitle>General</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label="Product Code" required>
                            <Input value={form.code} onChange={(e) => update("code", e.target.value.toUpperCase())} placeholder="LP005" />
                        </Field>
                        <Field label="Product Name" required className="lg:col-span-2">
                            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
                        </Field>
                        <Field label="Product Category">
                            <Select value={form.category} onChange={(e) => update("category", e.target.value)}>
                                {productCategories.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Product Section">
                            <Select value={form.section} onChange={(e) => update("section", e.target.value)}>
                                {productSections.map((c) => (
                                    <option key={c}>{c}</option>
                                ))}
                            </Select>
                        </Field>
                        <div className="flex items-end pb-2">
                            <Checkbox label="Active (available for new applications)" checked={form.active} onChange={(v) => update("active", v)} />
                        </div>
                        <Field label="Description" className="sm:col-span-2 lg:col-span-3">
                            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} />
                        </Field>
                    </div>
                </Card>
                <Card className="p-5">
                    <SectionTitle>Interest & Pricing</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Field label="Annual Interest Rate (%)">
                            <Input {...num("annualRate")} step="0.01" />
                        </Field>
                        <Field label="Interest Calculation Mode" className="lg:col-span-2">
                            <Select value={form.method} onChange={(e) => update("method", e.target.value)}>
                                {Object.entries(INTEREST_METHODS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <div />
                        <Field label="Processing Fee (%)" hint="Deducted at disbursement">
                            <Input {...num("processingFeePct")} step="0.01" />
                        </Field>
                        <Field label="Insurance (%)" hint="Deducted at disbursement">
                            <Input {...num("insurancePct")} step="0.01" />
                        </Field>
                    </div>
                </Card>
                <Card className="p-5">
                    <SectionTitle>Limits & Security</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Field label="Minimum Amount">
                            <Input {...num("minAmount")} />
                        </Field>
                        <Field label="Maximum Amount">
                            <Input {...num("maxAmount")} />
                        </Field>
                        <Field label="Maximum Period (months)">
                            <Input {...num("maxTermMonths")} />
                        </Field>
                        <Field label="Deposits Multiplier" hint="Max loan = deposits × multiplier">
                            <Input {...num("multiplier")} step="0.5" />
                        </Field>
                        <Field label="Minimum Guarantors">
                            <Input {...num("minGuarantors")} />
                        </Field>
                        <Field label="Max Guarantees per Guarantor" hint="Active loans one member may guarantee">
                            <Input {...num("maxGuarantees")} />
                        </Field>
                        <div className="flex items-end pb-2 lg:col-span-2">
                            <Checkbox label="Allow self guarantee" checked={form.allowSelfGuarantee} onChange={(v) => update("allowSelfGuarantee", v)} />
                        </div>
                    </div>
                </Card>
            </div>
        </Drawer>
    );
}

export default function LoanProducts() {
    const { can } = useAuth();
    const { products, loans, deleteProduct, saveProduct } = useData();
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState({ open: false, product: null });
    const [viewing, setViewing] = useState(null);
    const q = search.trim().toLowerCase();
    const rows = products.filter((p) => !q || `${p.code} ${p.name} ${p.category} ${p.section}`.toLowerCase().includes(q));

    const portfolio = (id) => loans.filter((l) => l.productId === id && l.status === "Disbursed").reduce((s, l) => s + loanPosition(l).balance, 0);

    const handleDelete = async (p) => {
        if (await confirmAction({ title: `Delete ${p.name}?`, confirmText: "Delete", danger: true, icon: "warning" })) attempt(() => deleteProduct(p.id), "Product deleted");
    };

    const toggleActive = (p) => {
        attempt(() => saveProduct({ ...p, active: !p.active }), `${p.name} ${p.active ? "deactivated" : "activated"}`);
    };

    return (
        <div>
            <PageHeader
                icon={Package}
                title="Loan Products"
                subtitle="Configure interest, limits and security requirements"
                actions={
                    can("setup") && (
                        <Button className="bg-white text-indigo-800! hover:bg-indigo-50" onClick={() => setEditing({ open: true, product: null })}>
                            <Plus className="w-4 h-4" /> New Product
                        </Button>
                    )
                }
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Package} label="Products" value={products.length} />
                <StatCard label="Active" value={products.filter((p) => p.active).length} tone="emerald" />
                <StatCard label="Lowest Rate" value={`${Math.min(...products.map((p) => p.annualRate), 0) || 0}%`} tone="sky" />
                <StatCard label="Highest Limit" value={kes(Math.max(0, ...products.map((p) => p.maxAmount)))} tone="violet" />
            </div>
            <Card className="p-4 mb-4">
                <SearchInput value={search} onChange={setSearch} placeholder="Search products..." className="max-w-md" />
            </Card>
            <DataTable
                rows={rows}
                emptyTitle="No loan products"
                columns={[
                    { key: "code", header: "Code", render: (p) => <span className="font-mono text-xs">{p.code}</span> },
                    {
                        key: "name",
                        header: "Product",
                        render: (p) => (
                            <div>
                                <p className="font-medium text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-500">
                                    {p.category} · {p.section}
                                </p>
                            </div>
                        ),
                    },
                    { key: "annualRate", header: "Rate", align: "center", render: (p) => `${p.annualRate}%` },
                    { key: "method", header: "Method", render: (p) => (p.method === "flat" ? "Flat" : "Reducing") },
                    { key: "maxAmount", header: "Limit", align: "right", render: (p) => <span className="tabular-nums">{fmt(p.maxAmount)}</span> },
                    { key: "maxTermMonths", header: "Max Term", align: "center", render: (p) => `${p.maxTermMonths} m` },
                    { key: "minGuarantors", header: "Guarantors", align: "center" },
                    { key: "multiplier", header: "Multiplier", align: "center", render: (p) => `${p.multiplier}×` },
                    { key: "portfolio", header: "Portfolio", align: "right", sortValue: (p) => portfolio(p.id), render: (p) => <span className="tabular-nums">{fmt(portfolio(p.id))}</span> },
                    { key: "active", header: "Status", align: "center", render: (p) => <Badge tone={p.active ? "emerald" : "gray"}>{p.active ? "Active" : "Inactive"}</Badge> },
                    {
                        key: "actions",
                        header: "Actions",
                        align: "center",
                        sortable: false,
                        render: (p) => (
                            <div className="flex justify-center gap-0.5">
                                <Button variant="ghost" size="icon" title="View" onClick={() => setViewing(p)}>
                                    <Eye className="w-4 h-4 text-indigo-600" />
                                </Button>
                                {can("setup") && (
                                    <>
                                        <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing({ open: true, product: p })}>
                                            <Pencil className="w-4 h-4 text-amber-600" />
                                        </Button>
                                        <Button variant="ghost" size="icon" title={p.active ? "Deactivate" : "Activate"} onClick={() => toggleActive(p)}>
                                            <Power className={`w-4 h-4 ${p.active ? "text-gray-500" : "text-emerald-600"}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(p)}>
                                            <Trash2 className="w-4 h-4 text-rose-500" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        ),
                    },
                ]}
            />

            <ProductDrawer open={editing.open} product={editing.product} onClose={() => setEditing({ open: false, product: null })} />

            <Drawer open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name} subtitle={viewing?.code} width="max-w-3xl">
                {viewing && (
                    <Card className="p-5">
                        <InfoGrid
                            items={[
                                ["Code", viewing.code],
                                ["Category", viewing.category],
                                ["Section", viewing.section],
                                ["Interest Rate", `${viewing.annualRate}% p.a.`],
                                ["Interest Method", INTEREST_METHODS[viewing.method]],
                                ["Processing Fee", `${viewing.processingFeePct}%`],
                                ["Insurance", `${viewing.insurancePct}%`],
                                ["Minimum Amount", kes(viewing.minAmount)],
                                ["Maximum Amount", kes(viewing.maxAmount)],
                                ["Maximum Period", `${viewing.maxTermMonths} months`],
                                ["Deposits Multiplier", `${viewing.multiplier}×`],
                                ["Minimum Guarantors", viewing.minGuarantors],
                                ["Max Guarantees / Guarantor", viewing.maxGuarantees],
                                ["Self Guarantee", viewing.allowSelfGuarantee ? "Allowed" : "Not allowed"],
                                ["Status", viewing.active ? "Active" : "Inactive"],
                                ["Loans (all time)", loans.filter((l) => l.productId === viewing.id).length],
                            ]}
                        />
                        {viewing.description && <p className="mt-4 text-sm text-gray-600">{viewing.description}</p>}
                    </Card>
                )}
            </Drawer>
        </div>
    );
}
