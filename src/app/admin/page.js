"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    onSnapshot,
} from "firebase/firestore";
import { Save, Trash2, Edit, RefreshCw, Search } from "lucide-react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";
import { formatDate } from "date-fns";

export default function AdminPage() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [loggedin, setLoggedin] = useState("");
    const [formData, setFormData] = useState({
        Category: "",
        "Activity Name": "",
        "Original Duration": "",
        Start: "",
        Finish: "",
        Actual: "",
        Planned: "",
    });

    function login(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const email = formData.get("email");
        const password = formData.get("password");

        if (email && password) {
            signInWithEmailAndPassword(auth, email, password);
        } else {
            alert("please complete login dtat");
        }

        e.target.reset();
    }

    function logout() {
        signOut(auth);
    }

    useEffect(() => {
        let unsubscribeData = null;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (unsubscribeData) {
                unsubscribeData();
                unsubscribeData = null;
            }

            if (user) {
                setLoading(true);
                let q;
                if (user.email == `admin@metro4thline.com`) {
                    q = query(collection(db, "Stations"));
                } else {
                    q = query(
                        collection(db, "Stations"),
                        where("userID", "==", user.uid)
                    );
                }

                unsubscribeData = onSnapshot(
                    q,
                    (querySnapshot) => {
                        const docs = [];
                        querySnapshot.forEach((doc) => {
                            docs.push({
                                id: doc.id,
                                ...doc.data(),
                            });
                        });
                        setDocuments(docs);
                        setLoggedin(user.displayName);
                        setLoading(false);
                    },
                    (error) => {
                        console.error(
                            "Error fetching documents:",
                            error
                        );
                        alert(
                            "Error fetching documents: " +
                                error.message
                        );
                        setLoading(false);
                    }
                );
            } else {
                setDocuments([]);
                setLoggedin("");
            }
        });
        return () => {
            if (unsubscribeData) {
                unsubscribeData();
                unsubscribeData = null;
            }
            unsubscribe();
        };
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Handle form submission (update only)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Parse Original Duration as a number
            let originalDuration = null;
            if (
                formData["Original Duration"] !== "" &&
                formData["Original Duration"] !== null &&
                formData["Original Duration"] !== undefined
            ) {
                const parsed = Number(formData["Original Duration"]);
                originalDuration = isNaN(parsed) ? null : parsed;
            }

            const docData = {
                Category: formData.Category,
                "Activity Name": formData["Activity Name"],
                ActivityName: formData["Activity Name"], // keep both shapes for compatibility
                "Original Duration": originalDuration,
                OriginalDuration: originalDuration, // keep both shapes for compatibility
                Start: formData.Start,
                Finish: formData.Finish,
                Actual: formData.Actual,
                Planned: formData.Planned,
            };

            if (!editingDoc) {
                alert("Please select a document to edit first.");
                setLoading(false);
                return;
            }

            const docRef = doc(db, "Stations", editingDoc.id);
            await updateDoc(docRef, docData);
            alert("Document updated successfully!");

            // Reset form and refresh list
            setFormData({
                Category: "",
                "Activity Name": "",
                "Original Duration": "",
                Start: "",
                Finish: "",
                Actual: "",
                Planned: "",
            });
            setEditingDoc(null);
        } catch (error) {
            console.error("Error saving document:", error);
            alert("Error saving document: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle edit button click
    const handleEdit = (doc) => {
        setEditingDoc(doc);
        setFormData({
            Category: doc.Category || "",
            "Activity Name":
                doc["Activity Name"] || doc.ActivityName || "",
            "Original Duration":
                doc["Original Duration"] !== null &&
                doc["Original Duration"] !== undefined
                    ? doc["Original Duration"].toString()
                    : doc.OriginalDuration !== null &&
                      doc.OriginalDuration !== undefined
                    ? doc.OriginalDuration.toString()
                    : "",
            Start: doc.Start || "",
            Finish: doc.Finish || "",
            Actual: doc.Actual || "",
            Planned: doc.Planned || "",
        });
    };

    // Handle delete button click
    const handleDelete = async (docId) => {
        if (
            !confirm("Are you sure you want to delete this document?")
        ) {
            return;
        }

        setLoading(true);
        try {
            await deleteDoc(doc(db, "Stations", docId));
            alert("Document deleted successfully!");
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Error deleting document: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle cancel edit
    const handleCancel = () => {
        setEditingDoc(null);
        setFormData({
            Category: "",
            ActivityName: "",
            OriginalDuration: "",
            Start: "",
            Finish: "",
            Actual: "",
            Planned: "",
        });
    };

    // Filter documents based on search term
    const filteredDocuments = documents.filter((doc) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            doc.Category?.toLowerCase().includes(searchLower) ||
            doc["Activity Name"]
                ?.toLowerCase()
                .includes(searchLower) ||
            doc.ActivityName?.toLowerCase().includes(searchLower) ||
            doc.id?.toLowerCase().includes(searchLower)
        );
    });

    const sortByCategoryPriority = (aCat, bCat) => {
        const priority = (cat) => {
            if (cat === "Companies") return 0;
            if (cat === "St No.01 - Hadaek El Ashgar Station")
                return 1;
            if (cat === "Open-Air section") return 2;
            if (cat === "Vertical Shaft") return 3;
            return 4;
        };
        const pa = priority(aCat);
        const pb = priority(bCat);
        if (pa !== pb) return pa - pb;

        const stationMatchA = aCat?.match(/^St No\.(\d+)/);
        const stationMatchB = bCat?.match(/^St No\.(\d+)/);
        if (stationMatchA && stationMatchB) {
            return (
                parseInt(stationMatchA[1]) -
                parseInt(stationMatchB[1])
            );
        }
        return (aCat || "").localeCompare(bCat || "");
    };

    const sortByActivityNamePriority = (aActivity, bActivity) => {
        const priority = (activity) => {
            if (activity === "Overall") return 0;
            if (activity === "Civil Work") return 1;
            if (activity === "Arch. Work") return 2;
            if (activity === "Mechanical Work") return 3;
            if (activity === "Electrical Work") return 4;
            if (activity === "Escalators&Elevators") return 5;
            return 6;
        };
        const pa = priority(aActivity);
        const pb = priority(bActivity);
        if (pa !== pb) return pa - pb;
        return (aActivity || "").localeCompare(bActivity || "");
    };

    const sortedDocuments = [...filteredDocuments].sort((a, b) => {
        const categoryCompare = sortByCategoryPriority(
            a.Category || "",
            b.Category || ""
        );
        if (categoryCompare !== 0) return categoryCompare;

        // If categories are the same, sort by Activity Name
        const activityA = a["Activity Name"] || a.ActivityName || "";
        const activityB = b["Activity Name"] || b.ActivityName || "";
        return sortByActivityNamePriority(activityA, activityB);
    });

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Admin Panel
                    </h1>
                    <p className="text-gray-600">
                        Manage documents in the &quot;Stations&quot;
                        collection. Click edit on any row to update
                        it.
                    </p>
                </div>

                <div className="mb-6 w-full bg-white p-6 md:p-8 rounded-3xl shadow-md">
                    <h2 className="text-xl font-semibold text-gray-700 mb-6">
                        {loggedin
                            ? `Logged in as ${loggedin}`
                            : "Login Form"}
                    </h2>

                    {/* Login Form */}
                    {!loggedin && (
                        <form
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            onSubmit={login}
                        >
                            {/* Email */}
                            <div className="md:col-span-2">
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-600 mb-1"
                                >
                                    Email
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="admin@email.com"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                />
                            </div>

                            {/* Password */}
                            <div className="md:col-span-2">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-600 mb-1"
                                >
                                    Password
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                />
                            </div>

                            {/* Login Button */}
                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-xl transition cursor-pointer"
                                >
                                    Login
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Logout Button */}
                    {loggedin && (
                        <button
                            onClick={logout}
                            className="mt-4 w-full bg-red-100 hover:bg-red-200 text-red-800 font-medium py-3 rounded-xl transition cursor-pointer"
                        >
                            Logout
                        </button>
                    )}
                </div>

                {/* Documents List Section */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Documents ({filteredDocuments.length})
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                    size={18}
                                />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {loading && documents.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">
                                Loading documents...
                            </p>
                        </div>
                    ) : sortedDocuments.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {searchTerm
                                ? "No documents found matching your search."
                                : "Please Login to see your documents"}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Activity Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Original Duration
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Start
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Finish
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actual
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Planned
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedDocuments.map((doc) => (
                                        <tr
                                            key={doc.id}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc.Category ??
                                                    "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc[
                                                    "Activity Name"
                                                ] ??
                                                    doc.ActivityName ??
                                                    "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc[
                                                    "Original Duration"
                                                ] ??
                                                    doc.OriginalDuration ??
                                                    "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc.Start || "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc.Finish || "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc.Actual || "N/A"}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {doc.Planned || "N/A"}
                                            </td>

                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleEdit(
                                                                doc
                                                            )
                                                        }
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                                        title="Edit"
                                                    >
                                                        <Edit
                                                            size={16}
                                                        />
                                                    </button>
                                                    {/* <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                doc.id
                                                            )
                                                        }
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                                        title="Delete"
                                                    >
                                                        <Trash2
                                                            size={16}
                                                        />
                                                    </button> */}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit dialog */}
            {editingDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Edit Document
                                </h2>
                                <p className="text-sm text-gray-600">
                                    Updating: {editingDoc.id}
                                </p>
                            </div>
                            <button
                                onClick={handleCancel}
                                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer"
                                aria-label="Close edit dialog"
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        htmlFor="Category"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Category *
                                    </label>
                                    <input
                                        type="text"
                                        id="Category"
                                        name="Category"
                                        value={formData.Category}
                                        readOnly
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                        placeholder="e.g., St No.01 - Hadaek El Ashgar Station"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="Activity Name"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Activity Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="Activity Name"
                                        name="Activity Name"
                                        value={
                                            formData["Activity Name"]
                                        }
                                        readOnly
                                        required
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                        placeholder="e.g., Civil Work"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="Original Duration"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Original Duration
                                    </label>
                                    <input
                                        type="number"
                                        id="Original Duration"
                                        name="Original Duration"
                                        value={
                                            formData[
                                                "Original Duration"
                                            ]
                                        }
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 2064"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="Start"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Start
                                    </label>
                                    <input
                                        type="text"
                                        id="Start"
                                        name="Start"
                                        value={formData.Start}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 21-Dec-20 A"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="Finish"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Finish
                                    </label>
                                    <input
                                        type="text"
                                        id="Finish"
                                        name="Finish"
                                        value={formData.Finish}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 4-Dec-27"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="Actual"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Actual
                                    </label>
                                    <input
                                        type="text"
                                        id="Actual"
                                        name="Actual"
                                        value={formData.Actual}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 55.59%"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="Planned"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Planned
                                    </label>
                                    <input
                                        type="text"
                                        id="Planned"
                                        name="Planned"
                                        value={formData.Planned}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., 63.34%"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <Save size={18} />
                                    Update Document
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
