"use client";

import { useData } from "@/contexts/DataContext";
import { useMemo } from "react";

export default function FilterBar() {
    const { data, filters, updateFilters } = useData();

    const uniqueStations = useMemo(() => {
        const stations = new Set();
        data.forEach((item) => {
            if (item.Category) stations.add(item.Category);
            if (item.category) stations.add(item.category);
        });
        // Always include "Open Air" in the stations filter (matching data format)
        stations.add("Open Air");
        // Remove "Companies" from the filter
        stations.delete("Companies");

        // Custom sort: St No.01 first, then Open Air, then rest alphabetically
        return Array.from(stations).sort((a, b) => {
            // St No.01 - Hadaek El Ashgar Station always comes first
            if (a === "St No.01 - Hadaek El Ashgar Station")
                return -1;
            if (b === "St No.01 - Hadaek El Ashgar Station") return 1;

            // Open Air comes right after St No.01
            if (a === "Open Air") return -1;
            if (b === "Open Air") return 1;

            // For other stations with numbers (St No.02, St No.03, etc.), sort numerically
            const stationMatchA = a.match(/^St No\.(\d+)/);
            const stationMatchB = b.match(/^St No\.(\d+)/);
            if (stationMatchA && stationMatchB) {
                return (
                    parseInt(stationMatchA[1]) -
                    parseInt(stationMatchB[1])
                );
            }

            // Default alphabetical sort for everything else
            return a.localeCompare(b);
        });
    }, [data]);

    const uniqueCategories = useMemo(() => {
        // Only show specific Activity Names in the specified order
        const allowedActivities = [
            "Civil",
            "Esc.& Ele",
            "Electrical",
            "Arch.",
            "Mechanical",
        ];
        const categories = new Set();
        data.forEach((item) => {
            const activity =
                item["Activity Name"] || item.activityName;
            if (activity && allowedActivities.includes(activity)) {
                categories.add(activity);
            }
        });
        // Return in the specified order, only including activities that exist in data
        return allowedActivities.filter((act) => categories.has(act));
    }, [data]);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {uniqueStations.length > 0 && (
                    <div>
                        <label
                            htmlFor="station-filter"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Station
                        </label>
                        <select
                            id="station-filter"
                            value={filters.station || ""}
                            onChange={(e) =>
                                updateFilters({
                                    station: e.target.value || null,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="">All Stations</option>
                            {uniqueStations.map((station) => (
                                <option key={station} value={station}>
                                    {station}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {uniqueCategories.length > 0 && (
                    <div>
                        <label
                            htmlFor="category-filter"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            Activity Name
                        </label>
                        <select
                            id="category-filter"
                            value={filters.category || ""}
                            onChange={(e) =>
                                updateFilters({
                                    category: e.target.value || null,
                                })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="">All Activities</option>
                            {uniqueCategories.map((category) => (
                                <option
                                    key={category}
                                    value={category}
                                >
                                    {category}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            {(filters.station || filters.category) && (
                <div className="mt-4">
                    <button
                        onClick={() => {
                            updateFilters({
                                station: null,
                                category: null,
                            });
                        }}
                        className="text-sm text-blue-600 hover:underline cursor-pointer"
                    >
                        Clear all filters
                    </button>
                </div>
            )}
        </div>
    );
}
