"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

export default function HistogramChart({ title, data = [] }) {
    return (
        <div className="dashboard-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">{title}</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 20,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="kind" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                        <Legend />
                        <Bar dataKey="planned" name="Planned" fill="#3b82f6" />
                        <Bar dataKey="actual" name="Actual" fill="#10b981" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
