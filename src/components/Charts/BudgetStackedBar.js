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
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";

export default function BudgetStackedBar() {
    const { filteredData, filters } = useData();

    const chartData = useMemo(() => {
        // Determine grouping based on filters
        // If no station filter (All Stations), group by Category
        // If station filter is set and no category filter (All Activities), group by Activity Name
        // Otherwise, group by Activity Name (default)
        const groupByCategory = !filters.station;
        const groupByActivityName =
            filters.station && !filters.category;

        const grouped = filteredData.reduce((acc, item) => {
            let key;
            if (groupByCategory) {
                // Group by Category when All Stations
                key = item.Category || item.category || "Unknown";
            } else if (groupByActivityName) {
                // Group by Activity Name when station is selected and All Activities
                key =
                    item["Activity Name"] ||
                    item.activityName ||
                    "Unknown";
            } else {
                // Default: group by Activity Name
                key =
                    item["Activity Name"] ||
                    item.activityName ||
                    "Unknown";
            }

            if (!acc[key]) {
                acc[key] = {
                    actual: [],
                    planned: [],
                };
            }
            const actual =
                parseFloat(
                    String(item.Actual || item.actual || "0").replace(
                        "%",
                        ""
                    )
                ) || 0;
            const planned =
                parseFloat(
                    String(
                        item.Planned || item.planned || "0"
                    ).replace("%", "")
                ) || 0;
            acc[key].actual.push(actual);
            acc[key].planned.push(planned);
            return acc;
        }, {});

        return Object.entries(grouped)
            .map(([key, data]) => {
                const avgActual =
                    data.actual.length > 0
                        ? data.actual.reduce(
                              (sum, val) => sum + val,
                              0
                          ) / data.actual.length
                        : 0;
                const avgPlanned =
                    data.planned.length > 0
                        ? data.planned.reduce(
                              (sum, val) => sum + val,
                              0
                          ) / data.planned.length
                        : 0;
                return {
                    name:
                        key.length > 25
                            ? key.substring(0, 25) + "..."
                            : key,
                    fullName: key,
                    actual: avgActual,
                    planned: avgPlanned,
                };
            })
            .sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [filteredData, filters.station, filters.category]);

    // Show message when no station filter is selected
    if (!filters.station) {
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Actual vs Planned by Category
                </h3>
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-500 text-center text-lg">
                        Please select a station to view Actual vs
                        Planned progress by Category
                    </p>
                </div>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Actual vs Planned
                </h3>
                <p className="text-gray-500 text-center py-8">
                    No data available
                </p>
            </div>
        );
    }

    // Determine x-axis label based on grouping
    const xAxisLabel = !filters.station
        ? "Category"
        : filters.station && !filters.category
        ? "Activity Name"
        : "Activity Name";
    const chartTitle = !filters.station
        ? "Actual vs Planned by Category"
        : filters.station && !filters.category
        ? "Actual vs Planned by Activity Name"
        : "Actual vs Planned";

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {chartTitle}
            </h3>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={chartData}
                    margin={{
                        bottom: 80,
                        top: 20,
                        right: 30,
                        left: 20,
                    }}
                >
                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                    />
                    <XAxis
                        dataKey="fullName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fill: "#374151", fontSize: 11 }}
                        label={{
                            value: xAxisLabel,
                            position: "insideBottom",
                            offset: -5,
                            style: {
                                textAnchor: "middle",
                                fill: "#374151",
                            },
                        }}
                    />
                    <YAxis
                        tick={{ fill: "#374151" }}
                        domain={[0, 100]}
                        label={{
                            value: "Progress %",
                            angle: -90,
                            position: "insideLeft",
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value, name, props) => {
                            const dataKey = props.dataKey || name;
                            return [
                                `${value.toFixed(1)}%`,
                                dataKey === "actual"
                                    ? "Actual"
                                    : "Planned",
                            ];
                        }}
                        labelFormatter={(label) => label}
                    />
                    <Legend />
                    <Bar
                        dataKey="actual"
                        fill="#10b981"
                        name="Actual %"
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="planned"
                        fill="#3b82f6"
                        name="Planned %"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
