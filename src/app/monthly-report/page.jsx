"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { saveAs } from "file-saver";
import BlockedEmailGuard from "@/shared/components/BlockedEmailGuard";

const LOCATIONS = [
  { id: "station01", name: "Station 01" },
  { id: "openAir", name: "Open Air" },
  { id: "verticalShaft", name: "Vertical Shaft" },
  { id: "station02", name: "Station 02" },
  { id: "station03", name: "Station 03" },
  { id: "station04", name: "Station 04" },
  { id: "station05", name: "Station 05" },
  { id: "station06", name: "Station 06" },
  { id: "station07", name: "Station 07" },
  { id: "station08", name: "Station 08" },
  { id: "station09", name: "Station 09" },
  { id: "station10", name: "Station 10" },
  { id: "station11", name: "Station 11" },
  { id: "station12", name: "Station 12" },
];

const ADMIN_UIDS = ["uz0dBxZBcAREVmdBoqvx3hRWdo63"];

function getCurrentMonthInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const reportMonth = `${year}-${month}`;
  const periodStart = `${reportMonth}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const periodEnd = `${reportMonth}-${String(lastDay).padStart(2, "0")}`;
  return { reportMonth, periodStart, periodEnd };
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

function SummaryRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm text-slate-600">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="text-right text-slate-700">{children}</div>
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ExpandableTables({
  locationId,
  disabled,
  onEditRow,
  onDeleteRow,
}) {
  const [engineeringRows, setEngineeringRows] = useState([]);
  const [constructionRows, setConstructionRows] = useState([]);
  const [engineeringLoading, setEngineeringLoading] = useState(false);
  const [constructionLoading, setConstructionLoading] = useState(false);
  const [engineeringError, setEngineeringError] = useState("");
  const [constructionError, setConstructionError] = useState("");
  const [engForm, setEngForm] = useState({
    Document: "",
    Status: "",
    Date: "",
  });
  const [conForm, setConForm] = useState({
    Trade: "",
    ActualProgress: "",
    PlannedPercent: "",
  });
  const [engSaving, setEngSaving] = useState(false);
  const [conSaving, setConSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (disabled) return undefined;
    setEngineeringLoading(true);
    setConstructionLoading(true);
    const engineeringRef = collection(
      db,
      "monthlyReport",
      locationId,
      "engineering"
    );
    const constructionRef = collection(
      db,
      "monthlyReport",
      locationId,
      "construction"
    );

    const unsubscribeEngineering = onSnapshot(
      engineeringRef,
      (snapshot) => {
        const nextRows = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setEngineeringRows(nextRows);
        setEngineeringLoading(false);
      },
      (error) => {
        setEngineeringError(error.message || "Failed to load engineering rows.");
        setEngineeringLoading(false);
      }
    );

    const unsubscribeConstruction = onSnapshot(
      constructionRef,
      (snapshot) => {
        const nextRows = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setConstructionRows(nextRows);
        setConstructionLoading(false);
      },
      (error) => {
        setConstructionError(
          error.message || "Failed to load construction rows."
        );
        setConstructionLoading(false);
      }
    );

    return () => {
      unsubscribeEngineering();
      unsubscribeConstruction();
    };
  }, [disabled, locationId]);

  const handleAddEngineering = async (event) => {
    event.preventDefault();
    setEngineeringError("");
    if (!engForm.Document.trim() || !engForm.Status.trim() || !engForm.Date) {
      setEngineeringError("All engineering fields are required.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(engForm.Date.trim())) {
      setEngineeringError("Date must be in YYYY-MM-DD format.");
      return;
    }
    setEngSaving(true);
    try {
      await addDoc(
        collection(db, "monthlyReport", locationId, "engineering"),
        {
          Document: engForm.Document.trim(),
          Status: engForm.Status.trim(),
          Date: engForm.Date.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );
      setEngForm({ Document: "", Status: "", Date: "" });
    } catch (error) {
      setEngineeringError(error.message || "Failed to add engineering row.");
    } finally {
      setEngSaving(false);
    }
  };

  const handleAddConstruction = async (event) => {
    event.preventDefault();
    setConstructionError("");
    if (!conForm.Trade.trim() || conForm.ActualProgress === "") {
      setConstructionError("All construction fields are required.");
      return;
    }
    const progress = Number(conForm.ActualProgress);
    if (Number.isNaN(progress) || progress < 0 || progress > 100) {
      setConstructionError("Actual Progress must be between 0 and 100.");
      return;
    }
    let plannedValue;
    if (conForm.PlannedPercent !== "") {
      plannedValue = Number(conForm.PlannedPercent);
      if (Number.isNaN(plannedValue) || plannedValue < 0 || plannedValue > 100) {
        setConstructionError("Planned % must be between 0 and 100.");
        return;
      }
    }
    setConSaving(true);
    try {
      const payload = {
        Trade: conForm.Trade.trim(),
        ActualProgress: progress,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (plannedValue !== undefined) {
        payload.PlannedPercent = plannedValue;
      }
      await addDoc(
        collection(db, "monthlyReport", locationId, "construction"),
        payload
      );
      setConForm({ Trade: "", ActualProgress: "", PlannedPercent: "" });
    } catch (error) {
      setConstructionError(error.message || "Failed to add construction row.");
    } finally {
      setConSaving(false);
    }
  };

  if (disabled) {
    return null;
  }

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">
            Engineering Details
          </h4>
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs font-semibold text-indigo-600"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>

        {isExpanded && (
          <>
            <form
              onSubmit={handleAddEngineering}
              className="mt-3 grid gap-2 md:grid-cols-4"
            >
              <input
                type="text"
                placeholder="Document"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={engForm.Document}
                onChange={(event) =>
                  setEngForm((prev) => ({
                    ...prev,
                    Document: event.target.value,
                  }))
                }
              />
              <input
                type="text"
                placeholder="Status"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={engForm.Status}
                onChange={(event) =>
                  setEngForm((prev) => ({
                    ...prev,
                    Status: event.target.value,
                  }))
                }
              />
              <input
                type="date"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                value={engForm.Date}
                onChange={(event) =>
                  setEngForm((prev) => ({
                    ...prev,
                    Date: event.target.value,
                  }))
                }
              />
              <button
                type="submit"
                disabled={engSaving}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {engSaving ? "Adding..." : "Add Row"}
              </button>
            </form>

            {engineeringError && (
              <p className="mt-2 text-xs text-red-600">{engineeringError}</p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-[#D9E1F2] text-left uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Document</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {engineeringLoading && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-slate-500">
                        Loading engineering rows...
                      </td>
                    </tr>
                  )}
                  {!engineeringLoading && engineeringRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-slate-500">
                        No engineering rows yet.
                      </td>
                    </tr>
                  )}
                  {engineeringRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.Document || "--"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.Status || "--"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.Date || "--"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onEditRow(locationId, "engineering", row)
                            }
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onDeleteRow(locationId, "engineering", row)
                            }
                            className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">
            Construction Details
          </h4>
        </div>

        <form
          onSubmit={handleAddConstruction}
          className="mt-3 grid gap-2 md:grid-cols-4"
        >
          <input
            type="text"
            placeholder="Trade"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            value={conForm.Trade}
            onChange={(event) =>
              setConForm((prev) => ({
                ...prev,
                Trade: event.target.value,
              }))
            }
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Planned %"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            value={conForm.PlannedPercent}
            onChange={(event) =>
              setConForm((prev) => ({
                ...prev,
                PlannedPercent: event.target.value,
              }))
            }
          />
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Actual Progress %"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            value={conForm.ActualProgress}
            onChange={(event) =>
              setConForm((prev) => ({
                ...prev,
                ActualProgress: event.target.value,
              }))
            }
          />
          <button
            type="submit"
            disabled={conSaving}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {conSaving ? "Adding..." : "Add Row"}
          </button>
        </form>

        {constructionError && (
          <p className="mt-2 text-xs text-red-600">{constructionError}</p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-[#D9E1F2] text-left uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Trade</th>
                <th className="px-3 py-2">Actual %</th>
                <th className="px-3 py-2">Planned %</th>
                <th className="px-3 py-2">Variance</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {constructionLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500">
                    Loading construction rows...
                  </td>
                </tr>
              )}
              {!constructionLoading && constructionRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-slate-500">
                    No construction rows yet.
                  </td>
                </tr>
              )}
              {constructionRows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                >
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {row.Trade || "--"}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.ActualProgress === undefined ||
                    row.ActualProgress === null
                      ? "—"
                      : `${Number(row.ActualProgress).toFixed(2)}%`}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.PlannedPercent === undefined ||
                    row.PlannedPercent === null
                      ? "—"
                      : `${Number(row.PlannedPercent).toFixed(2)}%`}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {row.PlannedPercent === undefined ||
                    row.PlannedPercent === null ||
                    row.ActualProgress === undefined ||
                    row.ActualProgress === null
                      ? "—"
                      : `${Number(row.PlannedPercent - row.ActualProgress) >= 0 ? "+" : ""}${Number(
                          row.PlannedPercent - row.ActualProgress
                        ).toFixed(2)}`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditRow(locationId, "construction", row)}
                        className="rounded border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDeleteRow(locationId, "construction", row)
                        }
                        className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LocationCard({
  location,
  reportMonth,
  summary,
  expanded,
  onToggle,
  onEditRow,
  onDeleteRow,
}) {
  const noAccess = summary?.accessError;
  const missingDoc = summary?.missing;
  const latest = summary?.engineeringLatest;
  const engineeringRows = summary?.engineeringRows || [];
  const constructionRows = summary?.constructionRows || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {location.name}
          </h3>
          <p className="text-xs text-slate-400">{location.id}</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
          {reportMonth || "--"}
        </span>
      </div>

      {missingDoc && (
        <p className="mt-3 text-xs font-semibold text-amber-600">
          Location document missing.
        </p>
      )}

      {noAccess ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
          No access to this location.
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Engineering
              </h4>
              <span className="text-xs text-slate-500">
                {summary?.engineeringCount ?? 0} rows
              </span>
            </div>
            <div className="mt-3 space-y-2">
              <SummaryRow label="Latest">
                {latest ? (
                  <div className="text-right">
                    <div className="font-medium text-slate-700">
                      {latest.Document || "--"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {latest.Status || "--"} · {latest.Date || "--"}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">No data yet</span>
                )}
              </SummaryRow>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-[#D9E1F2] text-left uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Document</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {engineeringRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-3 text-xs text-slate-500"
                      >
                        No engineering rows yet.
                      </td>
                    </tr>
                  )}
                  {engineeringRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.Document || "--"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.Status || "--"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.Date || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Construction
              </h4>
              <span className="text-xs text-slate-500">
                {summary?.constructionCount ?? 0} rows
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-[#D9E1F2] text-left uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Trade</th>
                    <th className="px-3 py-2">Actual %</th>
                    <th className="px-3 py-2">Planned %</th>
                    <th className="px-3 py-2">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {constructionRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-3 text-xs text-slate-500"
                      >
                        No construction rows yet.
                      </td>
                    </tr>
                  )}
                  {constructionRows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.Trade || "--"}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.ActualProgress === undefined ||
                        row.ActualProgress === null
                          ? "—"
                          : `${Number(row.ActualProgress).toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.PlannedPercent === undefined ||
                        row.PlannedPercent === null
                          ? "—"
                          : `${Number(row.PlannedPercent).toFixed(2)}%`}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.PlannedPercent === undefined ||
                        row.PlannedPercent === null ||
                        row.ActualProgress === undefined ||
                        row.ActualProgress === null
                          ? "—"
                          : `${Number(row.PlannedPercent - row.ActualProgress) >= 0 ? "+" : ""}${Number(
                              row.PlannedPercent - row.ActualProgress
                            ).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className={classNames(
              "w-full rounded-lg px-3 py-2 text-sm font-semibold",
              expanded
                ? "bg-slate-100 text-slate-700"
                : "bg-indigo-600 text-white hover:bg-indigo-500"
            )}
          >
            {expanded ? "Hide Details" : "View Details"}
          </button>
        </div>
      )}

      {expanded && !noAccess && (
        <ExpandableTables
          locationId={location.id}
          onEditRow={onEditRow}
          onDeleteRow={onDeleteRow}
        />
      )}
    </div>
  );
}

function MonthlyReportApp({ currentUser }) {
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState(null);
  const [metaData, setMetaData] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [metaExists, setMetaExists] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [initMessage, setInitMessage] = useState("");
  const [locationAccess, setLocationAccess] = useState({});
  const [accessLoading, setAccessLoading] = useState(false);
  const [summaries, setSummaries] = useState({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [editingContext, setEditingContext] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formValues, setFormValues] = useState({
    Document: "",
    Status: "",
    Date: "",
    Trade: "",
    ActualProgress: "",
  });
  const [formError, setFormError] = useState("");
  const [editMonthOpen, setEditMonthOpen] = useState(false);
  const [monthForm, setMonthForm] = useState({
    reportMonth: "",
    periodStart: "",
    periodEnd: "",
  });

  const locationOptions = useMemo(() => LOCATIONS, []);
  const isAdmin = useMemo(
    () => Boolean(currentUser && ADMIN_UIDS.includes(currentUser.uid)),
    [currentUser]
  );
  const allowedLocationIds = useMemo(
    () =>
      locationOptions
        .filter((location) => locationAccess[location.id]?.hasAccess)
        .map((location) => location.id),
    [locationOptions, locationAccess]
  );
  const visibleLocations = useMemo(
    () =>
      locationOptions.filter(
        (location) => locationAccess[location.id]?.hasAccess
      ),
    [locationOptions, locationAccess]
  );

  useEffect(() => {
    if (!currentUser) return;
    const metaRef = doc(db, "monthlyReport", "meta");
    setMetaLoading(true);
    setMetaError(null);
    const unsubscribe = onSnapshot(
      metaRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setMetaData(data);
          setMetaExists(true);
          setInitialized(Boolean(data && data.initializedAt));
        } else {
          setMetaData(null);
          setMetaExists(false);
          setInitialized(false);
        }
        setMetaLoading(false);
      },
      (error) => {
        setMetaError(error.message || "Failed to load monthly report metadata.");
        setMetaLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!initialized || !currentUser) return;
    setAccessLoading(true);
    let pendingAccess = locationOptions.length;
    let isActive = true;

    const markAccessLoaded = () => {
      pendingAccess -= 1;
      if (pendingAccess <= 0 && isActive) {
        setAccessLoading(false);
      }
    };

    if (isAdmin) {
      const adminAccess = {};
      locationOptions.forEach((location) => {
        adminAccess[location.id] = { hasAccess: true, admin: true };
      });
      setLocationAccess(adminAccess);
      setAccessLoading(false);
      return () => {
        isActive = false;
      };
    }

    const accessUnsubscribes = locationOptions.map((location) => {
      const locationRef = doc(db, "monthlyReport", location.id);
      return onSnapshot(
        locationRef,
        (snapshot) => {
          if (!isActive) return;
          if (!snapshot.exists()) {
            setLocationAccess((prev) => ({
              ...prev,
              [location.id]: { hasAccess: false, missing: true },
            }));
            markAccessLoaded();
            return;
          }
          const data = snapshot.data();
          const allowedUsers = Array.isArray(data.allowedUsers)
            ? data.allowedUsers
            : [];
          const hasAccess = allowedUsers.includes(currentUser.uid);
          setLocationAccess((prev) => ({
            ...prev,
            [location.id]: { hasAccess, allowedUsers, missing: false },
          }));
          markAccessLoaded();
        },
        () => {
          if (!isActive) return;
          setLocationAccess((prev) => ({
            ...prev,
            [location.id]: { hasAccess: false, error: true },
          }));
          markAccessLoaded();
        }
      );
    });

    return () => {
      isActive = false;
      accessUnsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [initialized, currentUser, locationOptions, isAdmin]);

  useEffect(() => {
    if (!initialized || !currentUser) return;
    setSummariesLoading(true);
    setSummariesError(null);
    let isActive = true;
    let pending = allowedLocationIds.length * 2;
    if (pending === 0) {
      setSummariesLoading(false);
      return () => {};
    }

    const markLoaded = () => {
      pending -= 1;
      if (pending <= 0 && isActive) {
        setSummariesLoading(false);
      }
    };

    const sortEngineeringRows = (rows) => {
      const hasDate = rows.some((row) => row.Date);
      if (hasDate) {
        return [...rows].sort((a, b) =>
          String(b.Date || "").localeCompare(String(a.Date || ""))
        );
      }
      return [...rows].sort(
        (a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)
      );
    };

    const sortConstructionRows = (rows) => {
      return [...rows].sort((a, b) => {
        const aValue = Number(a.ActualProgress || 0);
        const bValue = Number(b.ActualProgress || 0);
        return bValue - aValue;
      });
    };

    const unsubscribes = allowedLocationIds.flatMap((locationId) => {
      const loaded = { eng: false, con: false };
      const engineeringRef = collection(
        db,
        "monthlyReport",
        locationId,
        "engineering"
      );
      const constructionRef = collection(
        db,
        "monthlyReport",
        locationId,
        "construction"
      );

      const unsubscribeEngineering = onSnapshot(
        engineeringRef,
        (snapshot) => {
          const rows = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          const sortedRows = sortEngineeringRows(rows);
          const latest = sortedRows[0] || null;
          if (!isActive) return;
          setSummaries((prev) => ({
            ...prev,
            [locationId]: {
              ...(prev[locationId] || {}),
              locationId,
              accessError: false,
              engineeringRows: sortedRows,
              engineeringCount: rows.length,
              engineeringLatest: latest,
            },
          }));
          if (!loaded.eng) {
            loaded.eng = true;
            markLoaded();
          }
        },
        (error) => {
          if (!isActive) return;
          setSummaries((prev) => ({
            ...prev,
            [locationId]: {
              ...(prev[locationId] || {}),
              locationId,
              accessError: true,
              errorMessage: error.message,
            },
          }));
          if (!loaded.eng) {
            loaded.eng = true;
            markLoaded();
          }
        }
      );

      const unsubscribeConstruction = onSnapshot(
        constructionRef,
        (snapshot) => {
          const rows = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          const sortedRows = sortConstructionRows(rows);
          if (!isActive) return;
          setSummaries((prev) => ({
            ...prev,
            [locationId]: {
              ...(prev[locationId] || {}),
              locationId,
              accessError: false,
              constructionRows: sortedRows,
              constructionCount: rows.length,
            },
          }));
          if (!loaded.con) {
            loaded.con = true;
            markLoaded();
          }
        },
        (error) => {
          if (!isActive) return;
          setSummaries((prev) => ({
            ...prev,
            [locationId]: {
              ...(prev[locationId] || {}),
              locationId,
              accessError: true,
              errorMessage: error.message,
            },
          }));
          if (!loaded.con) {
            loaded.con = true;
            markLoaded();
          }
        }
      );

      return [unsubscribeEngineering, unsubscribeConstruction];
    });

    return () => {
      isActive = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [initialized, currentUser, allowedLocationIds]);

  useEffect(() => {
    if (!metaData) return;
    setMonthForm({
      reportMonth: metaData.reportMonth || "",
      periodStart: metaData.periodStart || "",
      periodEnd: metaData.periodEnd || "",
    });
  }, [metaData]);

  const openEditModal = (locationId, tab, row) => {
    setEditingContext({ locationId, tab });
    setEditingRow(row);
    setFormError("");
    if (tab === "engineering") {
      setFormValues({
        Document: row.Document || "",
        Status: row.Status || "",
        Date: row.Date || "",
        Trade: "",
        ActualProgress: "",
        PlannedPercent: "",
      });
    } else {
      setFormValues({
        Document: "",
        Status: "",
        Date: "",
        Trade: row.Trade || "",
        ActualProgress:
          row.ActualProgress === undefined || row.ActualProgress === null
            ? ""
            : String(row.ActualProgress),
        PlannedPercent:
          row.PlannedPercent === undefined || row.PlannedPercent === null
            ? ""
            : String(row.PlannedPercent),
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingRow(null);
    setEditingContext(null);
  };

  const validateForm = () => {
    if (!editingContext) return "No row selected.";
    if (editingContext.tab === "engineering") {
      if (!formValues.Document.trim()) return "Document is required.";
      if (!formValues.Status.trim()) return "Status is required.";
      if (!formValues.Date.trim()) return "Date is required.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formValues.Date.trim())) {
        return "Date must be in YYYY-MM-DD format.";
      }
    } else {
      if (!formValues.Trade.trim()) return "Trade is required.";
      if (formValues.ActualProgress === "") {
        return "Actual Progress is required.";
      }
      const progressNumber = Number(formValues.ActualProgress);
      if (Number.isNaN(progressNumber)) {
        return "Actual Progress must be a number.";
      }
      if (progressNumber < 0 || progressNumber > 100) {
        return "Actual Progress must be between 0 and 100.";
      }
      if (formValues.PlannedPercent !== "") {
        const plannedNumber = Number(formValues.PlannedPercent);
        if (Number.isNaN(plannedNumber)) {
          return "Planned % must be a number.";
        }
        if (plannedNumber < 0 || plannedNumber > 100) {
          return "Planned % must be between 0 and 100.";
        }
      }
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!editingRow || !editingContext) return;
    try {
      const rowRef = doc(
        db,
        "monthlyReport",
        editingContext.locationId,
        editingContext.tab,
        editingRow.id
      );
      let payload;
      if (editingContext.tab === "engineering") {
        payload = {
          Document: formValues.Document.trim(),
          Status: formValues.Status.trim(),
          Date: formValues.Date.trim(),
          updatedAt: serverTimestamp(),
        };
      } else {
        payload = {
          Trade: formValues.Trade.trim(),
          ActualProgress: Number(formValues.ActualProgress),
          updatedAt: serverTimestamp(),
        };
        if (formValues.PlannedPercent === "") {
          payload.PlannedPercent = deleteField();
        } else {
          payload.PlannedPercent = Number(formValues.PlannedPercent);
        }
      }
      await updateDoc(rowRef, payload);
      closeModal();
    } catch (error) {
      setFormError(error.message || "Failed to update row.");
    }
  };

  const handleDelete = async (locationId, tab, row) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this row?"
    );
    if (!confirmed) return;
    try {
      const rowRef = doc(db, "monthlyReport", locationId, tab, row.id);
      await deleteDoc(rowRef);
    } catch (error) {
      setSummariesError(error.message || "Failed to delete row.");
    }
  };

  const handleInit = async () => {
    setInitLoading(true);
    setInitMessage("");
    setMetaError(null);
    try {
      const metaRef = doc(db, "monthlyReport", "meta");
      const metaSnapshot = await getDoc(metaRef);
      const defaults = getCurrentMonthInfo();
      const batch = writeBatch(db);

      if (!metaSnapshot.exists()) {
        batch.set(metaRef, {
          initializedAt: serverTimestamp(),
          initializedBy: currentUser?.uid || null,
          reportMonth: defaults.reportMonth,
          periodStart: defaults.periodStart,
          periodEnd: defaults.periodEnd,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(
          metaRef,
          {
            initializedAt: serverTimestamp(),
            initializedBy: currentUser?.uid || null,
            reportMonth: metaSnapshot.data()?.reportMonth || defaults.reportMonth,
            periodStart:
              metaSnapshot.data()?.periodStart || defaults.periodStart,
            periodEnd: metaSnapshot.data()?.periodEnd || defaults.periodEnd,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      LOCATIONS.forEach((location) => {
        const locationRef = doc(db, "monthlyReport", location.id);
        batch.set(locationRef, {
          locationId: location.id,
          locationName: location.name,
          allowedUsers: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setInitialized(true);
      setInitMessage("Monthly report structure initialized successfully.");
    } catch (error) {
      setMetaError(error.message || "Initialization failed.");
    } finally {
      setInitLoading(false);
    }
  };

  const getTimestampValue = (value) => {
    if (!value) return 0;
    if (typeof value === "number") return value;
    if (typeof value?.toMillis === "function") return value.toMillis();
    if (value?.seconds) return value.seconds * 1000;
    return 0;
  };

  const handleExport = async () => {
    setExporting(true);
    setSummariesError(null);
    const reportMonth = metaData?.reportMonth || "Unknown";
    const exportDate = new Date().toLocaleString();
    const content = [
      new Paragraph({
        text: `Monthly Report - ${reportMonth}`,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        text: `Generated: ${exportDate}`,
        spacing: { after: 300 },
      }),
      new Paragraph({
        text: "Engineering",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      }),
    ];

    const buildTable = (headers, rows) => {
      const headerRow = new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
              shading: {
                type: ShadingType.CLEAR,
                color: "auto",
                fill: "D9E1F2",
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: header, bold: true, size: 26 }),
                  ],
                }),
              ],
            })
        ),
      });

      const bodyRows = rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  width: {
                    size: 100 / headers.length,
                    type: WidthType.PERCENTAGE,
                  },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell || "--",
                          size: 24,
                        }),
                      ],
                    }),
                  ],
                })
            ),
          })
      );

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows],
      });
    };

    for (const location of LOCATIONS) {
      content.push(
        new Paragraph({
          children: [new TextRun({ text: location.name, size: 28, bold: true })],
          heading: HeadingLevel.HEADING_2,
        })
      );
      try {
        const engineeringRef = collection(
          db,
          "monthlyReport",
          location.id,
          "engineering"
        );
        const engineeringSnapshot = await getDocs(engineeringRef);
        const engineeringRows = engineeringSnapshot.docs.map((docSnap) =>
          docSnap.data()
        );
        const hasDate = engineeringRows.some((row) => row.Date);
        const sortedEngineering = [...engineeringRows].sort((a, b) => {
          if (hasDate) {
            return String(b.Date || "").localeCompare(String(a.Date || ""));
          }
          return (
            getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt)
          );
        });

        if (sortedEngineering.length === 0) {
          content.push(
            new Paragraph({
              text: "No engineering records.",
              spacing: { after: 200 },
            })
          );
        } else {
          content.push(
            buildTable(
              ["Document", "Status", "Date"],
              sortedEngineering.map((row) => [
                row.Document || "--",
                row.Status || "--",
                row.Date || "--",
              ])
            ),
            new Paragraph({ text: "", spacing: { after: 200 } })
          );
        }
      } catch (error) {
        content.push(
          new Paragraph({
            text: "No access to read this location.",
            spacing: { after: 200 },
          })
        );
      }
    }

    content.push(
      new Paragraph({
        text: "Construction",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 },
      })
    );

    for (const location of LOCATIONS) {
      content.push(
        new Paragraph({
          children: [new TextRun({ text: location.name, size: 28, bold: true })],
          heading: HeadingLevel.HEADING_2,
        })
      );
      try {
        const constructionRef = collection(
          db,
          "monthlyReport",
          location.id,
          "construction"
        );
        const constructionSnapshot = await getDocs(constructionRef);
        const constructionRows = constructionSnapshot.docs.map((docSnap) =>
          docSnap.data()
        );
        const sortedConstruction = [...constructionRows].sort((a, b) => {
          const aValue = Number(a.ActualProgress || 0);
          const bValue = Number(b.ActualProgress || 0);
          return bValue - aValue;
        });

        if (sortedConstruction.length === 0) {
          content.push(
            new Paragraph({
              text: "No construction records.",
              spacing: { after: 200 },
            })
          );
        } else {
          content.push(
            buildTable(
              ["Trade", "Actual Progress (%)"],
              sortedConstruction.map((row) => [
                row.Trade || "--",
                `${Number(row.ActualProgress || 0)}%`,
              ])
            ),
            new Paragraph({ text: "", spacing: { after: 200 } })
          );
        }
      } catch (error) {
        content.push(
          new Paragraph({
            text: "No access to read this location.",
            spacing: { after: 200 },
          })
        );
      }
    }

    try {
      const docxDocument = new Document({
        sections: [{ children: content }],
      });
      const blob = await Packer.toBlob(docxDocument);
      saveAs(blob, `MonthlyReport_${reportMonth}.docx`);
    } catch (error) {
      setSummariesError(error.message || "Failed to export document.");
    } finally {
      setExporting(false);
    }
  };

  const handleMonthUpdate = async (event) => {
    event.preventDefault();
    setMetaError(null);
    try {
      const metaRef = doc(db, "monthlyReport", "meta");
      await updateDoc(metaRef, {
        reportMonth: monthForm.reportMonth.trim(),
        periodStart: monthForm.periodStart.trim(),
        periodEnd: monthForm.periodEnd.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditMonthOpen(false);
    } catch (error) {
      setMetaError(error.message || "Failed to update month.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Monthly Report
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Track engineering and construction progress across locations.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-600">
                {metaData?.reportMonth || "--"}
              </span>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Exporting..." : "Export to Word (.docx)"}
              </button>
              <button
                type="button"
                onClick={() => setEditMonthOpen(true)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:text-indigo-600"
              >
                Edit Month
              </button>
            </div>
          </div>
        </div>

        {metaLoading && (
          <div className="flex items-center justify-center">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="mt-6 h-12 w-72 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        )}

        {metaError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {metaError}
          </div>
        )}

        {!initialized && !metaLoading && (
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-white p-6 shadow-sm">
            {/* INIT MODE: safe to delete after first run */}
            <h2 className="text-lg font-semibold text-slate-900">
              Initialize Monthly Report Structure
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Set up the monthly report collection, locations, and metadata to
              start capturing live updates.
            </p>
            <button
              type="button"
              onClick={handleInit}
              disabled={initLoading}
              className="mt-4 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-lg hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {initLoading
                ? "Initializing..."
                : "Initialize Monthly Report Structure"}
            </button>
            {initMessage && (
              <p className="mt-3 text-sm text-emerald-600">{initMessage}</p>
            )}
          </div>
        )}

        {initialized && (
          <>
            {summariesError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {summariesError}
              </div>
            )}

            <div className="grid gap-4">
              {accessLoading || summariesLoading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <SkeletonCard key={`skeleton-${idx}`} />
                  ))
                : visibleLocations.length === 0
                  ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                        No authorized locations available for this account.
                      </div>
                    )
                  : visibleLocations.map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        reportMonth={metaData?.reportMonth}
                        summary={summaries[location.id]}
                        expanded={Boolean(expandedCards[location.id])}
                        onToggle={() =>
                          setExpandedCards((prev) => ({
                            ...prev,
                            [location.id]: !prev[location.id],
                          }))
                        }
                        onEditRow={openEditModal}
                        onDeleteRow={handleDelete}
                      />
                    ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        title={editingRow ? "Edit Row" : "Edit"}
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingContext?.tab === "engineering" ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Document
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formValues.Document}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      Document: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Status
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formValues.Status}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      Status: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Date
                </label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formValues.Date}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      Date: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Trade
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formValues.Trade}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      Trade: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Planned % (optional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formValues.PlannedPercent}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      PlannedPercent: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Actual Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  value={formValues.ActualProgress}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      ActualProgress: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </>
          )}

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editMonthOpen}
        title="Edit Report Month"
        onClose={() => setEditMonthOpen(false)}
      >
        <form onSubmit={handleMonthUpdate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-600">
              Report Month (YYYY-MM)
            </label>
            <input
              type="month"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={monthForm.reportMonth}
              onChange={(event) =>
                setMonthForm((prev) => ({
                  ...prev,
                  reportMonth: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">
              Period Start
            </label>
            <input
              type="date"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={monthForm.periodStart}
              onChange={(event) =>
                setMonthForm((prev) => ({
                  ...prev,
                  periodStart: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600">
              Period End
            </label>
            <input
              type="date"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={monthForm.periodEnd}
              onChange={(event) =>
                setMonthForm((prev) => ({
                  ...prev,
                  periodEnd: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditMonthOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function MonthlyReportPage() {
  return (
    <BlockedEmailGuard blockedEmail="reg@metro4thline.com" redirectTo="/">
      {({ user }) => <MonthlyReportApp currentUser={user} />}
    </BlockedEmailGuard>
  );
}
