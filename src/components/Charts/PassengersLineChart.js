"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import {
    useDataStore,
    selectFilteredData,
} from "@/stores/useDataStore";
import { useMemo } from "react";

export default function PassengersLineChart() {
    const filteredData = useDataStore(selectFilteredData);

    const chartData = useMemo(() => {
        // Custom groupBy implementation
        const grouped = filteredData.reduce((acc, item) => {
            let key = "Unknown";
            if (item.date) {
                try {
                    const date = new Date(item.date);
                    const year = date.getFullYear();
                    const month = String(
                        date.getMonth() + 1
                    ).padStart(2, "0");
                    key = `${year}-${month}`;
                } catch {
                    key = "Unknown";
                }
            }
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});

        return Object.entries(grouped)
            .map(([month, items]) => ({
                month,
                passengers: items.reduce(
                    (sum, item) =>
                        sum + (Number(item.passengers) || 0),
                    0
                ),
            }))
            .sort((a, b) => a.month.localeCompare(b.month));
    }, [filteredData]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Passengers Over Time
                </h3>
                <p className="text-gray-500 text-center py-8">
                    No data available
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Passengers Over Time
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: "currentColor" }}
                        style={{ color: "var(--foreground)" }}
                    />
                    <YAxis
                        tick={{ fill: "currentColor" }}
                        style={{ color: "var(--foreground)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--foreground)",
                            borderRadius: "8px",
                        }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="passengers"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Passengers"
                        dot={{ r: 4 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
