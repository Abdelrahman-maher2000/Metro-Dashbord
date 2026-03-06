import { NextResponse } from "next/server";
import ImageKit from "@imagekit/nodejs";
import { isAuthorizedAdmin } from "@/app/api/_shared/adminAuth";

const imageKitClient = new ImageKit({
    privateKey: process.env.PRIVATE_KEY,
});

async function deleteFileById(fileId) {
    if (typeof imageKitClient.deleteFile === "function") {
        await imageKitClient.deleteFile(fileId);
        return;
    }

    await imageKitClient.files.delete(fileId);
}

export async function POST(request) {
    try {
        if (!process.env.PRIVATE_KEY) {
            return NextResponse.json(
                { error: "Image service is not configured." },
                { status: 500 }
            );
        }

        const isAdmin = await isAuthorizedAdmin(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: "You are not authorized to delete images." },
                { status: 403 }
            );
        }

        const body = await request.json().catch(() => null);
        const fileId = body?.fileId;
        const stationNumber = Number.parseInt(
            body?.stationNumber,
            10
        );

        // Validate request payload early to avoid deleting wrong/empty ids.
        if (typeof fileId !== "string" || !fileId.trim()) {
            return NextResponse.json(
                { error: "fileId is required." },
                { status: 400 }
            );
        }

        const trimmedFileId = fileId.trim();
        let deletedPrimary = false;

        try {
            // Primary deletion by fileId from Firestore.
            await deleteFileById(trimmedFileId);
            deletedPrimary = true;
        } catch {
            deletedPrimary = false;
        }

        // Fallback: if fileId deletion fails or is stale, remove station file by path.
        // This guarantees one-image-per-station cleanup with your fixed naming convention.
        let deletedFallback = false;
        if (
            !Number.isNaN(stationNumber) &&
            stationNumber >= 1 &&
            stationNumber <= 12
        ) {
            const stationFileName = `station-${stationNumber}.jpg`;
            const stationFolder = `/metro-line-4/stations/station-${stationNumber}`;

            const assets = await imageKitClient.assets.list({
                type: "file",
                fileType: "image",
                path: stationFolder,
                searchQuery: `name = "${stationFileName}"`,
                limit: 50,
            });

            const matchingAssets = assets.filter(
                (asset) =>
                    String(asset.name || "").toLowerCase() ===
                        stationFileName.toLowerCase() &&
                    String(asset.filePath || "").startsWith(
                        stationFolder
                    )
            );

            for (const asset of matchingAssets) {
                const assetFileId = String(asset.fileId || "").trim();
                if (!assetFileId) continue;
                try {
                    await deleteFileById(assetFileId);
                    deletedFallback = true;
                } catch {
                    // keep trying remaining matches
                }
            }
        }

        if (!deletedPrimary && !deletedFallback) {
            return NextResponse.json(
                {
                    error: "Could not delete image from ImageKit.",
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                deletedByFileId: deletedPrimary,
                deletedByFallback: deletedFallback,
            },
            { status: 200 }
        );
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to delete image from ImageKit.";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
