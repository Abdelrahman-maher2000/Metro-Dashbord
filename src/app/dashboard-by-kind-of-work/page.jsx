"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PieComparisonChart from "@/components/dashboard-by-kind-of-work/PieComparisonChart";
import HistogramChart from "@/components/dashboard-by-kind-of-work/HistogramChart";

const WORK_TYPES = ["civil", "mechanical", "electrical", "arch"];

const SECTIONS = [
    { key: "engineering", label: "Engineering" },
    { key: "procurement", label: "Procurement" },
    { key: "construction", label: "Construction" },
];

function toSafeNumber(value) {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return 0;
    return numberValue;
}

function emptySectionData() {
    return {
        planned: {
            civil: 0,
            mechanical: 0,
            electrical: 0,
            arch: 0,
        },
        actual: {
            civil: 0,
            mechanical: 0,
            electrical: 0,
            arch: 0,
        },
    };
}

function mapDocToWorkTypes(data) {
    return {
        civil: toSafeNumber(data?.civil),
        mechanical: toSafeNumber(data?.mechanical),
        electrical: toSafeNumber(data?.electrical),
        arch: toSafeNumber(data?.arch),
    };
}

export default function DashboardByKindOfWorkPage() {
    const [stationsData, setStationsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadStations = async () => {
            setLoading(true);
            setError("");

            try {
                const stationNumbers = Array.from({ length: 12 }, (_, index) =>
                    String(index + 1)
                );

                const stationResults = await Promise.all(
                    stationNumbers.map(async (stationNumber) => {
                        const sectionsEntries = await Promise.all(
                            SECTIONS.map(async (section) => {
                                // Each section has two docs: planned and actual.
                                const plannedRef = doc(
                                    db,
                                    "StationsCategoryOfWork",
                                    stationNumber,
                                    section.key,
                                    "planned"
                                );
                                const actualRef = doc(
                                    db,
                                    "StationsCategoryOfWork",
                                    stationNumber,
                                    section.key,
                                    "actual"
                                );

                                const [plannedSnap, actualSnap] = await Promise.all([
                                    getDoc(plannedRef),
                                    getDoc(actualRef),
                                ]);

                                return [
                                    section.key,
                                    {
                                        planned: plannedSnap.exists()
                                            ? mapDocToWorkTypes(plannedSnap.data())
                                            : emptySectionData().planned,
                                        actual: actualSnap.exists()
                                            ? mapDocToWorkTypes(actualSnap.data())
                                            : emptySectionData().actual,
                                    },
                                ];
                            })
                        );

                        return {
                            stationNumber,
                            sections: Object.fromEntries(sectionsEntries),
                        };
                    })
                );

                if (isMounted) {
                    setStationsData(stationResults);
                }
            } catch (loadError) {
                if (isMounted) {
                    setError(
                        loadError?.message || "Failed to load dashboard data from Firestore."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadStations();

        return () => {
            isMounted = false;
        };
    }, []);

    const stationsWithHistogramData = useMemo(() => {
        // Build histogram datasets per station and per section.
        return stationsData.map((station) => {
            const histogramDataBySection = {
                engineering: WORK_TYPES.map((kind) => ({
                    kind: kind.charAt(0).toUpperCase() + kind.slice(1),
                    planned: toSafeNumber(station.sections?.engineering?.planned?.[kind]),
                    actual: toSafeNumber(station.sections?.engineering?.actual?.[kind]),
                })),
                procurement: WORK_TYPES.map((kind) => ({
                    kind: kind.charAt(0).toUpperCase() + kind.slice(1),
                    planned: toSafeNumber(station.sections?.procurement?.planned?.[kind]),
                    actual: toSafeNumber(station.sections?.procurement?.actual?.[kind]),
                })),
                construction: WORK_TYPES.map((kind) => ({
                    kind: kind.charAt(0).toUpperCase() + kind.slice(1),
                    planned: toSafeNumber(station.sections?.construction?.planned?.[kind]),
                    actual: toSafeNumber(station.sections?.construction?.actual?.[kind]),
                })),
            };

            return {
                ...station,
                histogramDataBySection,
            };
        });
    }, [stationsData]);

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Dashboard by Kind of Work
                            </h1>
                            <p className="mt-2 text-sm text-slate-600">
                                Planned vs Actual progress by station, section, and work type.
                            </p>
                        </div>

                        <div className="no-print">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                            >
                                Print / Download PDF
                            </button>
                        </div>
                    </div>
                </header>

                {loading && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                        Loading station data...
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
                        {error}
                    </div>
                )}

                {!loading &&
                    !error &&
                    stationsWithHistogramData.map((station) => (
                        <section
                            key={station.stationNumber}
                            className="station-page rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <h2 className="text-xl font-semibold text-slate-900">
                                Station {station.stationNumber}
                            </h2>

                            <div className="mt-5 space-y-8">
                                {SECTIONS.map((section) => (
                                    <div
                                        key={`${station.stationNumber}-${section.key}`}
                                        className="station-section"
                                    >
                                        <h3 className="mb-4 text-lg font-semibold text-slate-800">
                                            {section.label}
                                        </h3>
                                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
                                            {WORK_TYPES.map((workType) => (
                                                <PieComparisonChart
                                                    key={`${station.stationNumber}-${section.key}-${workType}`}
                                                    title={`${workType.charAt(0).toUpperCase()}${workType.slice(1)}`}
                                                    planned={
                                                        station.sections?.[section.key]?.planned?.[workType] || 0
                                                    }
                                                    actual={
                                                        station.sections?.[section.key]?.actual?.[workType] || 0
                                                    }
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="station-section">
                                    <h3 className="mb-4 text-lg font-semibold text-slate-800">
                                        Histograms
                                    </h3>
                                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                                        <HistogramChart
                                            title="Engineering Histogram"
                                            data={station.histogramDataBySection.engineering}
                                        />
                                        <HistogramChart
                                            title="Procurement Histogram"
                                            data={station.histogramDataBySection.procurement}
                                        />
                                        <HistogramChart
                                            title="Construction Histogram"
                                            data={station.histogramDataBySection.construction}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}
            </div>
            <style jsx global>{`
        @media print {
          body {
            background: white;
          }

          .no-print {
            display: none !important;
          }

          .station-page {
            page-break-after: always;
            break-after: page;
          }

          .dashboard-card {
            page-break-inside: avoid;
            break-inside: avoid;
            -webkit-column-break-inside: avoid;
          }

          .station-section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
        </div>
    );
}
