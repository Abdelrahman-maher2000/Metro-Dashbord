'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    FirestoreError,
    DocumentData,
    serverTimestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import * as XLSX from 'xlsx-js-style';
import { Download } from 'lucide-react';

type DisciplineKey = 'engineering' | 'procurement' | 'construction';

const DISCIPLINES: DisciplineKey[] = [
    'engineering',
    'procurement',
    'construction',
];

type IssueImpact = 'High' | 'Medium' | 'Low';
type IssueStatus = 'Open' | 'Closed' | 'OnHold';

interface IssueRecord {
    id: string;
    IssueName: string;
    IssueImpact: IssueImpact | string;
    IssueStatus: IssueStatus | string;
    IssueDisciplineType: string;
    discipline: DisciplineKey;
    stationId: string;
    stationName: string;
}

interface StationIssues {
    stationId: string;
    stationName: string;
    issues: IssueRecord[];
}

interface IssueFormState {
    IssueName: string;
    IssueImpact: IssueImpact;
    IssueStatus: IssueStatus;
    IssueDisciplineType: string;
    discipline: DisciplineKey;
}

interface SubmitState {
    status: string | null;
    error: string | null;
    busy: boolean;
}

const defaultForm = (): IssueFormState => ({
    IssueName: '',
    IssueImpact: 'High',
    IssueStatus: 'Open',
    IssueDisciplineType: '',
    discipline: 'engineering',
});

