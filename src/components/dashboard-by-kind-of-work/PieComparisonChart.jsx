"use client";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#3b82f6", "#10b981"];

export default function PieComparisonChart({ title, planned = 0, actual = 0 }) {
    const plannedValue = Number(planned) || 0;
    const actualValue = Number(actual) || 0;
    const pieData = [
        { name: "Planned", value: plannedValue },
        { name: "Actual", value: actualValue },
    ];

    const renderSliceLabel = ({
        cx,
        cy,
        midAngle,
        innerRadius,
        outerRadius,
        value,
    }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const angle = (-midAngle * Math.PI) / 180;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        return (
            <text
                x={x}
                y={y}
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={16}
                fontWeight={700}
            >
                {`${Number(value).toFixed(2)}%`}
            </text>
        );
    };

    return (
        <div className="dashboard-card rounded-2xl border border-sky-100 bg-cyan-100 p-4 shadow-sm">
            <h4 className="mb-3 text-center text-[21px] font-bold text-slate-900">{title}</h4>
            <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            outerRadius={86}
                            innerRadius={46}
                            paddingAngle={1.5}
                            labelLine={false}
                            label={renderSliceLabel}
                        >
                            {pieData.map((entry, index) => (
                                <Cell
                                    key={`${entry.name}-${index}`}
                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-slate-700">Planned:</span>
                    <span className="font-bold text-blue-600">{plannedValue.toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-700">Actual:</span>
                    <span className="font-bold text-emerald-600">{actualValue.toFixed(2)}%</span>
                </div>
            </div>
        </div>
    );
}
