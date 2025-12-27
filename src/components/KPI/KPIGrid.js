"use client";

import { DollarSign } from "lucide-react";
import KPICard from "./KPICard";
import { useDataStore, selectKPIs } from "@/stores/useDataStore";

export default function KPIGrid() {
    const kpis = useDataStore(selectKPIs);

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
