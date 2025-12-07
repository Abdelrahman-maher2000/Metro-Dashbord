"use client";

import Header from "@/components/Layout/Header";
import FilterBar from "@/components/Filters/FilterBar";
import BudgetStackedBar from "@/components/Charts/BudgetStackedBar";
import StatusPieChart from "@/components/Charts/StatusPieChart";
import DataTable from "@/components/Table/DataTable";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#10b981"]; // Blue for Planned, Green for Actual

export default function Dashboard() {
    const { loading, error, filteredData, filters } = useData();

    // Group charts by station when All Stations is selected
    const stationGroups = useMemo(() => {
        if (!filters.station) {
            const stationMap = new Map();

            filteredData.forEach((item) => {
                const station =
                    item.Category || item.category || "Unknown";
                const activityName =
                    item["Activity Name"] ||
                    item.activityName ||
                    "Unknown";

                if (!stationMap.has(station)) {
                    stationMap.set(station, {
                        name: station,
                        activities: new Map(),
                    });
                }

                const activityMap =
                    stationMap.get(station).activities;
                if (!activityMap.has(activityName)) {
                    activityMap.set(activityName, {
                        name: activityName,
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

            const groups = [];
            stationMap.forEach((stationData) => {
                const activities = [];
                stationData.activities.forEach(
                    (data, activityName) => {
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
                            name: activityName,
                            fullName: activityName,
                            actual: avgActual,
                            planned: avgPlanned,
                            pieData: [
                                {
                                    name: "Planned",
                                    value: avgPlanned,
                                },
                                { name: "Actual", value: avgActual },
                            ],
                        });
                    }
                );

                groups.push({
                    station: stationData.name,
                    activities: activities.sort((a, b) =>
                        a.name.localeCompare(b.name)
                    ),
                });
            });

            // Custom sort: Companies first, then St No.01, then Open Air, then rest alphabetically
            return groups.sort((a, b) => {
                // Companies always comes first
                if (a.station === "Companies") return -1;
                if (b.station === "Companies") return 1;

                // St No.01 - Hadaek El Ashgar Station comes after Companies
                if (
                    a.station ===
                    "St No.01 - Hadaek El Ashgar Station"
                )
                    return -1;
                if (
                    b.station ===
                    "St No.01 - Hadaek El Ashgar Station"
                )
                    return 1;

                // Open Air comes right after St No.01
                if (a.station === "Open Air") return -1;
                if (b.station === "Open Air") return 1;

                // For other stations with numbers (St No.02, St No.03, etc.), sort numerically
                const stationMatchA =
                    a.station.match(/^St No\.(\d+)/);
                const stationMatchB =
                    b.station.match(/^St No\.(\d+)/);
                if (stationMatchA && stationMatchB) {
                    return (
                        parseInt(stationMatchA[1]) -
                        parseInt(stationMatchB[1])
                    );
                }

                // Default alphabetical sort for everything else
                return a.station.localeCompare(b.station);
            });
        }
        return [];
    }, [filteredData, filters.station]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">
                        Error loading data: {error}
                    </p>
                    <p className="text-gray-600">
                        Please ensure data.json exists in the public
                        folder
                    </p>
                </div>
            </div>
        );
    }

    // When All Stations is selected, show grouped charts
    if (!filters.station && stationGroups.length > 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="p-4 lg:p-8">
                    <FilterBar />
                    <div className="space-y-8 mb-6">
                        {stationGroups.map((group) => (
                            <div
                                key={group.station}
                                className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
                            >
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                    {group.station}
                                </h2>

                                {/* Pie Charts Section */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Planned vs Actual by Activity
                                        Name
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                        {group.activities.map(
                                            (activity) => {
                                                const plannedValue =
                                                    activity.pieData.find(
                                                        (d) =>
                                                            d.name ===
                                                            "Planned"
                                                    )?.value || 0;
                                                const actualValue =
                                                    activity.pieData.find(
                                                        (d) =>
                                                            d.name ===
                                                            "Actual"
                                                    )?.value || 0;

                                                return (
                                                    <div
                                                        key={
                                                            activity.name
                                                        }
                                                        className="flex flex-col items-center bg-cyan-100 rounded-xl p-4 border border-gray-200"
                                                    >
                                                        <h5 className="text-xs font-semibold text-gray-900 mb-3 text-center">
                                                            {
                                                                activity.name
                                                            }
                                                        </h5>
                                                        <ResponsiveContainer
                                                            width="100%"
                                                            height={
                                                                180
                                                            }
                                                        >
                                                            <PieChart>
                                                                <Pie
                                                                    data={
                                                                        activity.pieData
                                                                    }
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    labelLine={
                                                                        true
                                                                    }
                                                                    label={({
                                                                        value,
                                                                        percent,
                                                                    }) => {
                                                                        if (
                                                                            percent <
                                                                            0.05
                                                                        )
                                                                            return null;
                                                                        return `${value.toFixed(
                                                                            1
                                                                        )}%`;
                                                                    }}
                                                                    outerRadius={
                                                                        60
                                                                    }
                                                                    innerRadius={
                                                                        35
                                                                    }
                                                                    fill="#8884d8"
                                                                    dataKey="value"
                                                                    paddingAngle={
                                                                        2
                                                                    }
                                                                >
                                                                    {activity.pieData.map(
                                                                        (
                                                                            entry,
                                                                            index
                                                                        ) => (
                                                                            <Cell
                                                                                key={`cell-${index}`}
                                                                                fill={
                                                                                    COLORS[
                                                                                        index %
                                                                                            COLORS.length
                                                                                    ]
                                                                                }
                                                                                stroke="#fff"
                                                                                strokeWidth={
                                                                                    2
                                                                                }
                                                                            />
                                                                        )
                                                                    )}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{
                                                                        backgroundColor:
                                                                            "#ffffff",
                                                                        border: "1px solid #e5e7eb",
                                                                        borderRadius:
                                                                            "8px",
                                                                        boxShadow:
                                                                            "0 4px 6px rgba(0, 0, 0, 0.1)",
                                                                    }}
                                                                    formatter={(
                                                                        value,
                                                                        name,
                                                                        props
                                                                    ) => [
                                                                        `${value.toFixed(
                                                                            1
                                                                        )}%`,
                                                                        props
                                                                            .payload
                                                                            .name ===
                                                                        "Planned"
                                                                            ? "Planned"
                                                                            : "Actual",
                                                                    ]}
                                                                />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                        <div className="mt-2 w-full space-y-1 text-xs">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">
                                                                    Planned:
                                                                </span>
                                                                <span className="font-semibold text-blue-600">
                                                                    {plannedValue.toFixed(
                                                                        1
                                                                    )}
                                                                    %
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">
                                                                    Actual:
                                                                </span>
                                                                <span className="font-semibold text-green-600">
                                                                    {actualValue.toFixed(
                                                                        1
                                                                    )}
                                                                    %
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>

                                {/* Bar Chart Section */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Actual vs Planned by Activity
                                        Name
                                    </h3>
                                    <ResponsiveContainer
                                        width="100%"
                                        height={350}
                                    >
                                        <BarChart
                                            data={group.activities}
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
                                                    position:
                                                        "insideBottom",
                                                    offset: -5,
                                                    style: {
                                                        textAnchor:
                                                            "middle",
                                                        fill: "#374151",
                                                    },
                                                }}
                                            />
                                            <YAxis
                                                tick={{
                                                    fill: "#374151",
                                                }}
                                                domain={[0, 100]}
                                                label={{
                                                    value: "Progress %",
                                                    angle: -90,
                                                    position:
                                                        "insideLeft",
                                                }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor:
                                                        "#ffffff",
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius:
                                                        "8px",
                                                    boxShadow:
                                                        "0 4px 6px rgba(0, 0, 0, 0.1)",
                                                }}
                                                formatter={(
                                                    value,
                                                    name,
                                                    props
                                                ) => {
                                                    const dataKey =
                                                        props.dataKey ||
                                                        name;
                                                    return [
                                                        `${value.toFixed(
                                                            1
                                                        )}%`,
                                                        dataKey ===
                                                        "actual"
                                                            ? "Actual"
                                                            : "Planned",
                                                    ];
                                                }}
                                                labelFormatter={(
                                                    label
                                                ) => label}
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
                            </div>
                        ))}
                    </div>
                    <DataTable />
                </main>
            </div>
        );
    }

    // Default view when a station is selected
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="p-4 lg:p-8">
                <FilterBar />
                <div className="mb-6">
                    <StatusPieChart />
                </div>
                <div className="mb-6">
                    <BudgetStackedBar />
                </div>
                <DataTable />
            </main>
        </div>
    );
}
