const ADMIN_EMAIL = "admin@metro4thline.com";

function getBearerToken(request) {
    const authHeader = request.headers.get("authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
        return null;
    }

    return authHeader.slice("Bearer ".length);
}

export async function isAuthorizedAdmin(request) {
    const token = getBearerToken(request);
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!token || !firebaseApiKey) {
        return false;
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: token }),
            cache: "no-store",
        }
    );

    if (!response.ok) {
        return false;
    }

    const data = await response.json();
    const email = data?.users?.[0]?.email?.toLowerCase() || "";

    return email === ADMIN_EMAIL;
}
