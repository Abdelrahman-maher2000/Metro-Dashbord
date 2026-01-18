"use client";

import Header from "@/shared/components/layout/Header";
import FilterBar from "@/components/Filters/FilterBar";
import BudgetStackedBar from "@/components/Charts/BudgetStackedBar";
import StatusPieChart from "@/components/Charts/StatusPieChart";
import DataTable from "@/components/Table/DataTable";
import {
    useDataStore,
    selectError,
    selectFilters,
    selectFilteredData,
    selectLoading,
} from "@/stores/useDataStore";
import { useMemo, useState } from "react";
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
    LabelList,
} from "recharts";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

const COLORS = ["#3b82f6", "#10b981"]; // Blue for Planned, Green for Actual

export default function Dashboard() {
    const loading = useDataStore(selectLoading);
    const filteredData = useDataStore(selectFilteredData);
    const filters = useDataStore(selectFilters);
    const error = useDataStore(selectError);

    const [height, setHeight] = useState(350);
    const [pieHeight, setPieHeight] = useState(180);
    const [fontSize, setFontSize] = useState(15);
    const [lableFontSize, setLableFontSize] = useState(16);
    const [xAxisFontSize, setXAxisFontSize] = useState(13);
    const [piecardFontsize, setPiecardFontsize] = useState(15);
    const [piecardFooterFontsize, setPiecardFooterFontsize] =
        useState(15);
    const [barSizesByStation, setBarSizesByStation] = useState({});

    function Height(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const height = formData.get("height");
        setHeight(parseInt(height));
        e.target.reset();
    }

    function PieHeight(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const height = formData.get("height");
        setPieHeight(parseInt(height));
        e.target.reset();
    }

    function FontSize(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fontsize = formData.get("fontsize");
        setFontSize(parseInt(fontsize));
        e.target.reset();
    }

    function LableFontSize(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fontsize = formData.get("fontsize");
        setLableFontSize(parseInt(fontsize));
        e.target.reset();
    }

    function XAxisFontSize(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fontsize = formData.get("fontsize");
        setXAxisFontSize(parseInt(fontsize));
        e.target.reset();
    }

    function piecardfontsize(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fontsize = formData.get("fontsize");
        setPiecardFontsize(parseInt(fontsize));
        e.target.reset();
    }
    function piecardfooterfontsize(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const fontsize = formData.get("fontsize");
        setPiecardFooterFontsize(parseInt(fontsize));
        e.target.reset();
    }

    function BarSize(e, stationKey) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const size = formData.get("barsize");
        setBarSizesByStation((prev) => ({
            ...prev,
            [stationKey]: parseInt(size),
        }));
        e.target.reset();
    }

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
                    activities: activities.sort((a, b) => {
                        // Overall activity goes first (handles "Overall" or "Over All")
                        const isOverall = (name) =>
                            name === "Overall" || name === "Over All";
                        if (isOverall(a.name)) return -1;
                        if (isOverall(b.name)) return 1;
                        return a.name.localeCompare(b.name);
                    }),
                });
            });

            // Custom sort: Over All first, then Companies, then St No.01,
            // then Open-Air section, then rest alphabetically
            return groups.sort((a, b) => {
                // Over All always comes first
                if (a.station === "Over All") return -1;
                if (b.station === "Over All") return 1;

                // Companies always comes first after Over All
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

                // Open-Air section comes right after St No.01
                if (a.station === "Open-Air section") return -1;
                if (b.station === "Open-Air section") return 1;

                // Vertical Shaft comes right after Open-Air section
                if (a.station === "Vertical Shaft") return -1;
                if (b.station === "Vertical Shaft") return 1;

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

    function login(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const email = formData.get("email");
        const password = formData.get("password");

        if (email && password) {
            signInWithEmailAndPassword(auth, email, password);
        } else {
            alert("please complete login dtat");
        }

        e.target.reset();
    }

    function reg(e) {
        e.preventDefault();
        const email = "REG@Metro4thLine.com";
        const password = "REG8O27Y7o";
        signInWithEmailAndPassword(auth, email, password);
        e.target.reset();
    }
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
                <div className="w-full max-w-lg bg-white rounded-3xl shadow-lg p-6 md:p-8 space-y-6">
                    {/* Title */}
                    <h1 className="text-2xl font-semibold text-gray-700 text-center">
                        Admin Login
                    </h1>

                    {/* Login Form */}
                    <form
                        className="grid grid-cols-1 gap-5"
                        onSubmit={login}
                    >
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-600 mb-1"
                            >
                                Email
                            </label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="admin@email.com"
                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-600 mb-1"
                            >
                                Password
                            </label>
                            <input
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-xl transition"
                        >
                            Login
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="text-sm text-gray-500">
                            OR
                        </span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                    </div>

                    {/* Regular User */}
                    <div className="text-center space-y-2">
                        <p className="text-gray-600 text-sm">
                            Login as Regular User
                        </p>
                        <button
                            onClick={reg}
                            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-xl transition"
                        >
                            Continue as Guest
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 text-center">
                            <p className="font-medium">
                                Error loading data
                            </p>
                            <p className="text-xs mt-1">{error}</p>
                            <p className="text-xs text-gray-600 mt-2">
                                Please ensure <code>data.json</code>{" "}
                                exists in the public folder
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // When All Stations is selected, show grouped charts
    if (!filters.station && stationGroups.length > 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="p-4 lg:p-8" id="dashboard-content">
                    <FilterBar />

                    <div className="space-y-6">
                        {/* Header */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Print Layout Customization
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                                Use these controls to adjust chart
                                heights and font sizes for a clean and
                                well-formatted PDF output.
                            </p>
                        </div>

                        {/* Controls Grid */}
                        <div className="pdf-hide mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Reusable Card */}
                            <form
                                onSubmit={Height}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Bar Chart Height
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current: {height}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="height"
                                        placeholder={height}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <form
                                onSubmit={PieHeight}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Pie Chart Height
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current: {pieHeight}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="height"
                                        placeholder={pieHeight}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <form
                                onSubmit={FontSize}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Pie Chart Label Font Size
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current: {fontSize}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="fontsize"
                                        placeholder={fontSize}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <form
                                onSubmit={LableFontSize}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Bar Chart Label Font Size
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current: {lableFontSize}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="fontsize"
                                        placeholder={lableFontSize}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <form
                                onSubmit={XAxisFontSize}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        X-Axis Font Size
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current: {xAxisFontSize}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="fontsize"
                                        placeholder={xAxisFontSize}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <form
                                onSubmit={piecardfontsize}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Pie Card Content Font Size
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current: {piecardFontsize}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="fontsize"
                                        placeholder={piecardFontsize}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>

                            <form
                                onSubmit={piecardfooterfontsize}
                                className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Pie Card Footer Font Size
                                    </label>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                        Current:{" "}
                                        {piecardFooterFontsize}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="fontsize"
                                        placeholder={
                                            piecardFooterFontsize
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="space-y-8 mb-6 ">
                        {stationGroups.map((group) => (
                            <div
                                key={group.station}
                                className="bg-white card rounded-xl shadow-md border border-gray-200 p-6"
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
                                                        className="flex flex-col items-center bg-cyan-100 rounded-xl p-4 border border-gray-200 pie-card"
                                                    >
                                                        <h5
                                                            className="font-semibold text-gray-900 mb-3 text-center"
                                                            style={{
                                                                fontSize:
                                                                    piecardFontsize,
                                                            }}
                                                        >
                                                            {
                                                                activity.name
                                                            }
                                                        </h5>

                                                        <ResponsiveContainer
                                                            width="100%"
                                                            height={
                                                                pieHeight
                                                            }
                                                            className="flex justify-center "
                                                        >
                                                            <PieChart>
                                                                <Pie
                                                                    data={
                                                                        activity.pieData
                                                                    }
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    // outerRadius={
                                                                    //     60
                                                                    // }
                                                                    outerRadius={
                                                                        pieHeight /
                                                                        2.2
                                                                    }
                                                                    // innerRadius={
                                                                    //     35
                                                                    // }
                                                                    innerRadius={
                                                                        (pieHeight /
                                                                            2.2) *
                                                                        0.6
                                                                    }
                                                                    dataKey="value"
                                                                    paddingAngle={
                                                                        2
                                                                    }
                                                                    fill="#8884d8"
                                                                    labelLine={
                                                                        false
                                                                    }
                                                                    // Label داخل القرص
                                                                    label={({
                                                                        cx,
                                                                        cy,
                                                                        midAngle,
                                                                        innerRadius,
                                                                        outerRadius,
                                                                        percent,
                                                                        index,
                                                                        value,
                                                                    }) => {
                                                                        const radius =
                                                                            innerRadius +
                                                                            (outerRadius -
                                                                                innerRadius) /
                                                                                2; // منتصف الحلقة
                                                                        const RADIAN =
                                                                            Math.PI /
                                                                            180;
                                                                        const x =
                                                                            cx +
                                                                            radius *
                                                                                Math.cos(
                                                                                    -midAngle *
                                                                                        RADIAN
                                                                                );
                                                                        const y =
                                                                            cy +
                                                                            radius *
                                                                                Math.sin(
                                                                                    -midAngle *
                                                                                        RADIAN
                                                                                );

                                                                        if (
                                                                            percent <
                                                                            0.05
                                                                        )
                                                                            return null; // تجاهل القطع الصغيرة

                                                                        return (
                                                                            <text
                                                                                x={
                                                                                    x
                                                                                }
                                                                                y={
                                                                                    y
                                                                                }
                                                                                fill="#fff"
                                                                                textAnchor="middle"
                                                                                dominantBaseline="central"
                                                                                fontSize={
                                                                                    fontSize
                                                                                }
                                                                                fontWeight={
                                                                                    600
                                                                                }
                                                                            >
                                                                                {`${value.toFixed(
                                                                                    1
                                                                                )}%`}
                                                                            </text>
                                                                        );
                                                                    }}
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

                                                        <div
                                                            className="mt-2 w-full space-y-1"
                                                            style={{
                                                                fontSize:
                                                                    piecardFooterFontsize,
                                                            }}
                                                        >
                                                            <div className="flex justify-center gap-20">
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
                                                            <div className="flex justify-center gap-20">
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
                                <div style={{ padding: "10px" }}>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                        Actual vs Planned by Activity
                                        Name
                                    </h3>
                                    <ResponsiveContainer
                                        width="100%"
                                        height={height}
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
                                                    fontSize:
                                                        xAxisFontSize,
                                                    fontWeight: 600,
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
                                                barSize={
                                                    barSizesByStation[
                                                        group.station
                                                    ] ?? 100
                                                }
                                            >
                                                <LabelList
                                                    dataKey="actual"
                                                    position="top"
                                                    formatter={(v) =>
                                                        `${v.toFixed(
                                                            1
                                                        )}%`
                                                    }
                                                    style={{
                                                        fill: "#064e3b",
                                                        fontSize:
                                                            lableFontSize,
                                                        fontWeight: 600,
                                                    }}
                                                    offset={2}
                                                />
                                            </Bar>
                                            <Bar
                                                dataKey="planned"
                                                fill="#3b82f6"
                                                name="Planned %"
                                                radius={[4, 4, 0, 0]}
                                                barSize={
                                                    barSizesByStation[
                                                        group.station
                                                    ] ?? 100
                                                }
                                            >
                                                <LabelList
                                                    dataKey="planned"
                                                    position="top"
                                                    formatter={(v) =>
                                                        `${v.toFixed(
                                                            1
                                                        )}%`
                                                    }
                                                    style={{
                                                        fill: "#1d4ed8",
                                                        fontSize:
                                                            lableFontSize,
                                                        fontWeight: 600,
                                                    }}
                                                    offset={2}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <form
                                        onSubmit={(e) =>
                                            BarSize(e, group.station)
                                        }
                                        className="pdf-hide mt-4 flex flex-wrap items-center gap-3"
                                    >
                                        <label className="text-sm font-medium text-gray-700">
                                            Bar Size
                                        </label>
                                        <input
                                            type="number"
                                            name="barsize"
                                            placeholder={
                                                barSizesByStation[
                                                    group.station
                                                ] ?? 100
                                            }
                                            className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl transition"
                                        >
                                            Apply
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                    <DataTable />
                    <div className="print-footer">
                        This Dashboard created Form
                        '4th-line-metro-dashboard.netlify.app'
                        website, ceated by Eng. Abdelrahman Maher
                    </div>
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
                <div className="print-footer">
                    This Dashboard ceated by Eng. Abdelrahman Maher
                </div>
            </main>
        </div>
    );
}
