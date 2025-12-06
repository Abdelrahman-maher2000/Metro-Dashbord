"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useMemo,
} from "react";

const DataContext = createContext();

export function DataProvider({ children }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        dateRange: null,
        station: null,
        status: null,
        category: null,
        search: "",
    });

    useEffect(() => {
        async function loadData() {
            try {
                const response = await fetch("/data.json");
                if (!response.ok)
                    throw new Error("Failed to load data");
                const jsonData = await response.json();
                setData(Array.isArray(jsonData) ? jsonData : []);
            } catch (err) {
                console.error("Error loading data:", err);
                setError(err.message);
                // Fallback sample data
                setData([]);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const filteredData = useMemo(() => {
        let filtered = [...data];

        if (filters.dateRange) {
            const [start, end] = filters.dateRange;
            filtered = filtered.filter((item) => {
                const itemDateStr =
                    item.Finish || item.finish || item.date;
                if (!itemDateStr) return false;
                try {
                    const itemDate = new Date(itemDateStr);
                    return itemDate >= start && itemDate <= end;
                } catch {
                    return false;
                }
            });
        }

        if (filters.station) {
            filtered = filtered.filter(
                (item) =>
                    item.Category === filters.station ||
                    item.category
                        ?.toLowerCase()
                        .includes(filters.station.toLowerCase())
            );
        }

        if (filters.status) {
            filtered = filtered.filter((item) => {
                const actual = parseFloat(
                    String(
                        item.Actual?.replace("%", "") ||
                            item.actual ||
                            0
                    )
                );
                const planned = parseFloat(
                    String(
                        item.Planned?.replace("%", "") ||
                            item.planned ||
                            0
                    )
                );
                let status = "on schedule";
                if (actual >= 100) status = "completed";
                else if (actual < planned * 0.9) status = "delayed";
                return status === filters.status;
            });
        }

        if (filters.category) {
            filtered = filtered.filter(
                (item) =>
                    (item["Activity Name"] || item.activityName) ===
                    filters.category
            );
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter((item) =>
                Object.values(item).some((val) =>
                    String(val).toLowerCase().includes(searchLower)
                )
            );
        }

        return filtered;
    }, [data, filters]);

    const kpis = useMemo(() => {
        const totalActivities = filteredData.length;
        const totalActualProgress = filteredData.reduce(
            (sum, item) =>
                sum +
                (parseFloat(
                    String(item.Actual || item.actual || "0").replace(
                        "%",
                        ""
                    )
                ) || 0),
            0
        );
        const avgProgress =
            totalActivities > 0
                ? totalActualProgress / totalActivities
                : 0;

        const completedActivities = filteredData.filter(
            (item) =>
                parseFloat(
                    String(item.Actual || item.actual || "0").replace(
                        "%",
                        ""
                    )
                ) >= 100
        ).length;

        const onScheduleActivities = filteredData.filter((item) => {
            const actual = parseFloat(
                String(item.Actual || item.actual || "0").replace(
                    "%",
                    ""
                )
            );
            const planned = parseFloat(
                String(item.Planned || item.planned || "0").replace(
                    "%",
                    ""
                )
            );
            return actual >= planned * 0.9 && actual < 100;
        }).length;

        return {
            totalActivities,
            avgProgress,
            completedActivities,
            onScheduleActivities,
        };
    }, [filteredData]);

    const lastUpdated = useMemo(() => {
        if (data.length === 0) return null;
        const dates = data
            .map((item) => {
                const dateStr =
                    item.Finish || item.finish || item.date;
                return dateStr ? new Date(dateStr) : null;
            })
            .filter(Boolean)
            .sort((a, b) => b.getTime() - a.getTime());
        return dates[0] || null;
    }, [data]);

    const stations = useMemo(() => {
        const categoryMap = new Map();
        // Sort by Finish date to get the latest progress for each category
        const sortedData = [...filteredData].sort((a, b) => {
            const dateA = a.Finish || a.finish || a.date;
            const dateB = b.Finish || b.finish || b.date;
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            return timeB - timeA; // Latest first
        });

        sortedData.forEach((item) => {
            const key =
                item.Category || item.category || "Unknown Category";
            if (!key) return;

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

            if (!categoryMap.has(key)) {
                categoryMap.set(key, {
                    name: key,
                    progress: actual,
                    activitiesCount: 1,
                    totalActual: actual,
                    totalPlanned: planned,
                });
            } else {
                const existing = categoryMap.get(key);
                existing.activitiesCount += 1;
                existing.totalActual += actual;
                existing.totalPlanned += planned;
            }
        });

        return Array.from(categoryMap.values()).map((cat) => ({
            stationId: cat.name,
            stationName: cat.name,
            progress: cat.progress,
            activitiesCount: cat.activitiesCount,
            avgActual: cat.totalActual / cat.activitiesCount,
            avgPlanned: cat.totalPlanned / cat.activitiesCount,
        }));
    }, [filteredData]);

    const updateFilters = (newFilters) => {
        setFilters((prev) => ({ ...prev, ...newFilters }));
    };

    const resetFilters = () => {
        setFilters({
            dateRange: null,
            station: null,
            status: null,
            category: null,
            search: "",
        });
    };

    return (
        <DataContext.Provider
            value={{
                data,
                filteredData,
                loading,
                error,
                filters,
                updateFilters,
                resetFilters,
                kpis,
                lastUpdated,
                stations,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within DataProvider");
    }
    return context;
}
