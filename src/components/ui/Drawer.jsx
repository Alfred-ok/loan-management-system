import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cx } from "./index";

/** Right-hand slide-over drawer in the style of the original module drawers */
export default function Drawer({ open, onClose, title, subtitle, actions, width = "max-w-5xl", children, footer }) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className={cx(
                            "fixed top-0 right-0 sm:top-3 sm:right-3 bottom-0 sm:bottom-3 w-full sm:w-[92vw] bg-gray-50 shadow-2xl z-50 flex flex-col sm:rounded-2xl overflow-hidden",
                            width
                        )}
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 280, damping: 30 }}
                    >
                        <div className="p-4 bg-indigo-700 sm:rounded-2xl sm:m-2 shrink-0">
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <h2 className="font-bold text-lg text-white truncate">{title}</h2>
                                    {subtitle && <div className="text-indigo-200 text-xs mt-0.5">{subtitle}</div>}
                                </div>
                                <div className="flex gap-2 items-center shrink-0">
                                    {actions}
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg text-white hover:bg-white/15 cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4">{children}</div>
                        {footer && <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3">{footer}</div>}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
