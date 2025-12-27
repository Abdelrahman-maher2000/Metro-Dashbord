"use client";

import { create } from "zustand";

const initialFilters = {
    dateRange: null,
    station: null,
    status: null,
    category: null,
    search: "",
};

function normalizeActivity(doc) {
    return {
        id: doc.id,
        Category: doc.Category || "",
        "Activity Name":
            doc["Activity Name"] ||
            doc.ActivityName ||
            doc.activityName ||
            "",
        Actual:
            typeof doc.Actual === "string"
                ? doc.Actual
                : `${doc.Actual || 0}%`,
        Planned:
            typeof doc.Planned === "string"
                ? doc.Planned
                : `${doc.Planned || 0}%`,
        Finish: doc.Finish || null,
        Start: doc.Start || null,
        OriginalDuration: doc.OriginalDuration || null,
    };
}

export const useDataStore = create((set, get) => ({
    data: [],
    loading: true,
    error: null,
    filters: initialFilters,

    setData: (docs) => set(() => ({ data: docs })),
    setLoading: (loading) => set(() => ({ loading })),
    setError: (error) => set(() => ({ error })),
    setFilters: (next) =>
        set((state) => ({ filters: { ...state.filters, ...next } })),
    resetFilters: () => set(() => ({ filters: initialFilters })),
}));

export const selectData = (state) => state.data;
export const selectLoading = (state) => state.loading;
export const selectError = (state) => state.error;
export const selectFilters = (state) => state.filters;
export const selectSetFilters = (state) => state.setFilters;
export const selectResetFilters = (state) => state.resetFilters;

function createMemoizedSelector(selector) {
    let lastArgs = null;
    let lastResult = null;
    return (state) => {
        const args = [state.data, state.filters];
        if (
            lastArgs &&
            lastArgs[0] === args[0] &&
            lastArgs[1] === args[1]
        ) {
            return lastResult;
        }
        lastArgs = args;
        lastResult = selector(state);
        return lastResult;
    };
}

function computeFilteredData(state) {
    const { data, filters } = state;
    let filtered = [...data];

    if (filters.dateRange) {
        const [start, end] = filters.dateRange;
        filtered = filtered.filter((item) => {
            if (!item.Finish) return false;
            const d = new Date(item.Finish);
            return d >= start && d <= end;
        });
    }

    if (filters.station) {
        filtered = filtered.filter(
            (item) => item.Category === filters.station
        );
    }

    if (filters.status) {
        filtered = filtered.filter((item) => {
            const actual = parseFloat(item.Actual.replace("%", ""));
            const planned = parseFloat(item.Planned.replace("%", ""));

            let status = "on schedule";
            if (actual >= 100) status = "completed";
            else if (actual < planned * 0.9) status = "delayed";

            return status === filters.status;
        });
    }

    if (filters.category) {
        filtered = filtered.filter(
            (item) => item["Activity Name"] === filters.category
        );
    }

    if (filters.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(s)
            )
        );
    }

    return filtered;
}

const memoizedFilteredData = createMemoizedSelector((state) =>
    computeFilteredData({ data: state.data, filters: state.filters })
);

export const selectFilteredData = (state) => memoizedFilteredData(state);

const memoizedKPIs = createMemoizedSelector((state) => {
    const filteredData = memoizedFilteredData(state);
    const totalActivities = filteredData.length;

    const totalActual = filteredData.reduce(
        (sum, item) => sum + parseFloat(item.Actual.replace("%", "")),
        0
    );

    const avgProgress =
        totalActivities > 0 ? totalActual / totalActivities : 0;

    const completedActivities = filteredData.filter(
        (item) => parseFloat(item.Actual.replace("%", "")) >= 100
    ).length;

    const onScheduleActivities = filteredData.filter((item) => {
        const actual = parseFloat(item.Actual.replace("%", ""));
        const planned = parseFloat(item.Planned.replace("%", ""));
        return actual >= planned * 0.9 && actual < 100;
    }).length;

    return {
        totalActivities,
        avgProgress,
        completedActivities,
        onScheduleActivities,
    };
});

export const selectKPIs = (state) => memoizedKPIs(state);

export const selectLastUpdated = (state) => {
    if (!state.data.length) return null;
    return state.data
        .map((item) => item.Finish && new Date(item.Finish))
        .filter(Boolean)
        .sort((a, b) => b - a)[0];
};

const memoizedStations = createMemoizedSelector((state) => {
    const filteredData = memoizedFilteredData(state);
    const map = new Map();

    [...filteredData]
        .sort((a, b) => new Date(b.Finish) - new Date(a.Finish))
        .forEach((item) => {
            const key = item.Category;
            const actual = parseFloat(item.Actual.replace("%", ""));
            const planned = parseFloat(item.Planned.replace("%", ""));

            if (!map.has(key)) {
                map.set(key, {
                    name: key,
                    activitiesCount: 1,
                    totalActual: actual,
                    totalPlanned: planned,
                    progress: actual,
                });
            } else {
                const s = map.get(key);
                s.activitiesCount += 1;
                s.totalActual += actual;
                s.totalPlanned += planned;
            }
        });

    return Array.from(map.values()).map((s) => ({
        stationId: s.name,
        stationName: s.name,
        progress: s.progress,
        activitiesCount: s.activitiesCount,
        avgActual: s.totalActual / s.activitiesCount,
        avgPlanned: s.totalPlanned / s.activitiesCount,
    }));
});

export const selectStations = (state) => memoizedStations(state);

export { normalizeActivity };

