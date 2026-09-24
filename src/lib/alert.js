import Swal from "sweetalert2";

export const toast = (title, icon = "success") =>
    Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2200, timerProgressBar: true });

export const errorAlert = (err, title = "Error") =>
    Swal.fire({ icon: "error", title, text: err?.message || String(err), confirmButtonColor: "#4f46e5" });

export const successAlert = (title, text) => Swal.fire({ icon: "success", title, text, confirmButtonColor: "#4f46e5" });

export const confirmAction = async ({ title, text, html, confirmText = "Yes, continue", danger = false, icon = "question" }) => {
    const res = await Swal.fire({
        title,
        text,
        html,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        confirmButtonColor: danger ? "#e11d48" : "#4f46e5",
        cancelButtonColor: "#6b7280",
        reverseButtons: true,
    });
    return res.isConfirmed;
};

/** Run a data action, show its error in a dialog, return the result (or true) on success, false on failure */
export const attempt = (fn, successMsg) => {
    try {
        const result = fn();
        if (successMsg) toast(successMsg);
        return result ?? true;
    } catch (err) {
        errorAlert(err);
        return false;
    }
};

export { Swal };
