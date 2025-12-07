"use client";

import { useData } from "@/contexts/DataContext";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function DateRangeFilter() {
    const { data, filters, updateFilters } = useData();
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        if (filters.dateRange) {
            setStartDate(format(filters.dateRange[0], "yyyy-MM-dd"));
            setEndDate(format(filters.dateRange[1], "yyyy-MM-dd"));
        }
    }, [filters.dateRange]);

    const handleStartDateChange = (e) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        setStartDate(e.target.value);
        if (date && endDate) {
            updateFilters({
                dateRange: [date, new Date(endDate)],
            });
        } else if (!date && !endDate) {
            updateFilters({ dateRange: null });
        }
    };

    const handleEndDateChange = (e) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        setEndDate(e.target.value);
        if (date && startDate) {
            updateFilters({
                dateRange: [new Date(startDate), date],
            });
        } else if (!date && !startDate) {
            updateFilters({ dateRange: null });
        }
    };

    const clearFilter = () => {
        setStartDate("");
        setEndDate("");
        updateFilters({ dateRange: null });
    };

    // Get min/max dates from data (using Finish date)
    const dateRange = data
        .map((item) => {
            const finishDate =
                item.Finish || item.finish || item.date;
            if (!finishDate) return null;
            try {
                return new Date(finishDate);
            } catch {
                return null;
            }
        })
        .filter(Boolean)
        .sort((a, b) => a - b);

    const minDate = dateRange[0]
        ? format(dateRange[0], "yyyy-MM-dd")
        : "";
    const maxDate = dateRange[dateRange.length - 1]
        ? format(dateRange[dateRange.length - 1], "yyyy-MM-dd")
        : "";

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                <div className="flex-1">
                    <label
                        htmlFor="start-date"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Start Date
                    </label>
                    <input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={handleStartDateChange}
                        min={minDate}
                        max={maxDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1">
                    <label
                        htmlFor="end-date"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        End Date
                    </label>
                    <input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={handleEndDateChange}
                        min={minDate}
                        max={maxDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {(startDate || endDate) && (
                    <button
                        onClick={clearFilter}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
                        aria-label="Clear date filter"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}
