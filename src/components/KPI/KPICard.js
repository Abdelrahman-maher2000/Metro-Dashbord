"use client";

export default function KPICard({
    title,
    value,
    icon: Icon,
    tooltip,
    trend,
}) {
    return (
        <div
            className="bg-white rounded-xl shadow-md border border-gray-200 p-6 relative group hover:shadow-lg transition-shadow"
            role="region"
            aria-label={title}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                        {title}
                    </p>
                    <p className="text-3xl font-bold text-gray-900">
                        {value}
                    </p>
                    {trend && (
                        <p
                            className={`text-sm mt-2 ${
                                trend > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                            }`}
                        >
                            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <Icon
                            className="text-blue-600"
                            size={24}
                            aria-hidden="true"
                        />
                    </div>
                )}
            </div>
            {tooltip && (
                <div
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    role="tooltip"
                >
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {tooltip}
                    </div>
                </div>
            )}
        </div>
    );
}
