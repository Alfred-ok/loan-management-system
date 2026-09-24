// ── Formatting & small helpers shared across the app ─────────────────────────

export const fmt = (n) =>
    Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export const kes = (n) => `KES ${fmt(n)}`;

export const fmtInt = (n) => Number(n || 0).toLocaleString();

export const fmtCompact = (n) => {
    const v = Number(n || 0);
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
};

export const today = () => new Date().toISOString().split("T")[0];

export const fmtDate = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateTime = (d) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export const uid = (prefix = "") =>
    prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const addMonths = (dateStr, months) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    // Keep month-end dates from spilling into the next month (31 Jan + 1 → 28 Feb)
    if (d.getDate() < day) d.setDate(0);
    return d.toISOString().split("T")[0];
};

export const ageFrom = (birthDate) => {
    if (!birthDate) return null;
    const b = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
    return age;
};

export const fullName = (m) =>
    m ? `${m.individualLastName || ""} ${m.individualFirstName || ""}`.trim() : "";

export const initials = (m) =>
    m
        ? `${(m.individualFirstName || "?")[0]}${(m.individualLastName || "")[0] || ""}`.toUpperCase()
        : "?";

// ── Validation patterns (same rules as the Membership module) ─────────────────
export const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    mobile: /^\+254(7|1)\d{8}$/,
    kraPin: /^[A-Z]\d{9}[A-Z]$/,
};

export const downloadCsv = (filename, rows) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// Downscale an uploaded image so documents fit comfortably in localStorage
export const compressImage = (file, maxSize = 480, quality = 0.75) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
