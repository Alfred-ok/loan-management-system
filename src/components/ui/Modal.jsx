import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cx } from "./index";

export default function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        className="absolute inset-0 bg-black"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.45 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className={cx("relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col", width)}
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                            <h2 className="font-semibold text-gray-900">{title}</h2>
                            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer" aria-label="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">{children}</div>
                        {footer && <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-2xl">{footer}</div>}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
