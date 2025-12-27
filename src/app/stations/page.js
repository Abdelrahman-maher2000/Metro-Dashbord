"use client";

import {
    useDataStore,
    selectData,
    selectSetFilters,
} from "@/stores/useDataStore";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { MapPin } from "lucide-react";

export default function StationsPage() {
    const data = useDataStore(selectData);
    const updateFilters = useDataStore(selectSetFilters);
    const router = useRouter();

    // Group data by Category, then by Activity Name (using all data, not filtered)
    const categoryData = useMemo(() => {
        const categoryMap = new Map();

        data.forEach((item) => {
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

            activityMap.get(activityName).actual.push(actual);
            activityMap.get(activityName).planned.push(planned);
        });

        // Convert to array format
        const result = [];
        categoryMap.forEach((activityMap, category) => {
            const activities = [];
            activityMap.forEach((values, activityName) => {
                const avgActual =
                    values.actual.length > 0
                        ? values.actual.reduce(
                              (sum, val) => sum + val,
                              0
                          ) / values.actual.length
                        : 0;
                const avgPlanned =
                    values.planned.length > 0
                        ? values.planned.reduce(
                              (sum, val) => sum + val,
                              0
                          ) / values.planned.length
                        : 0;

                activities.push({
                    activityName,
                    planned: avgPlanned,
                    actual: avgActual,
                });
            });

            // Sort activities by name
            activities.sort((a, b) =>
                a.activityName.localeCompare(b.activityName)
            );

            result.push({
                category,
                activities,
            });
        });

        // Custom sort: Companies first, then St No.01, then Open-Air section, then rest
        return result.sort((a, b) => {
            const categoryA = a.category;
            const categoryB = b.category;

            // Companies always comes first
            if (categoryA === "Companies") return -1;
            if (categoryB === "Companies") return 1;

            // St No.01 - Hadaek El Ashgar Station comes after Companies
            if (categoryA === "St No.01 - Hadaek El Ashgar Station")
                return -1;
            if (categoryB === "St No.01 - Hadaek El Ashgar Station")
                return 1;

            // Open-Air section comes right after St No.01
            if (categoryA === "Open-Air section") return -1;
            if (categoryB === "Open-Air section") return 1;

            // Vertical Shaft comes right after Open-Air section
            if (categoryA === "Vertical Shaft") return -1;
            if (categoryB === "Vertical Shaft") return 1;

            // For other stations with numbers (St No.02, St No.03, etc.), sort numerically
            const stationMatchA = categoryA.match(/^St No\.(\d+)/);
            const stationMatchB = categoryB.match(/^St No\.(\d+)/);
            if (stationMatchA && stationMatchB) {
                return (
                    parseInt(stationMatchA[1]) -
                    parseInt(stationMatchB[1])
                );
            }

            // Default alphabetical sort for everything else
            return categoryA.localeCompare(categoryB);
        });
    }, [data]);

    const handleCategoryClick = (categoryName) => {
        updateFilters({ station: categoryName });
        router.push("/");
    };

    if (categoryData.length === 0) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-6 text-gray-900">
                    Stations & Segments
                </h1>
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-900">
                Stations & Segments
            </h1>
            <div className="space-y-6">
                {categoryData.map((category, categoryIndex) => (
                    <div
                        key={category.category || categoryIndex}
                        className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin
                                    className="text-blue-600"
                                    size={24}
                                />
                                {category.category}
                            </h2>
                            <button
                                onClick={() =>
                                    handleCategoryClick(
                                        category.category
                                    )
                                }
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                            >
                                View on Dashboard →
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {category.activities.map(
                                (activity, activityIndex) => (
                                    <div
                                        key={
                                            activity.activityName ||
                                            activityIndex
                                        }
                                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                    >
                                        <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                            {activity.activityName}
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-600">
                                                    Planned:
                                                </span>
                                                <span className="text-sm font-semibold text-blue-600">
                                                    {activity.planned.toFixed(
                                                        1
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-600">
                                                    Actual:
                                                </span>
                                                <span className="text-sm font-semibold text-green-600">
                                                    {activity.actual.toFixed(
                                                        1
                                                    )}
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
