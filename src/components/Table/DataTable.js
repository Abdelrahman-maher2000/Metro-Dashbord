"use client";

import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Search,
    X,
} from "lucide-react";
import {
    useDataStore,
    selectFilteredData,
    selectFilters,
    selectSetFilters,
} from "@/stores/useDataStore";
import RecordDetailModal from "./RecordDetailModal";

export default function DataTable() {
    const filteredData = useDataStore(selectFilteredData);
    const updateFilters = useDataStore(selectSetFilters);
    const filters = useDataStore(selectFilters);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState(
        filters.search || ""
    );

    // Get all unique keys from data to create columns dynamically
    const columns = useMemo(() => {
        if (filteredData.length === 0) return [];
        const allKeys = new Set();
        filteredData.forEach((item) => {
            Object.keys(item).forEach((key) => {
                if (key && key.trim() !== "") allKeys.add(key);
            });
        });
        return Array.from(allKeys).map((key) => ({
            accessorKey: key,
            header: key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase())
                .trim(),
            cell: ({ getValue }) => {
                const value = getValue();
                if (value === null || value === undefined)
                    return "N/A";
                if (typeof value === "object")
                    return JSON.stringify(value);
                return String(value);
            },
        }));
    }, [filteredData]);

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            columnVisibility,
            globalFilter,
        },
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        onGlobalFilterChange: (value) => {
            setGlobalFilter(value);
            updateFilters({ search: value });
        },
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    const exportToCSV = () => {
        const visibleColumns = table
            .getVisibleFlatColumns()
            .map((col) => col.id);
        const rows = table.getFilteredRowModel().rows;

        const headers = visibleColumns.map((colId) => {
            const col = columns.find((c) => c.accessorKey === colId);
            return col ? col.header : colId;
        });

        const csvContent = [
            headers.join(","),
            ...rows.map((row) =>
                visibleColumns
                    .map((colId) => {
                        const value = row.getValue(colId);
                        if (value === null || value === undefined)
                            return "";
                        const stringValue = String(value).replace(
                            /"/g,
                            '""'
                        );
                        return `"${stringValue}"`;
                    })
                    .join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `metro-line-4-data-${
                new Date().toISOString().split("T")[0]
            }.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (filteredData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-gray-500 text-center py-8">
                    No data available
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 pdf-hide">
                <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center justify-between">
                    <div className="flex-1 w-full sm:w-auto">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                size={20}
                            />
                            <input
                                type="text"
                                placeholder="Search all columns..."
                                value={globalFilter}
                                onChange={(e) =>
                                    setGlobalFilter(e.target.value)
                                }
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label="Search table"
                            />
                            {globalFilter && (
                                <button
                                    onClick={() => {
                                        setGlobalFilter("");
                                        updateFilters({ search: "" });
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                        aria-label="Export to CSV"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                        <thead>
                            {table
                                .getHeaderGroups()
                                .map((headerGroup) => (
                                    <tr
                                        key={headerGroup.id}
                                        className="border-b border-gray-200"
                                    >
                                        {headerGroup.headers.map(
                                            (header) => (
                                                <th
                                                    key={header.id}
                                                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 bg-gray-50"
                                                >
                                                    {header.isPlaceholder ? null : (
                                                        <div
                                                            className={
                                                                header.column.getCanSort()
                                                                    ? "cursor-pointer select-none flex items-center gap-2"
                                                                    : ""
                                                            }
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            role="button"
                                                            tabIndex={
                                                                0
                                                            }
                                                            onKeyDown={(
                                                                e
                                                            ) => {
                                                                if (
                                                                    e.key ===
                                                                        "Enter" ||
                                                                    e.key ===
                                                                        " "
                                                                ) {
                                                                    header.column.getToggleSortingHandler()?.(
                                                                        e
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            {flexRender(
                                                                header
                                                                    .column
                                                                    .columnDef
                                                                    .header,
                                                                header.getContext()
                                                            )}
                                                            {{
                                                                asc: " ↑",
                                                                desc: " ↓",
                                                            }[
                                                                header.column.getIsSorted()
                                                            ] ?? null}
                                                        </div>
                                                    )}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    onClick={() =>
                                        setSelectedRecord(
                                            row.original
                                        )
                                    }
                                    className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                    role="row"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                        ) {
                                            setSelectedRecord(
                                                row.original
                                            );
                                        }
                                    }}
                                >
                                    {row
                                        .getVisibleCells()
                                        .map((cell) => (
                                            <td
                                                key={cell.id}
                                                className="px-4 py-3 text-sm text-gray-700"
                                            >
                                                {flexRender(
                                                    cell.column
                                                        .columnDef
                                                        .cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                        Showing{" "}
                        {table.getState().pagination.pageIndex *
                            table.getState().pagination.pageSize +
                            1}{" "}
                        to{" "}
                        {Math.min(
                            (table.getState().pagination.pageIndex +
                                1) *
                                table.getState().pagination.pageSize,
                            table.getFilteredRowModel().rows.length
                        )}{" "}
                        of {table.getFilteredRowModel().rows.length}{" "}
                        entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm text-gray-600">
                            Page{" "}
                            {table.getState().pagination.pageIndex +
                                1}{" "}
                            of {table.getPageCount()}
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 cursor-pointer"
                            aria-label="Next page"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {selectedRecord && (
                <RecordDetailModal
                    record={selectedRecord}
                    onClose={() => setSelectedRecord(null)}
                />
            )}
        </>
    );
}