function IssueTable({
    issues,
    onEdit,
    onDelete,
    canEdit = true,
}: {
    issues: IssueRecord[];
    onEdit: (issue: IssueRecord) => void;
    onDelete: (issue: IssueRecord) => void;
    canEdit?: boolean;
}) {
    if (!issues.length) {
        return (
            <div className="text-sm text-gray-600 border border-gray-200 rounded-md p-4 bg-white">
                No issues found
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-left text-gray-700">
                    <tr>
                        <th className="px-4 py-2 border-b">Issue Name</th>
                        <th className="px-4 py-2 border-b">Impact</th>
                        <th className="px-4 py-2 border-b">Status</th>
                        <th className="px-4 py-2 border-b">Category of Work</th>
                        <th className="px-4 py-2 border-b">Discipline</th>
                        <th className="px-4 py-2 border-b text-right">
                            {canEdit ? 'Actions' : ''}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {issues.map((issue, idx) => (
                        <tr
                            key={issue.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                            <td className="px-4 py-2 border-b text-gray-900">
                                {issue.IssueName}
                            </td>
                            <td className="px-4 py-2 border-b">
                                <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                        issue.IssueImpact === 'High'
                                            ? 'bg-red-100 text-red-700'
                                            : issue.IssueImpact === 'Medium'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-green-100 text-green-700'
                                    }`}
                                >
                                    {issue.IssueImpact}
                                </span>
                            </td>
                            <td className="px-4 py-2 border-b">
                                <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                        issue.IssueStatus === 'Open'
                                            ? 'bg-blue-100 text-blue-700'
                                            : issue.IssueStatus === 'OnHold'
                                            ? 'bg-gray-200 text-gray-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                >
                                    {issue.IssueStatus}
                                </span>
                            </td>
                            <td className="px-4 py-2 border-b">
                                {issue.IssueDisciplineType}
                            </td>
                            <td className="px-4 py-2 border-b capitalize text-gray-800">
                                {issue.discipline}
                            </td>
                            <td className="px-4 py-2 border-b text-right space-x-2">
                                {canEdit && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onEdit(issue)}
                                            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100 hover:scale-[1.02] active:scale-100"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(issue)}
                                            className="inline-flex items-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 transition-all duration-200 hover:bg-red-50 hover:scale-[1.02] active:scale-100"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function IssuesClient() {
    const [stations, setStations] = useState<StationIssues[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState<
        IssueFormState & { stationId: string }
    >({ ...defaultForm(), stationId: '' });
    const [createState, setCreateState] = useState<SubmitState>({
        status: null,
        error: null,
        busy: false,
    });
    const [openCreate, setOpenCreate] = useState(false);
    const [currentUser, setCurrentUser] = useState<{
        uid: string;
        email?: string | null;
    } | null>(null);
    const [editTarget, setEditTarget] = useState<{
        stationId: string;
        discipline: DisciplineKey;
        issue: IssueRecord;
    } | null>(null);
    const [editForm, setEditForm] = useState<IssueFormState>(defaultForm());
    const [editBusy, setEditBusy] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{
        stationId: string;
        discipline: DisciplineKey;
        issue: IssueRecord;
    } | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [stationFilter, setStationFilter] = useState<string>('all');
    const [exporting, setExporting] = useState(false);

    const exportToExcel = () => {
        if (!sortedStations.length) return;
        setExporting(true);
        try {
            const workbook = XLSX.utils.book_new();

            const applyCellStyle = (
                sheet: XLSX.WorkSheet,
                cellRef: string,
                style: Partial<XLSX.CellObject['s']>,
            ) => {
                const cell = sheet[cellRef];
                if (!cell) return;
                cell.s = { ...(cell.s || {}), ...style };
            };

            const addMerge = (sheet: XLSX.WorkSheet, s: number, e: number, row: number) => {
                if (!sheet['!merges']) sheet['!merges'] = [];
                sheet['!merges'].push({
                    s: { r: row, c: s },
                    e: { r: row, c: e },
                });
            };

            const borderAll = {
                border: {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } },
                },
            };

            const stationTitleStyle = {
                font: { bold: true, sz: 14, color: { rgb: 'F54927' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: 'E0E0E0' } },
                ...borderAll,
            };

            const disciplineHeaderStyle = {
                font: { bold: true, sz: 12, color: { argb: 'FF0F172A' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: '00B0F0' } },
                ...borderAll,
            };

            const tableHeaderStyle = {
                font: { bold: true, color: { argb: 'FF0F172A' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: 'A19850' } },
                ...borderAll,
            };

            const impactFill = (impact?: string) => {
                switch ((impact || '').toLowerCase()) {
                    case 'high':
                        return { fgColor: { rgb: 'C21717' }, color: { rgb: '000000' } };
                    case 'medium':
                        return { fgColor: { rgb: 'FFFD00' }, color: { argb: '000000' } };
                    case 'low':
                        return { fgColor: { argb: '059E67' }, color: { argb: '000000' } };
                    default:
                        return { fgColor: { argb: 'FFFFFFFF' }, color: { argb: 'FF0F172A' } };
                }
            };

            const statusFill = (status?: string) => {
                switch ((status || '').toLowerCase()) {
                    case 'open':
                        return { fgColor: { rgb: 'C21717' }, color: { argb: 'FF1D4ED8' } };
                    case 'onhold':
                        return { fgColor: { rgb: 'FFFD00' }, color: { argb: 'FF374151' } };
                    case 'closed':
                        return { fgColor: { rgb: '059E67' }, color: { argb: 'FF166534' } };
                    default:
                        return { fgColor: { argb: 'FFFFFFFF' }, color: { argb: 'FF0F172A' } };
                }
            };

            const summaryHeaderStyle = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: '1D4ED8' } },
                ...borderAll,
            };

            const zebraFill = (isOdd: boolean) =>
                isOdd
                    ? { fgColor: { rgb: 'F8FAFC' } }
                    : { fgColor: { rgb: 'FFFFFF' } };

            sortedStations.forEach((station) => {
                const rows: (string | undefined)[][] = [];
                const stationTitle = station.stationName || station.stationId;

                // Station title row
                rows.push([stationTitle, '', '', '', '']);

                DISCIPLINES.forEach((discipline) => {
                    const disciplineIssues = station.issues.filter(
                        (iss) => iss.discipline === discipline,
                    );

                    // Spacer row between disciplines
                    if (rows.length > 1) rows.push(['', '', '', '', '']);

                    // Discipline header row
                    rows.push([
                        `${discipline.charAt(0).toUpperCase()}${discipline.slice(1)}`,
                        '',
                        '',
                        '',
                        '',
                    ]);

                    // Table header row
                    rows.push([
                        'Issue Name',
                        'Impact',
                        'Status',
                        'Category of Work',
                        'Discipline',
                    ]);

                    if (disciplineIssues.length === 0) {
                        rows.push(['No issues', '', '', '', '']);
                    } else {
                        disciplineIssues.forEach((issue) => {
                            rows.push([
                                issue.IssueName,
                                issue.IssueImpact as string,
                                issue.IssueStatus as string,
                                issue.IssueDisciplineType,
                                issue.discipline,
                            ]);
                        });
                    }
                });

                const sheet = XLSX.utils.aoa_to_sheet(rows);
                sheet['!cols'] = [
                    { wch: 32 },
                    { wch: 14 },
                    { wch: 14 },
                    { wch: 26 },
                    { wch: 18 },
                ];

                // Freeze header (station title + first discipline header + table header = row 3)
                sheet['!freeze'] = { xSplit: 0, ySplit: 3 };

                if (!sheet['!merges']) sheet['!merges'] = [];

                // Apply merges and styles
                let rowIdx = 0;
                // Station title merge
                addMerge(sheet, 0, 4, rowIdx);
                applyCellStyle(sheet, XLSX.utils.encode_cell({ r: rowIdx, c: 0 }), stationTitleStyle);
                rowIdx++;

                DISCIPLINES.forEach((discipline) => {
                    const disciplineIssues = station.issues.filter(
                        (iss) => iss.discipline === discipline,
                    );

                    // Optional spacer
                    if (rowIdx > 1) {
                        // leave spacer row as-is
                        rowIdx++;
                    }

                    // Discipline header merge
                    addMerge(sheet, 0, 4, rowIdx);
                    applyCellStyle(
                        sheet,
                        XLSX.utils.encode_cell({ r: rowIdx, c: 0 }),
                        disciplineHeaderStyle,
                    );
                    rowIdx++;

                    // Table header
                    const headerRowIdx = rowIdx;
                    ['A', 'B', 'C', 'D', 'E'].forEach((col, idx) => {
                        applyCellStyle(sheet, `${col}${headerRowIdx + 1}`, tableHeaderStyle);
                    });
                    rowIdx++;

                    if (disciplineIssues.length === 0) {
                        // Single "No issues" row
                        applyCellStyle(
                            sheet,
                            XLSX.utils.encode_cell({ r: rowIdx, c: 0 }),
                            { ...borderAll, alignment: { horizontal: 'left' } },
                        );
                        rowIdx++;
                    } else {
                        disciplineIssues.forEach((issue) => {
                            // Issue Name
                            applyCellStyle(
                                sheet,
                                XLSX.utils.encode_cell({ r: rowIdx, c: 0 }),
                                { ...borderAll },
                            );
                            // Impact
                            applyCellStyle(
                                sheet,
                                XLSX.utils.encode_cell({ r: rowIdx, c: 1 }),
                                {
                                    ...borderAll,
                                    fill: impactFill(issue.IssueImpact as string),
                                    alignment: { horizontal: 'center' },
                                },
                            );
                            // Status
                            applyCellStyle(
                                sheet,
                                XLSX.utils.encode_cell({ r: rowIdx, c: 2 }),
                                {
                                    ...borderAll,
                                    fill: statusFill(issue.IssueStatus as string),
                                    alignment: { horizontal: 'center' },
                                },
                            );
                            // Category
                            applyCellStyle(
                                sheet,
                                XLSX.utils.encode_cell({ r: rowIdx, c: 3 }),
                                { ...borderAll },
                            );
                            // Discipline
                            applyCellStyle(
                                sheet,
                                XLSX.utils.encode_cell({ r: rowIdx, c: 4 }),
                                { ...borderAll },
                            );
                            rowIdx++;
                        });
                    }
                });

                const safeName = (stationTitle || 'Sheet').slice(0, 31);
                XLSX.utils.book_append_sheet(workbook, sheet, safeName || 'Sheet');
            });

            const filename = `Area_of_Concern_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, filename, { compression: true });

            // Build summary sheet (All Stations)
            const summaryRows: (string | undefined)[][] = [];
            summaryRows.push([
                'Station Name',
                'Station ID',
                'Discipline',
                'Issue Name',
                'Impact',
                'Status',
                'Category of Work',
            ]);

            sortedStations.forEach((station) => {
                DISCIPLINES.forEach((discipline) => {
                    const disciplineIssues = station.issues.filter(
                        (iss) => iss.discipline === discipline,
                    );
                    disciplineIssues.forEach((issue) => {
                        summaryRows.push([
                            station.stationName || station.stationId,
                            station.stationId,
                            discipline,
                            issue.IssueName,
                            issue.IssueImpact as string,
                            issue.IssueStatus as string,
                            issue.IssueDisciplineType,
                        ]);
                    });
                });
            });

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
            summarySheet['!freeze'] = { xSplit: 0, ySplit: 1 };
            summarySheet['!autofilter'] = {
                ref: `A1:G${summaryRows.length}`,
            };
            summarySheet['!cols'] = [
                { wch: 24 },
                { wch: 16 },
                { wch: 14 },
                { wch: 30 },
                { wch: 12 },
                { wch: 12 },
                { wch: 24 },
            ];

            // Style header
            const headerCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
            headerCols.forEach((col, idx) => {
                const ref = `${col}1`;
                applyCellStyle(summarySheet, ref, summaryHeaderStyle);
            });

            // Style data rows with zebra striping and conditional colors
            for (let r = 1; r < summaryRows.length; r++) {
                const isOdd = r % 2 === 1;
                headerCols.forEach((col, idx) => {
                    const ref = `${col}${r + 1}`;
                    const baseFill =
                        idx === 4
                            ? impactFill(summaryRows[r][4] as string)
                            : idx === 5
                            ? statusFill(summaryRows[r][5] as string)
                            : zebraFill(isOdd);
                    const fillOnly =
                        'fgColor' in baseFill ? { fill: { fgColor: baseFill.fgColor } } : {};
                    const fontOnly = 'color' in baseFill ? { font: { color: baseFill.color } } : {};
                    applyCellStyle(summarySheet, ref, {
                        ...borderAll,
                        ...fillOnly,
                        ...fontOnly,
                        alignment: idx === 4 || idx === 5 ? { horizontal: 'center' } : undefined,
                    });
                });
            }

            XLSX.utils.book_append_sheet(workbook, summarySheet, 'All Stations');
        } finally {
            setExporting(false);
        }
    };

    const issueUnsubs = useRef<Record<string, (() => void)[]>>({});
    const stationsMeta = useRef<Record<string, { stationName: string }>>({});

    // Cleanup all issue listeners
    const cleanupIssueListeners = () => {
        Object.values(issueUnsubs.current).forEach((unsubs) => {
            unsubs.forEach((fn) => fn && fn());
        });
        issueUnsubs.current = {};
    };

    // Subscribe to issues for a station across disciplines
    const subscribeStationIssues = (stationId: string, stationName: string) => {
        const unsubs: (() => void)[] = [];

        DISCIPLINES.forEach((discipline) => {
            const issuesRef = collection(
                db,
                'areaOfConcern',
                stationId,
                'disciplines',
                discipline,
                'issues',
            );
            const q = query(issuesRef);

            const unsub = onSnapshot(
                q,
                (snapshot) => {
                    const issues = snapshot.docs.map((docSnap) => ({
                        ...(docSnap.data() as DocumentData),
                        id: docSnap.id,
                        discipline,
                        stationId,
                        stationName,
                    })) as IssueRecord[];

                    setStations((prev) => {
                        const existing = prev.find((s) => s.stationId === stationId);
                        const merged = issues;

                        if (existing) {
                            const filtered = prev.map((s) =>
                                s.stationId === stationId
                                    ? {
                                          ...s,
                                          stationName,
                                          issues: [
                                              ...merged,
                                              // keep other discipline issues from current state
                                              ...s.issues.filter(
                                                  (iss) => iss.discipline !== discipline,
                                              ),
                                          ],
                                      }
                                    : s,
                            );
                            return filtered;
                        }

                        return [
                            ...prev,
                            {
                                stationId,
                                stationName,
                                issues: merged,
                            },
                        ];
                    });
                },
                (err: FirestoreError) => {
                    console.error('Issues subscription failed', err);
                    setError(
                        'Failed to load issues. Please check permissions or connectivity.',
                    );
                },
            );

            unsubs.push(unsub);
        });

        issueUnsubs.current[stationId] = unsubs;
    };

    useEffect(() => {
        let unsubStations: (() => void) | null = null;

        const unsubAuth = onAuthStateChanged(auth, (user) => {
            // Clear previous listeners when auth changes
            cleanupIssueListeners();
            if (unsubStations) {
                unsubStations();
                unsubStations = null;
            }

            if (!user) {
                if (unsubStations) {
                    unsubStations();
                    unsubStations = null;
                }
                setCurrentUser(null);
                setStations([]);
                setLoading(false);
                return;
            }
            setCurrentUser({ uid: user.uid, email: user.email });

            const stationsRef = collection(db, 'areaOfConcern');
            const isAdmin =
                user.email === 'admin@metro4thline.com' ||
                user.email === 'reg@metro4thline.com';

            const stationsQuery = isAdmin
                ? stationsRef
                : query(
                    stationsRef,
                    where('allowedUsers', 'array-contains', user.uid),
                );

            unsubStations = onSnapshot(
                stationsQuery,
                (snapshot) => {
                    const stationEntries = snapshot.docs.map((docSnap) => {
                        const data = docSnap.data();
                        const stationName =
                            (data?.stationName as string) || docSnap.id || 'Station';
                        return {
                            stationId: docSnap.id,
                            stationName,
                        };
                    });

                    // Track meta and start listeners
                    const newMeta: Record<string, { stationName: string }> = {};
                    stationEntries.forEach(({ stationId, stationName }) => {
                        newMeta[stationId] = { stationName };
                        if (!issueUnsubs.current[stationId]) {
                            subscribeStationIssues(stationId, stationName);
                        }
                    });

                    // Remove listeners for deleted stations
                    Object.keys(issueUnsubs.current).forEach((stationId) => {
                        if (!newMeta[stationId]) {
                            issueUnsubs.current[stationId]?.forEach((fn) => fn && fn());
                            delete issueUnsubs.current[stationId];
                        }
                    });

                    stationsMeta.current = newMeta;

                    // Ensure state has entries for stations even if no issues yet
                    setStations((prev) => {
                        const next = [...prev];
                        stationEntries.forEach(({ stationId, stationName }) => {
                            if (!next.find((s) => s.stationId === stationId)) {
                                next.push({ stationId, stationName, issues: [] });
                            }
                        });
                        // Remove stations no longer present
                        return next.filter((s) => !!newMeta[s.stationId]);
                    });

                    // Initialize create form station if empty
                    if (!createForm.stationId && stationEntries.length) {
                        setCreateForm((prev) => ({
                            ...prev,
                            stationId: stationEntries[0].stationId,
                        }));
                    }

                    setLoading(false);
                },
                (err: FirestoreError) => {
                    console.error('Stations subscription failed', err);
                    setError(
                        'Failed to load stations. Please check permissions or connectivity.',
                    );
                    setLoading(false);
                },
            );
        });

        return () => {
            if (unsubStations) {
                unsubStations();
                unsubStations = null;
            }
            unsubAuth();
            cleanupIssueListeners();
        };
    }, [createForm.stationId]);

    const sortedStations = useMemo(
        () =>
            [...stations].sort((a, b) =>
                a.stationId.localeCompare(b.stationId, undefined, {
                    numeric: true,
                }),
            ),
        [stations],
    );
    const visibleStations = useMemo(
        () =>
            stationFilter === 'all'
                ? sortedStations
                : sortedStations.filter((s) => s.stationId === stationFilter),
        [sortedStations, stationFilter],
    );
    const hasData = useMemo(
        () => sortedStations.some((s) => s.issues.length > 0),
        [sortedStations],
    );

    const handleSubmit = async () => {
        const stationId = createForm.stationId;
        if (!stationId) {
            setCreateState({
                status: null,
                error: 'Please select a station.',
                busy: false,
            });
            return;
        }

        if (!createForm.IssueName.trim() || !createForm.IssueDisciplineType.trim()) {
            setCreateState({
                status: null,
                error: 'Issue Name and Discipline Type are required.',
                busy: false,
            });
            return;
        }

        const discipline = createForm.discipline;
        const issuesRef = collection(
            db,
            'areaOfConcern',
            stationId,
            'disciplines',
            discipline,
            'issues',
        );

        setCreateState({ status: null, error: null, busy: true });

        try {
            await addDoc(issuesRef, {
                IssueName: createForm.IssueName.trim(),
                IssueImpact: createForm.IssueImpact,
                IssueStatus: createForm.IssueStatus,
                IssueDisciplineType: createForm.IssueDisciplineType.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setCreateState({ status: null, error: null, busy: false });
            setCreateForm((prev) => ({
                ...defaultForm(),
                stationId: prev.stationId,
            }));
            setOpenCreate(false);
        } catch (err) {
            console.error('Failed to create issue', err);
            setCreateState({
                status: null,
                error: 'Failed to create issue. Check permissions or try again.',
                busy: false,
            });
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 text-gray-900">
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                <header className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 shadow-sm">
                        Live
                        <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold text-slate-900">
                            Area Of Concern
                        </h1>
                        <p className="text-slate-600">
                            Issues grouped by station and discipline with quick add.
                        </p>
                    </div>
                </header>

                {loading && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
                        Loading issues...
                    </div>
                )}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                        {error}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-slate-600">Filter by station:</label>
                        <select
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                            value={stationFilter}
                            onChange={(e) => setStationFilter(e.target.value)}
                        >
                            <option value="all">All Stations</option>
                            {sortedStations.map((s) => (
                                <option key={s.stationId} value={s.stationId}>
                                    {s.stationName || s.stationId}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={exportToExcel}
                            disabled={!sortedStations.length || !hasData || exporting}
                            className="inline-flex items-center gap-2 text-sm rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-100 disabled:opacity-50"
                        >
                            <Download size={16} />
                            {exporting ? 'Exporting...' : 'Export to Excel'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!createForm.stationId && stations.length) {
                                    setCreateForm((prev) => ({
                                        ...prev,
                                        stationId: stations[0].stationId,
                                    }));
                                }
                                setCreateState({ status: null, error: null, busy: false });
                                setOpenCreate(true);
                            }}
                            className="text-sm rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-100"
                        >
                            Add issue
                        </button>
                    </div>
                </div>

                {!loading && !sortedStations.length && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 shadow-sm">
                        No stations found. Ensure initialization has been performed and
                        you have permission to read.
                    </div>
                )}

                <div className="grid gap-6">
                    {visibleStations.map((station) => (
                        <section
                            key={station.stationId}
                            className="group relative space-y-4 overflow-hidden rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                        >
                            <span className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-sky-400 to-blue-500" />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
                                        {station.stationName || station.stationId}
                                    </h2>
                                    <p className="text-sm text-slate-500">
                                        Station ID: {station.stationId}
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                                    {station.issues.length} issues
                                </span>
                            </div>
                            <div className="space-y-5">
                                {DISCIPLINES.map((disciplineKey) => {
                                    const filtered = station.issues.filter(
                                        (iss) => iss.discipline === disciplineKey,
                                    );
                                    const heading =
                                        disciplineKey.charAt(0).toUpperCase() +
                                        disciplineKey.slice(1);
                                    return (
                                        <div
                                            key={disciplineKey}
                                            className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/70 p-3 transition-all duration-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-lg font-semibold text-slate-900">
                                                    {heading}
                                                </h4>
                                                <span className="text-xs text-slate-500">
                                                    {filtered.length} item(s)
                                                </span>
                                            </div>
                                            <IssueTable
                                                issues={filtered}
                                                canEdit={
                                                    currentUser?.email !==
                                                    'reg@metro4thline.com'
                                                }
                                                onEdit={(issue) => {
                                                    setEditTarget({
                                                        stationId: station.stationId,
                                                        discipline: disciplineKey,
                                                        issue,
                                                    });
                                                    setEditForm({
                                                        IssueName: issue.IssueName ?? '',
                                                        IssueImpact:
                                                            (issue.IssueImpact as IssueImpact) ??
                                                            'High',
                                                        IssueStatus:
                                                            (issue.IssueStatus as IssueStatus) ??
                                                            'Open',
                                                        IssueDisciplineType:
                                                            issue.IssueDisciplineType ?? '',
                                                        discipline:
                                                            (issue.discipline as DisciplineKey) ??
                                                            disciplineKey,
                                                    });
                                                    setEditError(null);
                                                    setEditBusy(false);
                                                }}
                                                onDelete={(issue) => {
                                                    setDeleteTarget({
                                                        stationId: station.stationId,
                                                        discipline: disciplineKey,
                                                        issue,
                                                    });
                                                    setDeleteError(null);
                                                    setDeleteBusy(false);
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            {openCreate && (
                <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 transition-all duration-300 ease-out">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-semibold">Add Issue</h3>
                                <p className="text-sm text-slate-500">
                                    Select station and enter issue details.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpenCreate(false)}
                                className="text-sm text-slate-600 hover:text-slate-900"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Station
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={createForm.stationId}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            stationId: e.target.value,
                                        }))
                                    }
                                >
                                    {sortedStations.map((s) => (
                                        <option key={s.stationId} value={s.stationId}>
                                            {s.stationName || s.stationId}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Issue Name
                                <input
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={createForm.IssueName}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            IssueName: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Discipline Type
                                <input
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={createForm.IssueDisciplineType}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            IssueDisciplineType: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Impact
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={createForm.IssueImpact}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            IssueImpact: e.target.value as IssueImpact,
                                        }))
                                    }
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Status
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={createForm.IssueStatus}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            IssueStatus: e.target.value as IssueStatus,
                                        }))
                                    }
                                >
                                    <option value="Open">Open</option>
                                    <option value="Closed">Closed</option>
                                    <option value="OnHold">OnHold</option>
                                </select>
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Discipline
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={createForm.discipline}
                                    onChange={(e) =>
                                        setCreateForm((prev) => ({
                                            ...prev,
                                            discipline: e.target.value as DisciplineKey,
                                        }))
                                    }
                                >
                                    {DISCIPLINES.map((d) => (
                                        <option key={d} value={d}>
                                            {d}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="space-y-1 text-slate-600">
                                {createState.error && (
                                    <p className="text-red-600">{createState.error}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpenCreate(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 text-sm shadow-sm transition-all duration-200 hover:bg-slate-100 hover:scale-[1.02] active:scale-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={createState.busy}
                                    className="rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-white text-sm shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-100 disabled:opacity-60"
                                >
                                    {createState.busy ? 'Saving...' : 'Create Issue'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editTarget && (
                <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 transition-all duration-300 ease-out">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div>
                                <h3 className="text-lg font-semibold">Edit Issue</h3>
                                <p className="text-sm text-slate-500">
                                    {editTarget.issue.IssueName} —{' '}
                                    {editTarget.stationId} / {editTarget.discipline}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditTarget(null);
                                    setEditError(null);
                                }}
                                className="text-sm text-slate-600 hover:text-slate-900"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Issue Name
                                <input
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={editForm.IssueName}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            IssueName: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Discipline Type
                                <input
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={editForm.IssueDisciplineType}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            IssueDisciplineType: e.target.value,
                                        }))
                                    }
                                />
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Impact
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={editForm.IssueImpact}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            IssueImpact: e.target.value as IssueImpact,
                                        }))
                                    }
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Status
                                <select
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition-all"
                                    value={editForm.IssueStatus}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            IssueStatus: e.target.value as IssueStatus,
                                        }))
                                    }
                                >
                                    <option value="Open">Open</option>
                                    <option value="Closed">Closed</option>
                                    <option value="OnHold">OnHold</option>
                                </select>
                            </label>
                            <label className="text-sm text-gray-700 flex flex-col gap-1">
                                Discipline
                                <select
                                    disabled
                                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm capitalize shadow-sm bg-slate-50 text-slate-500"
                                    value={editForm.discipline}
                                    onChange={() => {}}
                                >
                                    <option value={editForm.discipline}>
                                        {editForm.discipline}
                                    </option>
                                </select>
                            </label>
                            <div className="text-sm text-slate-600 flex flex-col gap-1">
                                <span className="text-xs uppercase tracking-wide text-slate-500">
                                    Station
                                </span>
                                <span className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                                    {editTarget.stationId}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <div className="space-y-1 text-slate-600">
                                {editError && <p className="text-red-600">{editError}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditTarget(null);
                                        setEditError(null);
                                    }}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 text-sm shadow-sm transition-all duration-200 hover:bg-slate-100 hover:scale-[1.02] active:scale-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!editTarget) return;
                                        if (
                                            !editForm.IssueName.trim() ||
                                            !editForm.IssueDisciplineType.trim()
                                        ) {
                                            setEditError(
                                                'Issue Name and Discipline Type are required.',
                                            );
                                            return;
                                        }
                                        setEditBusy(true);
                                        setEditError(null);
                                        try {
                                            await updateDoc(
                                                doc(
                                                    db,
                                                    'areaOfConcern',
                                                    editTarget.stationId,
                                                    'disciplines',
                                                    editTarget.discipline,
                                                    'issues',
                                                    editTarget.issue.id,
                                                ),
                                                {
                                                    IssueName: editForm.IssueName.trim(),
                                                    IssueImpact: editForm.IssueImpact,
                                                    IssueStatus: editForm.IssueStatus,
                                                    IssueDisciplineType:
                                                        editForm.IssueDisciplineType.trim(),
                                                    updatedAt: serverTimestamp(),
                                                },
                                            );
                                            setEditTarget(null);
                                        } catch (err) {
                                            console.error('Failed to update issue', err);
                                            setEditError(
                                                'Failed to update issue. Please try again.',
                                            );
                                        } finally {
                                            setEditBusy(false);
                                        }
                                    }}
                                    disabled={editBusy}
                                    className="rounded-xl bg-linear-to-r from-sky-500 to-blue-600 px-4 py-2 text-white text-sm shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-100 disabled:opacity-60"
                                >
                                    {editBusy ? 'Saving...' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-10000 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-4 transition-all duration-300 ease-out">
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-slate-900">
                                Delete issue?
                            </h3>
                            <p className="text-sm text-slate-600">
                                {deleteTarget.issue.IssueName} — {deleteTarget.discipline} /{' '}
                                {deleteTarget.stationId}
                            </p>
                        </div>
                        {deleteError && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {deleteError}
                            </div>
                        )}
                        <div className="flex justify-end gap-2 text-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteTarget(null);
                                    setDeleteError(null);
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-100 hover:scale-[1.02] active:scale-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={deleteBusy}
                                onClick={async () => {
                                    if (!deleteTarget) return;
                                    setDeleteBusy(true);
                                    setDeleteError(null);
                                    try {
                                        await deleteDoc(
                                            doc(
                                                db,
                                                'areaOfConcern',
                                                deleteTarget.stationId,
                                                'disciplines',
                                                deleteTarget.discipline,
                                                'issues',
                                                deleteTarget.issue.id,
                                            ),
                                        );
                                        setDeleteTarget(null);
                                    } catch (err) {
                                        console.error('Failed to delete issue', err);
                                        setDeleteError(
                                            'Failed to delete issue. Please try again.',
                                        );
                                    } finally {
                                        setDeleteBusy(false);
                                    }
                                }}
                                className="rounded-xl bg-red-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-100 disabled:opacity-60"
                            >
                                {deleteBusy ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

