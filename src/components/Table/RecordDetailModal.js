"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export default function RecordDetailModal({ record, onClose }) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div
                className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <h2
                        id="modal-title"
                        className="text-xl font-bold text-gray-900"
                    >
                        Record Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {Object.entries(record).map(([key, value]) => (
                        <div
                            key={key}
                            className="border-b border-gray-200 pb-3"
                        >
                            <dt className="text-sm font-semibold text-gray-600 mb-1">
                                {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (str) =>
                                        str.toUpperCase()
                                    )
                                    .trim()}
                            </dt>
                            <dd className="text-base text-gray-900">
                                {value === null || value === undefined
                                    ? "N/A"
                                    : typeof value === "object"
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                            </dd>
                        </div>
                    ))}
                </div>
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
