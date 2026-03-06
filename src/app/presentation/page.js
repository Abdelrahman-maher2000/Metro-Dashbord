"use client";

import { upload } from "@imagekit/javascript";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import Header from "@/shared/components/layout/Header";
import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL = "Admin@Metro4thLine.com";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);
const STATION_NUMBERS = Array.from(
    { length: 12 },
    (_, index) => index + 1
);
const WORK_KEYS = ["civil", "mechanical", "electrical", "arch"];
const SECTION_KEYS = [
    "construction",
    "procurement",
    "engineering",
];
const SECTION_LABELS = {
    construction: "Construction",
    procurement: "Procurement",
    engineering: "Engineering",
};
const DEFAULT_SECTION_DOC = {
    civil: 0,
    mechanical: 0,
    electrical: 0,
    arch: 0,
    allowedUsers: "",
};

function stationTitle(number) {
    return `Station ${number}`;
}

function formatPercentValue(value) {
    return typeof value === "number" ? `${value}%` : "-";
}

function buildImageUrlFromUploadResult(uploadResult) {
    if (uploadResult?.url) return uploadResult.url;

    const endpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT;
    const filePath = uploadResult?.filePath;
    if (!endpoint || !filePath) return "";

    return `${endpoint}${filePath}`;
}

function validateImageFile(file) {
    if (!file) return "Please select an image file first.";
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return "Only JPEG, PNG, and WEBP images are allowed.";
    }
    if (file.size > MAX_FILE_SIZE)
        return "Image size must be 5MB or less.";
    return "";
}

function normalizeAllowedUsers(value) {
    if (typeof value === "string") {
        // Support a single UID/email string and comma-separated strings.
        return value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
    }
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return [value];
    return [];
}

