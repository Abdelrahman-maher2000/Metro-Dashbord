"use client";

import IssuesClient from "@/app/area-of-concern/IssuesClient";
import BlockedEmailGuard from "@/shared/components/BlockedEmailGuard";

export const dynamic = "force-dynamic";

export default function AreaOfConcernPage() {
    return (
        <BlockedEmailGuard blockedEmail="reg@metro4thline.com" redirectTo="/">
            {() => <IssuesClient />}
        </BlockedEmailGuard>
    );
}

