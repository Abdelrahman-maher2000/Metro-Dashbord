"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const palette = [
    "#6366F1",
    "#22C55E",
    "#F97316",
    "#06B6D4",
    "#A855F7",
    "#EF4444",
    "#14B8A6",
    "#EAB308",
    "#3B82F6",
    "#EC4899",
];

const newId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

const STORAGE_KEY = "create-your-own-charts";

export default function CreateYourOwnChartsClient() {
    const [chartType, setChartType] = useState("pie"); // "pie" | "histogram"
    const [histMode, setHistMode] = useState("single"); // "single" | "comparative"
    const [chartTitle, setChartTitle] = useState("My Chart");
    const [rows, setRows] = useState([
        { id: newId(), label: "A", value1: "40", value2: "20" },
        { id: newId(), label: "B", value1: "25", value2: "35" },
    ]);
    const [charts, setCharts] = useState(() => {
        if (typeof window === "undefined") return [];
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (!saved) return [];
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];
            return parsed.map((c) => ({
                ...c,
                id: c.id || newId(),
                title: c.title || "Untitled Chart",
                type: c.type === "histogram" ? "histogram" : "pie",
                histMode:
                    c.histMode === "comparative"
                        ? "comparative"
                        : "single",
                data: Array.isArray(c.data) ? c.data : [],
                createdAt: c.createdAt || Date.now(),
            }));
        } catch (err) {
            console.error("Failed to load saved charts", err);
            return [];
        }
    });
    const [editingId, setEditingId] = useState(null);

    // Persist charts whenever they change
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(charts)
            );
        } catch (err) {
            console.error("Failed to save charts", err);
        }
    }, [charts]);

    const parsedData = useMemo(() => {
        return rows
            .map((row) => ({
                label: row.label.trim(),
                value1: Number(row.value1),
                value2:
                    histMode === "comparative"
                        ? Number(row.value2)
                        : undefined,
            }))
            .filter(
                (item) =>
                    item.label &&
                    !Number.isNaN(item.value1) &&
                    (histMode !== "comparative" ||
                        !Number.isNaN(item.value2))
            );
    }, [rows, histMode]);

    const hasData = parsedData.length > 0;

    const addRow = () =>
        setRows((prev) => [
            ...prev,
            { id: newId(), label: "", value1: "", value2: "" },
        ]);

    const updateRow = (id, key, value) =>
        setRows((prev) =>
            prev.map((row) =>
                row.id === id ? { ...row, [key]: value } : row
            )
        );

    const removeRow = (id) =>
        setRows((prev) => prev.filter((row) => row.id !== id));

    const addChart = () => {
        if (!hasData) return;
        const title = chartTitle.trim() || "Untitled Chart";
        if (editingId) {
            setCharts((prev) =>
                prev.map((c) =>
                    c.id === editingId
                        ? {
                              ...c,
                              title,
                              type: chartType,
                              histMode,
                              data: parsedData,
                          }
                        : c
                )
            );
            setEditingId(null);
        } else {
            setCharts((prev) => [
                ...prev,
                {
                    id: newId(),
                    title,
                    type: chartType,
                    histMode,
                    data: parsedData,
                    createdAt: Date.now(),
                },
            ]);
        }
    };

    const removeChart = (id) =>
        setCharts((prev) => prev.filter((chart) => chart.id !== id));

    const startEditChart = (id) => {
        const chart = charts.find((c) => c.id === id);
        if (!chart) return;
        setEditingId(chart.id);
        setChartType(
            chart.type === "histogram" ? "histogram" : "pie"
        );
        setHistMode(
            chart.histMode === "comparative"
                ? "comparative"
                : "single"
        );
        setChartTitle(chart.title || "Untitled Chart");
        setRows(
            (chart.data || []).map((d) => ({
                id: newId(),
                label: d.label ?? "",
                value1:
                    d.value1 !== undefined && d.value1 !== null
                        ? String(d.value1)
                        : "",
                value2:
                    d.value2 !== undefined && d.value2 !== null
                        ? String(d.value2)
                        : "",
            }))
        );
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const handlePrint = () => window.print();

    const renderChart = (item) => {
        if (!item || !item.data.length) {
            return (
                <div className="text-sm text-slate-500">
                    Add labels and numeric values to see a live
                    preview.
                </div>
            );
        }

        return (
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    {item.type === "pie" ? (
                        <PieChart>
                            <Pie
                                data={item.data}
                                dataKey="value1"
                                nameKey="label"
                                cx="50%"
                                cy="50%"
                                outerRadius="70%"
                                label
                            >
                                {item.data.map((entry, idx) => (
                                    <Cell
                                        key={entry.label || idx}
                                        fill={
                                            palette[
                                                idx % palette.length
                                            ]
                                        }
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    ) : (
                        <BarChart data={item.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="value1"
                                fill={palette[0]}
                                name={
                                    item.histMode === "single"
                                        ? "Value"
                                        : "Series A"
                                }
                            />
                            {item.histMode === "comparative" && (
                                <Bar
                                    dataKey="value2"
                                    fill={palette[1]}
                                    name="Series B"
                                />
                            )}
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">
                            Create Your Own Charts
                        </h1>
                        <p className="text-sm text-slate-500">
                            Build pie or bar charts, add multiple
                            datasets, then print them.
                        </p>
                    </div>
                    <button
                        onClick={handlePrint}
                        className=" inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                    >
                        Print All Charts
                    </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:border-0 print:shadow-none">
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="w-full space-y-4 lg:w-1/2 print:hidden">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    Chart Title
                                </label>
                                <input
                                    value={chartTitle}
                                    onChange={(e) =>
                                        setChartTitle(e.target.value)
                                    }
                                    placeholder="e.g. Sales by Region"
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">
                                    Chart Type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {["pie", "histogram"].map(
                                        (type) => (
                                            <button
                                                key={type}
                                                onClick={() =>
                                                    setChartType(type)
                                                }
                                                className={`rounded-md px-3 py-2 text-sm font-medium border ${
                                                    chartType === type
                                                        ? "border-slate-900 bg-slate-900 text-white"
                                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                                }`}
                                            >
                                                {type === "pie"
                                                    ? "Pie Chart"
                                                    : "Histogram (Bar)"}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            {chartType === "histogram" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">
                                        Histogram Mode
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            "single",
                                            "comparative",
                                        ].map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() =>
                                                    setHistMode(mode)
                                                }
                                                className={`rounded-md px-3 py-2 text-sm font-medium border ${
                                                    histMode === mode
                                                        ? "border-slate-900 bg-slate-900 text-white"
                                                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                                }`}
                                            >
                                                {mode === "single"
                                                    ? "Single Bar"
                                                    : "Comparative Bars"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">
                                        Data Points
                                    </span>
                                    <button
                                        onClick={addRow}
                                        className="cursor-pointer  bg-cyan-300 rounded-sm p-1 text-sm font-medium text-slate-600 hover:text-slate-900"
                                    >
                                        + Add Row
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {rows.map((row) => (
                                        <div
                                            key={row.id}
                                            className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-12"
                                        >
                                            <input
                                                value={row.label}
                                                onChange={(e) =>
                                                    updateRow(
                                                        row.id,
                                                        "label",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Label"
                                                className="sm:col-span-4 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                            />
                                            <input
                                                value={row.value1}
                                                onChange={(e) =>
                                                    updateRow(
                                                        row.id,
                                                        "value1",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder={
                                                    chartType ===
                                                    "pie"
                                                        ? "Value"
                                                        : "Series A"
                                                }
                                                inputMode="decimal"
                                                className="sm:col-span-3 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                            />
                                            {chartType ===
                                                "histogram" &&
                                                histMode ===
                                                    "comparative" && (
                                                    <input
                                                        value={
                                                            row.value2
                                                        }
                                                        onChange={(
                                                            e
                                                        ) =>
                                                            updateRow(
                                                                row.id,
                                                                "value2",
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="Series B"
                                                        inputMode="decimal"
                                                        className="sm:col-span-3 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                                                    />
                                                )}
                                            <div className="sm:col-span-2 flex justify-end">
                                                <button
                                                    onClick={() =>
                                                        removeRow(
                                                            row.id
                                                        )
                                                    }
                                                    className=" cursor-pointer rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-red-200 hover:text-red-600"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={addChart}
                                            disabled={!hasData}
                                            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                                                hasData
                                                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                                    : "cursor-not-allowed bg-slate-200 text-slate-500"
                                            }`}
                                        >
                                            {editingId
                                                ? "Save Changes"
                                                : "Add Chart"}
                                        </button>
                                        {editingId && (
                                            <button
                                                onClick={cancelEdit}
                                                className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border border-slate-200 text-slate-700 hover:border-slate-300"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                    <span className="text-xs text-slate-500 self-center">
                                        Values must be numeric; empty
                                        or non-numeric rows are
                                        ignored.
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full lg:w-1/2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 h-full print:hidden">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Live Preview
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {chartType === "pie"
                                            ? "Pie Chart"
                                            : histMode === "single"
                                            ? "Single Bar"
                                            : "Comparative Bars"}
                                    </span>
                                </div>
                                <div className="mb-2 text-sm font-medium text-slate-700">
                                    {chartTitle.trim() ||
                                        "Untitled Chart"}
                                </div>
                                {renderChart(
                                    hasData
                                        ? {
                                              id: "preview",
                                              title:
                                                  chartTitle.trim() ||
                                                  "Untitled Chart",
                                              type: chartType,
                                              histMode,
                                              data: parsedData,
                                              createdAt: 0,
                                          }
                                        : null
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 print:space-y-1">
                    <div className="flex items-center justify-between print:hidden">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Your Charts
                        </h2>
                        <span className="text-sm text-slate-500 print:hidden">
                            {charts.length} total
                        </span>
                    </div>

                    {charts.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-slate-500">
                            No charts yet. Add some data and click
                            “Add Chart”.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {charts.map((chart) => (
                                <div
                                    key={chart.id}
                                    className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid"
                                >
                                    <div className="flex items-center justify-between pb-2">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {chart.title ||
                                                    "Untitled Chart"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {chart.type === "pie"
                                                    ? "Pie Chart"
                                                    : chart.histMode ===
                                                      "single"
                                                    ? "Histogram"
                                                    : "Comparative Histogram"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    startEditChart(
                                                        chart.id
                                                    )
                                                }
                                                className="print:hidden rounded-md border border-indigo-200 px-3 py-1 text-xs text-indigo-600 opacity-0 transition group-hover:opacity-100 hover:border-indigo-300 hover:text-indigo-700"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() =>
                                                    removeChart(
                                                        chart.id
                                                    )
                                                }
                                                className="print:hidden rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-600 opacity-0 transition group-hover:opacity-100 hover:border-red-200 hover:text-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                    {renderChart(chart)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
