import { useEffect, useState } from "react";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DataTable from "@/components/ui/DataTable";
import { Badge, Button, Card, Checkbox, Field, Input, PageHeader, SearchInput } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { attempt, confirmAction, errorAlert } from "@/lib/alert";

export default function LoanSector() {
    const { can } = useAuth();
    const { sectors, subSectors, loans, saveSector, deleteSector } = useData();
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState({ open: false, sector: null });
    const [form, setForm] = useState({ code: "", name: "", active: true });

    useEffect(() => {
        if (modal.open) setForm(modal.sector ? { ...modal.sector } : { code: "", name: "", active: true });
    }, [modal]);

    const submit = () => {
        if (!/^\d{2}$/.test(form.code)) return errorAlert(new Error("Sector code must be 2 digits, e.g. 07"));
        if (!form.name.trim()) return errorAlert(new Error("Sector name is required"));
        if (attempt(() => saveSector(form), modal.sector ? "Sector updated" : "Sector created")) setModal({ open: false, sector: null });
    };

    const q = search.trim().toLowerCase();
    const rows = sectors.filter((s) => !q || `${s.code} ${s.name}`.toLowerCase().includes(q)).sort((a, b) => a.code.localeCompare(b.code));

    return (
        <div>
            <PageHeader
                icon={Layers}
                title="Loan Sectors"
                subtitle="Economic sectors used to classify loans"
                actions={
                    can("setup") && (
                        <Button className="bg-white text-indigo-800! hover:bg-indigo-50" onClick={() => setModal({ open: true, sector: null })}>
                            <Plus className="w-4 h-4" /> New Sector
                        </Button>
                    )
                }
            />
            <Card className="p-4 mb-4">
                <SearchInput value={search} onChange={setSearch} placeholder="Search sectors..." className="max-w-md" />
            </Card>
            <DataTable
                rows={rows}
                columns={[
                    { key: "code", header: "Code", render: (s) => <span className="font-mono">{s.code}</span> },
                    { key: "name", header: "Sector Name", render: (s) => <span className="font-medium">{s.name}</span> },
                    { key: "subs", header: "Sub Sectors", align: "center", render: (s) => subSectors.filter((x) => x.sectorCode === s.code).length },
                    { key: "loans", header: "Loans", align: "center", render: (s) => loans.filter((l) => l.sectorCode === s.code).length },
                    { key: "active", header: "Status", align: "center", render: (s) => <Badge tone={s.active ? "emerald" : "gray"}>{s.active ? "Active" : "Inactive"}</Badge> },
                    {
                        key: "actions",
                        header: "Actions",
                        align: "center",
                        sortable: false,
                        render: (s) =>
                            can("setup") && (
                                <div className="flex justify-center gap-1">
                                    <Button variant="ghost" size="icon" title="Edit" onClick={() => setModal({ open: true, sector: s })}>
                                        <Pencil className="w-4 h-4 text-amber-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        title="Delete"
                                        onClick={async () => {
                                            if (await confirmAction({ title: `Delete ${s.name}?`, confirmText: "Delete", danger: true, icon: "warning" }))
                                                attempt(() => deleteSector(s.id), "Sector deleted");
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
                onClose={() => setModal({ open: false, sector: null })}
                title={modal.sector ? "Edit Sector" : "New Sector"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setModal({ open: false, sector: null })}>
                            Cancel
                        </Button>
                        <Button onClick={submit}>Save</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Field label="Sector Code" required hint="Two digits, e.g. 07">
                        <Input value={form.code} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, "") }))} disabled={!!modal.sector} />
                    </Field>
                    <Field label="Sector Name" required>
                        <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Checkbox label="Active" checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                </div>
            </Modal>
        </div>
    );
}
