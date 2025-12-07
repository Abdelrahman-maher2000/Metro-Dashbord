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

    // When All Stations is selected, create separate charts for each category
    const categoryCharts = useMemo(() => {
        if (!filters.station) {
            const categoryMap = new Map();

            filteredData.forEach((item) => {
                const category =
                    item.Category || item.category || "Unknown";
                const activityName =
                    item["Activity Name"] ||
                    item.activityName ||
                    "Unknown";

                if (!categoryMap.has(category)) {
                    categoryMap.set(category, new Map());
                }

                const activityMap = categoryMap.get(category);
                if (!activityMap.has(activityName)) {
                    activityMap.set(activityName, {
                        actual: [],
                        planned: [],
                    });
                }

                const actual =
                    parseFloat(
                        String(
                            item.Actual || item.actual || "0"
                        ).replace("%", "")
                    ) || 0;
                const planned =
                    parseFloat(
                        String(
                            item.Planned || item.planned || "0"
                        ).replace("%", "")
                    ) || 0;

                activityMap.get(activityName).actual.push(actual);
                activityMap.get(activityName).planned.push(planned);
            });

            const charts = [];
            categoryMap.forEach((activityMap, category) => {
                const activities = [];
                activityMap.forEach((data, activityName) => {
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

                    activities.push({
                        name:
                            activityName.length > 20
                                ? activityName.substring(0, 20) +
                                  "..."
                                : activityName,
                        fullName: activityName,
                        actual: avgActual,
                        planned: avgPlanned,
                    });
                });

                charts.push({
                    category,
                    activities: activities.sort((a, b) =>
                        a.fullName.localeCompare(b.fullName)
                    ),
                });
            });

            return charts.sort((a, b) =>
                a.category.localeCompare(b.category)
            );
        }
        return [];
    }, [filteredData, filters.station]);

    const chartData = useMemo(() => {
        // When a station is selected, use the existing logic
        if (filters.station) {
            const groupByActivityName = !filters.category;

            const grouped = filteredData.reduce((acc, item) => {
                let key;
                if (groupByActivityName) {
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
                        String(
                            item.Actual || item.actual || "0"
                        ).replace("%", "")
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
        }
        return [];
    }, [filteredData, filters.station, filters.category]);

    // When All Stations is selected, show multiple bar charts (one per category)
    if (!filters.station && categoryCharts.length > 0) {
        const chartTitle = !filters.category
            ? "Actual vs Planned by Activity Name (All Stations)"
            : "Actual vs Planned by Category";

        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    {chartTitle}
                </h3>
                <div className="space-y-8">
                    {categoryCharts.map((categoryChart) => (
                        <div
                            key={categoryChart.category}
                            className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                        >
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                                {categoryChart.category}
                            </h4>
                            <ResponsiveContainer
                                width="100%"
                                height={350}
                            >
                                <BarChart
                                    data={categoryChart.activities}
                                    margin={{
                                        bottom: 80,
                                        top: 10,
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
                                        tick={{
                                            fill: "#374151",
                                            fontSize: 11,
                                        }}
                                        label={{
                                            value: "Activity Name",
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
                                            backgroundColor:
                                                "#ffffff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "8px",
                                            boxShadow:
                                                "0 4px 6px rgba(0, 0, 0, 0.1)",
                                        }}
                                        formatter={(
                                            value,
                                            name,
                                            props
                                        ) => {
                                            const dataKey =
                                                props.dataKey || name;
                                            return [
                                                `${value.toFixed(
                                                    1
                                                )}%`,
                                                dataKey === "actual"
                                                    ? "Actual"
                                                    : "Planned",
                                            ];
                                        }}
                                        labelFormatter={(label) =>
                                            label
                                        }
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
                    ))}
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
    const xAxisLabel =
        filters.station && !filters.category
            ? "Activity Name"
            : "Activity Name";
    const chartTitle =
        filters.station && !filters.category
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
