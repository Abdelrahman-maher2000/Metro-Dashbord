"use client";

import Header from "@/components/Layout/Header";
import FilterBar from "@/components/Filters/FilterBar";
import BudgetStackedBar from "@/components/Charts/BudgetStackedBar";
import StatusPieChart from "@/components/Charts/StatusPieChart";
import DataTable from "@/components/Table/DataTable";
import { useData } from "@/contexts/DataContext";

export default function Dashboard() {
    const { loading, error } = useData();

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

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-red-600 mb-4">
                        Error loading data: {error}
                    </p>
                    <p className="text-gray-600">
                        Please ensure data.json exists in the public
                        folder
                    </p>
                </div>
            </div>
        );
    }

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
            </main>
        </div>
    );
}
