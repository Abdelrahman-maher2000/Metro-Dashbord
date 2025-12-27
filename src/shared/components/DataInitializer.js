"use client";

import { useDataSubscription } from "@/shared/hooks/useDataSubscription";

export default function DataInitializer() {
    useDataSubscription();
    return null;
}

