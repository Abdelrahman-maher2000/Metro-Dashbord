"use client";

import { DollarSign } from "lucide-react";
import KPICard from "./KPICard";
import { useData } from "@/contexts/DataContext";

export default function KPIGrid() {
    const { kpis } = useData();

    return (
        <div className="grid grid-cols-1 gap-4 mb-6">
            <KPICard
                title="On Schedule"
                value={kpis.onScheduleActivities || 0}
                icon={DollarSign}
                tooltip="Number of activities on schedule"
            />
        </div>
    );
}
