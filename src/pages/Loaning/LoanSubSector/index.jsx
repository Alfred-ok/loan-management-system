import { useEffect, useState } from "react";
import { ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { Badge, Button, Card, Checkbox, Field, Input, PageHeader, SearchInput, Select } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { attempt, confirmAction, errorAlert } from "@/lib/alert";

const blank = { code: "", name: "", sectorCode: "", active: true };

export default function LoanSubSector() {
    const { can } = useAuth();
    const { sectors, subSectors, loans, saveSubSector, deleteSubSector } = useData();
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("");
    const [modal, setModal] = useState({ open: false, sub: null });
    const [form, setForm] = useState(blank);

    useEffect(() => {
        if (modal.open) setForm(modal.sub ? { ...modal.sub } : { ...blank, sectorCode: sectorFilter });
    }, [modal, sectorFilter]);

    // Suggest the next free code in the chosen sector (e.g. 0103)
    const suggestCode = (sectorCode) => {
        const used = subSectors.filter((s) => s.sectorCode === sectorCode).map((s) => Number(s.code.slice(2)));
        return `${sectorCode}${String((used.length ? Math.max(...used) : 0) + 1).padStart(2, "0")}`;
    };

    const submit = () => {
        if (!form.sectorCode) return errorAlert(new Error("Select the parent sector"));
        if (!/^\d{4}$/.test(form.code)) return errorAlert(new Error("Sub sector code must be 4 digits"));
        if (!form.name.trim()) return errorAlert(new Error("Sub sector name is required"));
        if (attempt(() => saveSubSector(form), modal.sub ? "Sub sector updated" : "Sub sector created")) setModal({ open: false, sub: null });
    };

    const q = search.trim().toLowerCase();
    const rows = subSectors
        .filter((s) => (!sectorFilter || s.sectorCode === sectorFilter) && (!q || `${s.code} ${s.name}`.toLowerCase().includes(q)))
        .sort((a, b) => a.code.localeCompare(b.code));

    return (
        <div>
            <PageHeader
                icon={ListTree}
                title="Loan Sub Sectors"
                subtitle="Detailed loan classification under each sector"
                actions={
                    can("setup") && (
                        <Button className="bg-white text-indigo-800! hover:bg-indigo-50" onClick={() => setModal({ open: true, sub: null })}>
                            <Plus className="w-4 h-4" /> New Sub Sector
                        </Button>
                    )
                }
            />
            <Card className="p-4 mb-4 flex flex-wrap gap-3">
                <SearchInput value={search} onChange={setSearch} placeholder="Search sub sectors..." className="flex-1 min-w-64" />
                <Select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} placeholder="All sectors" className="w-60">
                    {sectors.map((s) => (
                        <option key={s.id} value={s.code}>
                            {s.code} — {s.name}
                        </option>
                    ))}
                </Select>
            </Card>
            <DataTable
                rows={rows}
                columns={[
                    { key: "code", header: "Code", render: (s) => <span className="font-mono">{s.code}</span> },
                    { key: "name", header: "Sub Sector", render: (s) => <span className="font-medium">{s.name}</span> },
                    { key: "sectorCode", header: "Sector", render: (s) => sectors.find((x) => x.code === s.sectorCode)?.name || s.sectorCode },
                    { key: "loans", header: "Loans", align: "center", render: (s) => loans.filter((l) => l.subSectorCode === s.code).length },
                    { key: "active", header: "Status", align: "center", render: (s) => <Badge tone={s.active ? "emerald" : "gray"}>{s.active ? "Active" : "Inactive"}</Badge> },
                    {
                        key: "actions",
                        header: "Actions",
                        align: "center",
                        sortable: false,
                        render: (s) =>
                            can("setup") && (
                                <div className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" title="Edit" onClick={() => setModal({ open: true, sub: s })}>
                                        <Pencil className="w-4 h-4 text-amber-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Delete"
                                        onClick={async () => {
                                            if (await confirmAction({ title: `Delete ${s.name}?`, confirmText: "Delete", danger: true, icon: "warning" }))
                                                attempt(() => deleteSubSector(s.id), "Sub sector deleted");
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 text-rose-500" />
                                    </Button>
                                </div>
                            ),
                    },
                ]}
            />
            <Modal
                open={modal.open}
                onClose={() => setModal({ open: false, sub: null })}
                title={modal.sub ? "Edit Sub Sector" : "New Sub Sector"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal({ open: false, sub: null })}>
                            Cancel
                        </Button>
                        <Button onClick={submit}>Save</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Field label="Sector" required>
                        <Select
                            value={form.sectorCode}
                            disabled={!!modal.sub}
                            onChange={(e) => setForm((f) => ({ ...f, sectorCode: e.target.value, code: e.target.value ? suggestCode(e.target.value) : "" }))}
                            placeholder="Select sector"
                        >
                            {sectors.filter((s) => s.active).map((s) => (
                                <option key={s.id} value={s.code}>
                                    {s.code} — {s.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Sub Sector Code" required hint="4 digits starting with the sector code">
                        <Input value={form.code} maxLength={4} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, "") }))} disabled={!!modal.sub} />
                    </Field>
                    <Field label="Sub Sector Name" required>
                        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Checkbox label="Active" checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                </div>
            </Modal>
        </div>
    );
}
