"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    useDataStore,
    selectFilteredData,
} from "@/stores/useDataStore";
import { useMemo } from "react";

export default function IncidentsBarChart() {
    const filteredData = useDataStore(selectFilteredData);

    const chartData = useMemo(() => {
        const stationIncidents = {};
        filteredData.forEach((item) => {
            const station =
                item.stationName || item.stationId || "Unknown";
            stationIncidents[station] =
                (stationIncidents[station] || 0) +
                (Number(item.incidents) || 0);
        });

        return Object.entries(stationIncidents)
            .map(([station, incidents]) => ({
                station:
                    station.length > 20
                        ? station.substring(0, 20) + "..."
                        : station,
                incidents,
            }))
            .sort((a, b) => b.incidents - a.incidents)
            .slice(0, 10); // Top 10 stations
    }, [filteredData]);

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Incidents by Station
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
                Incidents by Station (Top 10)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        type="number"
                        tick={{ fill: "currentColor" }}
                        style={{ color: "var(--foreground)" }}
                    />
                    <YAxis
                        type="category"
                        dataKey="station"
                        width={150}
                        tick={{ fill: "currentColor", fontSize: 12 }}
                        style={{ color: "var(--foreground)" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--foreground)",
                            borderRadius: "8px",
                        }}
                    />
                    <Bar dataKey="incidents" fill="#ef4444" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
