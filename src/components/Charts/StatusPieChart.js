"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from "recharts";
import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";

const COLORS = ["#3b82f6", "#10b981"]; // Blue for Planned, Green for Actual

export default function StatusPieChart() {
    const { filteredData, filters } = useData();

    const activityCharts = useMemo(() => {
        // When All Stations AND All Activities are selected, show charts grouped by Station, then by Activity Name
        if (!filters.station && !filters.category) {
            const stationMap = new Map();

            filteredData.forEach((item) => {
                const station =
                    item.Category || item.category || "Unknown";
                const activityName =
                    item["Activity Name"] ||
                    item.activityName ||
                    "Unknown";

                if (!stationMap.has(station)) {
                    stationMap.set(station, new Map());
                }

                const activityMap = stationMap.get(station);
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

            const allCharts = [];
            stationMap.forEach((activityMap, station) => {
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

                    allCharts.push({
                        activityName: `${station} - ${activityName}`,
                        station: station,
                        activity: activityName,
                        data: [
                            { name: "Planned", value: avgPlanned },
                            { name: "Actual", value: avgActual },
                        ],
                    });
                });
            });

            return allCharts.sort((a, b) => {
                const stationCompare = a.station.localeCompare(
                    b.station
                );
                if (stationCompare !== 0) return stationCompare;
                return a.activity.localeCompare(b.activity);
            });
        }

        // When All Stations is selected (but activity is selected), show one chart per Category
        if (!filters.station) {
            const categoryMap = new Map();

            filteredData.forEach((item) => {
                const category =
                    item.Category || item.category || "Unknown";
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

                if (!categoryMap.has(category)) {
                    categoryMap.set(category, {
                        actual: [],
                        planned: [],
                    });
                }

                categoryMap.get(category).actual.push(actual);
                categoryMap.get(category).planned.push(planned);
            });

            const charts = [];
            categoryMap.forEach((data, category) => {
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

                charts.push({
                    activityName: category,
                    data: [
                        { name: "Planned", value: avgPlanned },
                        { name: "Actual", value: avgActual },
                    ],
                });
            });

            return charts.sort((a, b) =>
                a.activityName.localeCompare(b.activityName)
            );
        }

        // When a specific station is selected and no category filter, show one chart per Activity Name
        if (filters.station && !filters.category) {
            const activityMap = new Map();

            filteredData.forEach((item) => {
                const activityName =
                    item["Activity Name"] ||
                    item.activityName ||
                    "Unknown";
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

                if (!activityMap.has(activityName)) {
                    activityMap.set(activityName, {
                        actual: [],
                        planned: [],
                    });
                }

                activityMap.get(activityName).actual.push(actual);
                activityMap.get(activityName).planned.push(planned);
            });

            const charts = [];
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

                charts.push({
                    activityName,
                    data: [
                        { name: "Planned", value: avgPlanned },
                        { name: "Actual", value: avgActual },
                    ],
                });
            });

            // Sort by activity name
            return charts.sort((a, b) =>
                a.activityName.localeCompare(b.activityName)
            );
        }

        // Single chart - calculate overall average for selected station and activity
        let totalActual = 0;
        let totalPlanned = 0;
        let count = 0;

        filteredData.forEach((item) => {
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
            totalActual += actual;
            totalPlanned += planned;
            count++;
        });

        const avgActual = count > 0 ? totalActual / count : 0;
        const avgPlanned = count > 0 ? totalPlanned / count : 0;

        return [
            {
                activityName: "Overall",
                data: [
                    { name: "Planned", value: avgPlanned },
                    { name: "Actual", value: avgActual },
                ],
            },
        ];
    }, [filteredData, filters.station, filters.category]);

    if (activityCharts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Planned vs Actual
                </h3>
                <p className="text-gray-500 text-center py-8">
                    No data available
                </p>
            </div>
        );
    }

    // Show multiple charts when: (All Stations + All Activities) OR (All Stations) OR (station selected + all activities)
    const showMultipleCharts =
        (!filters.station && !filters.category) ||
        (!filters.station && filters.category) ||
        (filters.station && !filters.category);

    if (showMultipleCharts && activityCharts.length > 1) {
        // Show multiple pie charts in a grid
        const chartTitle =
            !filters.station && !filters.category
                ? "Planned vs Actual by Activity Name (All Stations)"
                : !filters.station
                ? "Planned vs Actual by Category"
                : "Planned vs Actual by Activity Name";

        // When both filters are "All", group by station
        if (!filters.station && !filters.category) {
            const stationGroups = new Map();
            activityCharts.forEach((chart) => {
                if (!stationGroups.has(chart.station)) {
                    stationGroups.set(chart.station, []);
                }
                stationGroups.get(chart.station).push(chart);
            });

            // Sort stations: Companies first, then St No.01, then Open-Air section, then rest
            const sortedStationEntries = Array.from(
                stationGroups.entries()
            ).sort((a, b) => {
                const stationA = a[0];
                const stationB = b[0];

                // Companies always comes first
                if (stationA === "Companies") return -1;
                if (stationB === "Companies") return 1;

                // St No.01 - Hadaek El Ashgar Station comes after Companies
                if (
                    stationA === "St No.01 - Hadaek El Ashgar Station"
                )
                    return -1;
                if (
                    stationB === "St No.01 - Hadaek El Ashgar Station"
                )
                    return 1;

                // Open-Air section comes right after St No.01
                if (stationA === "Open-Air section") return -1;
                if (stationB === "Open-Air section") return 1;

                // Vertical Shaft comes right after Open-Air section
                if (stationA === "Vertical Shaft") return -1;
                if (stationB === "Vertical Shaft") return 1;

                // For other stations with numbers (St No.02, St No.03, etc.), sort numerically
                const stationMatchA = stationA.match(/^St No\.(\d+)/);
                const stationMatchB = stationB.match(/^St No\.(\d+)/);
                if (stationMatchA && stationMatchB) {
                    return (
                        parseInt(stationMatchA[1]) -
                        parseInt(stationMatchB[1])
                    );
                }

                // Default alphabetical sort for everything else
                return stationA.localeCompare(stationB);
            });

            return (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                        {chartTitle}
                    </h3>
                    {sortedStationEntries.map(([station, charts]) => (
                        <div key={station} className="mb-8">
                            <h4 className="text-base font-semibold text-gray-900 mb-4">
                                {station}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                {charts.map((chart) => {
                                    const plannedValue =
                                        chart.data.find(
                                            (d) =>
                                                d.name === "Planned"
                                        )?.value || 0;
                                    const actualValue =
                                        chart.data.find(
                                            (d) => d.name === "Actual"
                                        )?.value || 0;

                                    return (
                                        <div
                                            key={chart.activityName}
                                            className="flex flex-col items-center bg-cyan-100 rounded-xl p-4 border border-gray-200"
                                        >
                                            <h5 className="text-xs font-semibold text-gray-900 mb-3 text-center">
                                                {chart.activity}
                                            </h5>
                                            <ResponsiveContainer
                                                width="100%"
                                                height={180}
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={
                                                            chart.data
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
                                                        {chart.data.map(
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
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    {chartTitle}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {activityCharts.map((chart) => {
                        const plannedValue =
                            chart.data.find(
                                (d) => d.name === "Planned"
                            )?.value || 0;
                        const actualValue =
                            chart.data.find(
                                (d) => d.name === "Actual"
                            )?.value || 0;

                        return (
                            <div
                                key={chart.activityName}
                                className="flex flex-col items-center bg-cyan-100 rounded-xl p-4 border border-gray-200"
                            >
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 text-center">
                                    {chart.activityName}
                                </h4>
                                <ResponsiveContainer
                                    width="100%"
                                    height={200}
                                >
                                    <PieChart>
                                        <Pie
                                            data={chart.data}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={true}
                                            label={({
                                                name,
                                                value,
                                                percent,
                                            }) => {
                                                if (percent < 0.05)
                                                    return null;
                                                return `${value.toFixed(
                                                    1
                                                )}%`;
                                            }}
                                            outerRadius={70}
                                            innerRadius={40}
                                            fill="#8884d8"
                                            dataKey="value"
                                            paddingAngle={2}
                                        >
                                            {chart.data.map(
                                                (entry, index) => (
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
                                                borderRadius: "8px",
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
                                                props.payload.name ===
                                                "Planned"
                                                    ? "Planned"
                                                    : "Actual",
                                            ]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-3 w-full space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Planned:
                                        </span>
                                        <span className="font-semibold text-blue-600">
                                            {plannedValue.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">
                                            Actual:
                                        </span>
                                        <span className="font-semibold text-green-600">
                                            {actualValue.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Single chart view
    const chartData = activityCharts[0].data;
    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Planned vs Actual
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) => {
                            // Only show label if segment is large enough
                            if (percent < 0.05) return null;
                            return `${value.toFixed(1)}%`;
                        }}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {chartData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="#fff"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value, name, props) => [
                            `${value.toFixed(1)}%`,
                            props.payload.name === "Planned"
                                ? "Planned"
                                : "Actual",
                        ]}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: "20px" }}
                        iconType="circle"
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
