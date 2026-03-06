import { NextResponse } from "next/server";
import ImageKit from "@imagekit/nodejs";
import { isAuthorizedAdmin } from "@/app/api/_shared/adminAuth";

const imageKitClient = new ImageKit({
    privateKey: process.env.PRIVATE_KEY,
});

export async function GET(request) {
    try {
        if (!process.env.PRIVATE_KEY) {
            return NextResponse.json(
                { error: "Image upload service is not configured." },
                { status: 500 }
            );
        }

        const isAdmin = await isAuthorizedAdmin(request);
        if (!isAdmin) {
            return NextResponse.json(
                { error: "You are not authorized to upload." },
                { status: 403 }
            );
        }

        const authenticationParameters =
            imageKitClient.helper.getAuthenticationParameters();

        return NextResponse.json(authenticationParameters);
    } catch {
        return NextResponse.json(
            { error: "Failed to generate authentication parameters." },
            { status: 500 }
        );
    }
}