export default function PresentationPage() {
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [stationsMap, setStationsMap] = useState({});
    const [isStationsLoading, setIsStationsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStationNumber, setSelectedStationNumber] =
        useState("1");
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileInputVersion, setFileInputVersion] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [deletingByStation, setDeletingByStation] = useState({});
    const [message, setMessage] = useState({ type: "", text: "" });
    const [constructionByStation, setConstructionByStation] =
        useState({});
    const [isConstructionLoading, setIsConstructionLoading] =
        useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [selectedEditSection, setSelectedEditSection] =
        useState("construction");
    const [editForm, setEditForm] = useState({
        stationNumber: null,
        workKey: "",
        valuesBySection: {
            construction: {
                planned: "",
                actual: "",
            },
            procurement: {
                planned: "",
                actual: "",
            },
            engineering: {
                planned: "",
                actual: "",
            },
        },
    });

    useEffect(() => {
        if (!message.text) return undefined;

        const timeoutId = setTimeout(() => {
            setMessage({ type: "", text: "" });
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [message]);

    const hasImageKitClientConfig = Boolean(
        process.env.NEXT_PUBLIC_PUBLIC_KEY &&
            process.env.NEXT_PUBLIC_URL_ENDPOINT
    );

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user || null);
            setIsAdmin(
                user?.email?.toLowerCase() ===
                    ADMIN_EMAIL.toLowerCase()
            );
            setIsAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const stationsRef = collection(db, "Images");
        const unsubscribe = onSnapshot(
            stationsRef,
            (snapshot) => {
                const nextMap = {};
                snapshot.forEach((item) => {
                    const data = item.data();
                    const stationNumber = Number.parseInt(
                        item.id,
                        10
                    );
                    if (Number.isNaN(stationNumber)) return;

                    nextMap[stationNumber] = {
                        stationNumber,
                        imageUrl: data.imageUrl || "",
                        fileId: data.fileId || "",
                    };
                });

                setStationsMap(nextMap);
                setIsStationsLoading(false);
            },
            () => {
                setIsStationsLoading(false);
                setMessage({
                    type: "error",
                    text: "Failed to load station images from Firestore.",
                });
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (isAuthLoading) return undefined;

        let isMounted = true;

        async function loadStationConstructionData() {
            try {
                const entries = await Promise.allSettled(
                    STATION_NUMBERS.map(async (stationNumber) => {
                        const stationId = String(stationNumber);
                        const stationRef = doc(
                            db,
                            "StationsCategoryOfWork",
                            stationId
                        );

                        let stationData = {};
                        try {
                            const stationSnap = await getDoc(stationRef);
                            stationData = stationSnap.exists()
                                ? stationSnap.data()
                                : {};
                        } catch {
                            stationData = {};
                        }

                        const sections = {};
                        await Promise.all(
                            SECTION_KEYS.map(async (sectionKey) => {
                                const plannedRef = doc(
                                    db,
                                    "StationsCategoryOfWork",
                                    stationId,
                                    sectionKey,
                                    "planned"
                                );
                                const actualRef = doc(
                                    db,
                                    "StationsCategoryOfWork",
                                    stationId,
                                    sectionKey,
                                    "actual"
                                );

                                let plannedData = {};
                                let actualData = {};
                                let hasPlannedDoc = false;
                                let hasActualDoc = false;

                                try {
                                    const plannedSnap =
                                        await getDoc(plannedRef);
                                    hasPlannedDoc = plannedSnap.exists();
                                    plannedData = hasPlannedDoc
                                        ? plannedSnap.data()
                                        : {};
                                } catch {
                                    plannedData = {};
                                }

                                try {
                                    const actualSnap = await getDoc(actualRef);
                                    hasActualDoc = actualSnap.exists();
                                    actualData = hasActualDoc
                                        ? actualSnap.data()
                                        : {};
                                } catch {
                                    actualData = {};
                                }

                                // If missing docs, create defaults only when admin.
                                if (isAdmin && !hasPlannedDoc) {
                                    await setDoc(plannedRef, {
                                        ...DEFAULT_SECTION_DOC,
                                    });
                                    plannedData = { ...DEFAULT_SECTION_DOC };
                                }
                                if (isAdmin && !hasActualDoc) {
                                    await setDoc(actualRef, {
                                        ...DEFAULT_SECTION_DOC,
                                    });
                                    actualData = { ...DEFAULT_SECTION_DOC };
                                }

                                sections[sectionKey] = {
                                    planned: plannedData,
                                    actual: actualData,
                                    plannedAllowedUsers:
                                        plannedData.allowedUsers ?? null,
                                    actualAllowedUsers:
                                        actualData.allowedUsers ?? null,
                                };
                            })
                        );

                        return [
                            stationNumber,
                            {
                                stationName:
                                    stationData.stationName || "",
                                allowedUsers:
                                    stationData.allowedUsers ?? null,
                                sections,
                            },
                        ];
                    })
                );

                if (!isMounted) return;
                const normalizedEntries = entries
                    .filter((result) => result.status === "fulfilled")
                    .map((result) => result.value);
                setConstructionByStation(
                    Object.fromEntries(normalizedEntries)
                );
            } catch {
                if (!isMounted) return;
                setMessage((prev) =>
                    prev.type === "error"
                        ? prev
                        : {
                              type: "error",
                              text: "Failed to load construction data.",
                          }
                );
            } finally {
                if (isMounted) {
                    setIsConstructionLoading(false);
                }
            }
        }

        setIsConstructionLoading(true);
        loadStationConstructionData();

        return () => {
            isMounted = false;
        };
    }, [isAdmin, isAuthLoading]);

    useEffect(() => {
        if (isAuthLoading || !isAdmin) return undefined;

        let isMounted = true;

        async function ensureSectionDocsExist() {
            try {
                await Promise.all(
                    STATION_NUMBERS.map(async (stationNumber) => {
                        const stationId = String(stationNumber);

                        await Promise.all(
                            SECTION_KEYS.map(async (sectionKey) => {
                                const plannedRef = doc(
                                    db,
                                    "StationsCategoryOfWork",
                                    stationId,
                                    sectionKey,
                                    "planned"
                                );
                                const actualRef = doc(
                                    db,
                                    "StationsCategoryOfWork",
                                    stationId,
                                    sectionKey,
                                    "actual"
                                );

                                const [plannedSnap, actualSnap] =
                                    await Promise.all([
                                        getDoc(plannedRef),
                                        getDoc(actualRef),
                                    ]);

                                // Create missing docs with default values
                                // without touching existing data.
                                if (!plannedSnap.exists()) {
                                    await setDoc(plannedRef, {
                                        ...DEFAULT_SECTION_DOC,
                                    });
                                }
                                if (!actualSnap.exists()) {
                                    await setDoc(actualRef, {
                                        ...DEFAULT_SECTION_DOC,
                                    });
                                }
                            })
                        );
                    })
                );
            } catch {
                if (!isMounted) return;
                setMessage((prev) =>
                    prev.type === "error"
                        ? prev
                        : {
                              type: "error",
                              text: "Could not initialize all section documents.",
                          }
                );
            }
        }

        ensureSectionDocsExist();

        return () => {
            isMounted = false;
        };
    }, [isAdmin, isAuthLoading]);

    function resetUploadForm() {
        setSelectedStationNumber("1");
        setSelectedFile(null);
        setFileInputVersion((prev) => prev + 1);
        setUploadProgress(0);
    }

    function openUploadModal() {
        setMessage({ type: "", text: "" });
        setIsModalOpen(true);
    }

    function closeUploadModal() {
        if (isUploading) return;
        setIsModalOpen(false);
        resetUploadForm();
    }

    function handleFileSelect(file) {
        const error = validateImageFile(file);
        if (error) {
            setSelectedFile(null);
            setMessage({ type: "error", text: error });
            return;
        }
        setSelectedFile(file);
        setMessage({ type: "", text: "" });
    }

    async function getAdminToken() {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Missing user token.");
        return token;
    }

    async function deleteFromImageKit(fileId, stationNumber, token) {
        if (!fileId) {
            throw new Error(
                "fileId is missing for this station image."
            );
        }

        const response = await fetch("/api/imagekit-delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ fileId, stationNumber }),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(
                payload?.error ||
                    "Failed to delete image from ImageKit."
            );
        }
    }

    async function handleUploadSubmit(event) {
        event.preventDefault();

        if (!isAdmin) {
            setMessage({
                type: "error",
                text: "You are not authorized to upload.",
            });
            return;
        }

        if (!hasImageKitClientConfig) {
            setMessage({
                type: "error",
                text: "Missing ImageKit public configuration.",
            });
            return;
        }

        const error = validateImageFile(selectedFile);
        if (error) {
            setMessage({ type: "error", text: error });
            return;
        }

        const stationNumber = Number.parseInt(
            selectedStationNumber,
            10
        );
        if (Number.isNaN(stationNumber)) {
            setMessage({
                type: "error",
                text: "Invalid station selection.",
            });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setMessage({ type: "", text: "" });

        try {
            const token = await getAdminToken();
            const stationDocRef = doc(
                db,
                "Images",
                String(stationNumber)
            );

            // Step 1 & 2: Replace existing image if this station already has one.
            const existingDoc = await getDoc(stationDocRef);
            if (existingDoc.exists()) {
                const oldFileId = existingDoc.data()?.fileId;
                await deleteFromImageKit(
                    oldFileId,
                    stationNumber,
                    token
                );
            }

            const authResponse = await fetch("/api/imagekit-auth", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!authResponse.ok) {
                const payload = await authResponse
                    .json()
                    .catch(() => ({}));
                throw new Error(
                    payload?.error ||
                        "Could not get upload authentication parameters."
                );
            }

            const authParams = await authResponse.json();
            const result = await upload({
                file: selectedFile,
                fileName: `station-${stationNumber}-${Date.now()}.jpg`,
                folder: `/metro-line-4/stations/station-${stationNumber}`,
                useUniqueFileName: false,
                overwriteFile: true,
                publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY,
                token: authParams.token,
                signature: authParams.signature,
                expire: authParams.expire,
                onProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    setUploadProgress(
                        Math.round(
                            (progressEvent.loaded /
                                progressEvent.total) *
                                100
                        )
                    );
                },
            });

            const imageUrl = buildImageUrlFromUploadResult(result);
            if (!imageUrl || !result?.fileId) {
                throw new Error(
                    "Upload succeeded but URL/fileId is missing."
                );
            }

            // Step 4: Persist station image metadata in Firestore.
            await setDoc(stationDocRef, {
                stationNumber,
                imageUrl,
                fileId: result.fileId,
                uploadedAt: serverTimestamp(),
            });

            // Do not set local preview URL directly.
            // Cards read imageUrl from Firestore snapshot only.

            setMessage({
                type: "success",
                text: `${stationTitle(
                    stationNumber
                )} image uploaded successfully.`,
            });
            setIsModalOpen(false);
            resetUploadForm();
        } catch (uploadError) {
            setMessage({
                type: "error",
                text:
                    uploadError instanceof Error
                        ? uploadError.message
                        : "Upload failed.",
            });
        } finally {
            setIsUploading(false);
        }
    }

    async function handleDelete(stationNumber) {
        if (!isAdmin) return;
        const station = stationsMap[stationNumber];
        if (!station?.fileId) return;

        setDeletingByStation((prev) => ({
            ...prev,
            [stationNumber]: true,
        }));
        setMessage({ type: "", text: "" });

        try {
            const token = await getAdminToken();

            // Step 1: Delete from ImageKit first.
            await deleteFromImageKit(
                station.fileId,
                stationNumber,
                token
            );

            // Step 2: Delete Firestore document only after ImageKit success.
            await deleteDoc(doc(db, "Images", String(stationNumber)));

            // UI will remove the image from Firestore snapshot after deleteDoc succeeds.

            setMessage({
                type: "success",
                text: `${stationTitle(stationNumber)} image deleted.`,
            });
        } catch (deleteError) {
            setMessage({
                type: "error",
                text:
                    deleteError instanceof Error
                        ? deleteError.message
                        : "Delete failed.",
            });
        } finally {
            setDeletingByStation((prev) => ({
                ...prev,
                [stationNumber]: false,
            }));
        }
    }

    function openEditModal(stationNumber, workKey) {
        if (!canEditStation(stationNumber)) {
            setMessage({
                type: "error",
                text: "You are not allowed to edit this station.",
            });
            return;
        }

        const stationData = constructionByStation[stationNumber] || {};
        const valuesBySection = {};
        SECTION_KEYS.forEach((sectionKey) => {
            const sectionData = stationData.sections?.[sectionKey] || {};
            const plannedValue = sectionData.planned?.[workKey];
            const actualValue = sectionData.actual?.[workKey];

            valuesBySection[sectionKey] = {
                planned:
                    typeof plannedValue === "number"
                        ? String(plannedValue)
                        : "",
                actual:
                    typeof actualValue === "number"
                        ? String(actualValue)
                        : "",
            };
        });

        setEditForm({
            stationNumber,
            workKey,
            valuesBySection,
        });
        setSelectedEditSection("construction");
        setIsEditModalOpen(true);
    }

    function closeEditModal() {
        if (isSavingEdit) return;
        setIsEditModalOpen(false);
        setEditForm({
            stationNumber: null,
            workKey: "",
            valuesBySection: {
                construction: { planned: "", actual: "" },
                procurement: { planned: "", actual: "" },
                engineering: { planned: "", actual: "" },
            },
        });
    }

    function handleEditValueChange(sectionKey, valueType, value) {
        setEditForm((prev) => ({
            ...prev,
            valuesBySection: {
                ...prev.valuesBySection,
                [sectionKey]: {
                    ...prev.valuesBySection[sectionKey],
                    [valueType]: value,
                },
            },
        }));
    }

    async function handleSaveCategoryEdit(event) {
        event.preventDefault();

        const stationNumber = editForm.stationNumber;
        if (!canEditStation(stationNumber)) {
            setMessage({
                type: "error",
                text: "You are not authorized to edit this station.",
            });
            return;
        }

        const workKey = editForm.workKey;
        if (!stationNumber || !workKey) {
            setMessage({
                type: "error",
                text: "Invalid edit request.",
            });
            return;
        }

        setIsSavingEdit(true);
        setMessage({ type: "", text: "" });

        try {
            const parsedBySection = {};
            let hasAnyValue = false;

            for (const sectionKey of SECTION_KEYS) {
                const sectionValues =
                    editForm.valuesBySection[sectionKey] || {};
                const plannedRaw = sectionValues.planned;
                const actualRaw = sectionValues.actual;

                const parsedSection = {};
                if (plannedRaw !== "") {
                    const plannedParsed = Number.parseFloat(plannedRaw);
                    if (Number.isNaN(plannedParsed)) {
                        throw new Error(
                            `${SECTION_LABELS[sectionKey]} planned value is invalid.`
                        );
                    }
                    parsedSection.planned = plannedParsed;
                    hasAnyValue = true;
                }
                if (actualRaw !== "") {
                    const actualParsed = Number.parseFloat(actualRaw);
                    if (Number.isNaN(actualParsed)) {
                        throw new Error(
                            `${SECTION_LABELS[sectionKey]} actual value is invalid.`
                        );
                    }
                    parsedSection.actual = actualParsed;
                    hasAnyValue = true;
                }

                parsedBySection[sectionKey] = parsedSection;
            }

            if (!hasAnyValue) {
                throw new Error("Please enter at least one numeric value.");
            }

            // Update all three sections (construction/procurement/engineering).
            await Promise.all(
                SECTION_KEYS.map(async (sectionKey) => {
                    const sectionParsed = parsedBySection[sectionKey];
                    const plannedValue = sectionParsed.planned;
                    const actualValue = sectionParsed.actual;

                    if (plannedValue !== undefined) {
                        const plannedRef = doc(
                            db,
                            "StationsCategoryOfWork",
                            String(stationNumber),
                            sectionKey,
                            "planned"
                        );
                        await setDoc(
                            plannedRef,
                            { [workKey]: plannedValue },
                            { merge: true }
                        );
                    }

                    if (actualValue !== undefined) {
                        const actualRef = doc(
                            db,
                            "StationsCategoryOfWork",
                            String(stationNumber),
                            sectionKey,
                            "actual"
                        );
                        await setDoc(
                            actualRef,
                            { [workKey]: actualValue },
                            { merge: true }
                        );
                    }
                })
            );

            // Keep UI in sync immediately for edited station/category.
            setConstructionByStation((prev) => {
                const currentStation = prev[stationNumber] || {};
                const currentSections = currentStation.sections || {};
                const nextSections = { ...currentSections };

                SECTION_KEYS.forEach((sectionKey) => {
                    const currentSection = currentSections[sectionKey] || {};
                    const currentPlanned = currentSection.planned || {};
                    const currentActual = currentSection.actual || {};
                    const sectionParsed = parsedBySection[sectionKey];

                    nextSections[sectionKey] = {
                        ...currentSection,
                        planned:
                            sectionParsed.planned !== undefined
                                ? {
                                      ...currentPlanned,
                                      [workKey]:
                                          sectionParsed.planned,
                                  }
                                : currentPlanned,
                        actual:
                            sectionParsed.actual !== undefined
                                ? {
                                      ...currentActual,
                                      [workKey]:
                                          sectionParsed.actual,
                                  }
                                : currentActual,
                    };
                });

                return {
                    ...prev,
                    [stationNumber]: {
                        ...currentStation,
                        sections: nextSections,
                    },
                };
            });

            const categoryTitle =
                workKey.charAt(0).toUpperCase() + workKey.slice(1);
            setMessage({
                type: "success",
                text: `${stationTitle(
                    stationNumber
                )} - ${categoryTitle} updated across all sections.`,
            });
            closeEditModal();
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "Failed to update value.",
            });
        } finally {
            setIsSavingEdit(false);
        }
    }

    function canEditStation(stationNumber) {
        if (isAdmin) return true;
        if (!currentUser?.uid && !currentUser?.email) return false;

        const stationData = constructionByStation[stationNumber] || {};
        const allowedUsers = [
            ...normalizeAllowedUsers(stationData.allowedUsers),
        ];

        SECTION_KEYS.forEach((sectionKey) => {
            const sectionData = stationData.sections?.[sectionKey] || {};
            allowedUsers.push(
                ...normalizeAllowedUsers(
                    sectionData.plannedAllowedUsers
                )
            );
            allowedUsers.push(
                ...normalizeAllowedUsers(
                    sectionData.actualAllowedUsers
                )
            );
        });

        const userUid = (currentUser?.uid || "").trim();
        const userUidLower = userUid.toLowerCase();
        const userEmail = currentUser?.email?.toLowerCase() || "";

        return allowedUsers.some((allowed) => {
            // Support allowedUsers entries as:
            // - "uid-string"
            // - "user@email.com"
            // - { uid: "...", email: "..." }
            if (typeof allowed === "string") {
                const normalized = allowed.trim();
                const normalizedLower = normalized.toLowerCase();
                return (
                    normalized === userUid ||
                    normalizedLower === userUidLower ||
                    normalizedLower === userEmail
                );
            }

            if (allowed && typeof allowed === "object") {
                const allowedUid =
                    typeof allowed.uid === "string"
                        ? allowed.uid.trim()
                        : "";
                const allowedEmail =
                    typeof allowed.email === "string"
                        ? allowed.email.trim().toLowerCase()
                        : "";

                return (
                    allowedUid === userUid ||
                    allowedUid.toLowerCase() === userUidLower ||
                    allowedEmail === userEmail
                );
            }

            return false;
        });
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="p-4 lg:p-8">
                <section className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Presentation
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Upload and manage station presentation images.
                    </p>

                    {!isAuthLoading && !isAdmin && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                            You are not authorized to upload.
                        </p>
                    )}

                    {!isAuthLoading && !hasImageKitClientConfig && (
                        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            Missing ImageKit public configuration. Add
                            `NEXT_PUBLIC_PUBLIC_KEY` and
                            `NEXT_PUBLIC_URL_ENDPOINT`.
                        </p>
                    )}

                    {isAdmin && (
                        <button
                            type="button"
                            onClick={openUploadModal}
                            className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            Upload Station Image
                        </button>
                    )}

                    {message.text && (
                        <p
                            className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
                                message.type === "error"
                                    ? "border border-red-200 bg-red-50 text-red-700"
                                    : "border border-green-200 bg-green-50 text-green-700"
                            }`}
                        >
                            {message.text}
                        </p>
                    )}
                </section>

                <section className="flex flex-col gap-4 lg:gap-8">
                    {STATION_NUMBERS.map((stationNumber) => {
                        const station = stationsMap[stationNumber];
                        const stationConstruction =
                            constructionByStation[stationNumber] ||
                            {};
                        const imageUrl = station?.imageUrl || "";
                        const isDeleting = Boolean(
                            deletingByStation[stationNumber]
                        );

                        return (
                            <article
                                key={stationNumber}
                                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                            >
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {stationConstruction.stationName ||
                                        stationTitle(stationNumber)}
                                </h2>

                                <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={`${stationTitle(
                                                stationNumber
                                            )} preview`}
                                            className="h-64 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-gray-500">
                                            No uploaded image yet.
                                        </div>
                                    )}
                                </div>

                                {isAdmin && imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDelete(
                                                stationNumber
                                            )
                                        }
                                        disabled={isDeleting}
                                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >
                                        {isDeleting
                                            ? "Deleting..."
                                            : "Delete Image"}
                                    </button>
                                )}

                                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                                    {SECTION_KEYS.map((sectionKey) => {
                                        const sectionData =
                                            stationConstruction.sections?.[
                                                sectionKey
                                            ] || {};

                                        return (
                                            <div
                                                key={`${stationNumber}-${sectionKey}`}
                                                className="rounded-lg border border-gray-200 p-3"
                                            >
                                                <h3 className="text-base font-semibold text-gray-900">
                                                    {
                                                        SECTION_LABELS[
                                                            sectionKey
                                                        ]
                                                    }
                                                </h3>

                                                <div className="mt-3 space-y-3">
                                                    {WORK_KEYS.map((workKey) => {
                                                        const plannedValue =
                                                            sectionData
                                                                .planned?.[
                                                                workKey
                                                            ];
                                                        const actualValue =
                                                            sectionData
                                                                .actual?.[
                                                                workKey
                                                            ];
                                                        const workTitle =
                                                            workKey
                                                                .charAt(
                                                                    0
                                                                )
                                                                .toUpperCase() +
                                                            workKey.slice(
                                                                1
                                                            );

                                                        return (
                                                            <div
                                                                key={`${stationNumber}-${sectionKey}-${workKey}`}
                                                                className="rounded-md border border-gray-100 bg-gray-50 p-2"
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <p className="font-semibold text-gray-800">
                                                                        {workTitle}
                                                                    </p>
                                                                    {canEditStation(
                                                                        stationNumber
                                                                    ) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                openEditModal(
                                                                                    stationNumber,
                                                                                    workKey
                                                                                )
                                                                            }
                                                                            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                                                        >
                                                                            Edit
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-700">
                                                                    <p>
                                                                        Planned:{" "}
                                                                        <span className="font-semibold text-blue-600">
                                                                            {formatPercentValue(
                                                                                plannedValue
                                                                            )}
                                                                        </span>
                                                                    </p>
                                                                    <p>
                                                                        Actual:{" "}
                                                                        <span className="font-semibold text-green-600">
                                                                            {formatPercentValue(
                                                                                actualValue
                                                                            )}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}
                </section>

                {isStationsLoading && (
                    <p className="mt-4 text-sm text-gray-500">
                        Loading station images...
                    </p>
                )}
                {isConstructionLoading && (
                    <p className="mt-2 text-sm text-gray-500">
                        Loading construction data...
                    </p>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Upload Station Image
                            </h2>

                            <form
                                onSubmit={handleUploadSubmit}
                                className="mt-4 space-y-4"
                            >
                                <div>
                                    <label
                                        htmlFor="stationSelect"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Station
                                    </label>
                                    <select
                                        id="stationSelect"
                                        value={selectedStationNumber}
                                        onChange={(event) =>
                                            setSelectedStationNumber(
                                                event.target.value
                                            )
                                        }
                                        disabled={isUploading}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {STATION_NUMBERS.map(
                                            (number) => (
                                                <option
                                                    key={number}
                                                    value={String(
                                                        number
                                                    )}
                                                >
                                                    {stationTitle(
                                                        number
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="stationImageInput"
                                        className="mb-1 block text-sm font-medium text-gray-700"
                                    >
                                        Image
                                    </label>
                                    <input
                                        key={fileInputVersion}
                                        id="stationImageInput"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={isUploading}
                                        className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                                        onChange={(event) =>
                                            handleFileSelect(
                                                event.target
                                                    .files?.[0]
                                            )
                                        }
                                    />
                                    {selectedFile && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            Selected:{" "}
                                            {selectedFile.name}
                                        </p>
                                    )}
                                </div>

                                {isUploading && (
                                    <div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                            <div
                                                className="h-2 rounded-full bg-blue-600 transition-all"
                                                style={{
                                                    width: `${uploadProgress}%`,
                                                }}
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-600">
                                            {uploadProgress}% uploaded
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeUploadModal}
                                        disabled={isUploading}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUploading}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >
                                        {isUploading
                                            ? "Uploading..."
                                            : "Upload"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Edit Category Value
                            </h2>

                            <form
                                onSubmit={handleSaveCategoryEdit}
                                className="mt-4 space-y-4"
                            >
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                                    <p>
                                        <span className="font-semibold">
                                            Station:
                                        </span>{" "}
                                        {editForm.stationNumber
                                            ? stationTitle(
                                                  editForm.stationNumber
                                              )
                                            : "-"}
                                    </p>
                                    <p className="mt-1">
                                        <span className="font-semibold">
                                            Category:
                                        </span>{" "}
                                        {editForm.workKey
                                            ? editForm.workKey
                                                  .charAt(0)
                                                  .toUpperCase() +
                                              editForm.workKey.slice(
                                                  1
                                              )
                                            : "-"}
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {SECTION_KEYS.map((sectionKey) => (
                                        <button
                                            key={sectionKey}
                                            type="button"
                                            onClick={() =>
                                                setSelectedEditSection(
                                                    sectionKey
                                                )
                                            }
                                            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                                                selectedEditSection ===
                                                sectionKey
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                        >
                                            {
                                                SECTION_LABELS[
                                                    sectionKey
                                                ]
                                            }
                                        </button>
                                    ))}
                                </div>

                                <div className="rounded-lg border border-gray-200 p-3">
                                    <h4 className="text-sm font-semibold text-gray-900">
                                        {
                                            SECTION_LABELS[
                                                selectedEditSection
                                            ]
                                        }
                                    </h4>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor={`${selectedEditSection}-planned`}
                                                className="mb-1 block text-sm font-medium text-gray-700"
                                            >
                                                Planned (%)
                                            </label>
                                            <input
                                                id={`${selectedEditSection}-planned`}
                                                type="number"
                                                step="0.01"
                                                value={
                                                    editForm
                                                        .valuesBySection?.[
                                                        selectedEditSection
                                                    ]?.planned ?? ""
                                                }
                                                disabled={isSavingEdit}
                                                onChange={(event) =>
                                                    handleEditValueChange(
                                                        selectedEditSection,
                                                        "planned",
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor={`${selectedEditSection}-actual`}
                                                className="mb-1 block text-sm font-medium text-gray-700"
                                            >
                                                Actual (%)
                                            </label>
                                            <input
                                                id={`${selectedEditSection}-actual`}
                                                type="number"
                                                step="0.01"
                                                value={
                                                    editForm
                                                        .valuesBySection?.[
                                                        selectedEditSection
                                                    ]?.actual ?? ""
                                                }
                                                disabled={isSavingEdit}
                                                onChange={(event) =>
                                                    handleEditValueChange(
                                                        selectedEditSection,
                                                        "actual",
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closeEditModal}
                                        disabled={isSavingEdit}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSavingEdit}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                                    >
                                        {isSavingEdit
                                            ? "Saving..."
                                            : "Save"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
