"use client";

import { auth } from "@/lib/firebase";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";
import { useEffect, useState } from "react";

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

function reg(e) {
    e.preventDefault();
    const email = "REG@Metro4thLine.com";
    const password = "REG8O27Y7o";
    signInWithEmailAndPassword(auth, email, password);
    e.target.reset();
}

export default function Header() {
    const [loggedin, setLoggedin] = useState("");
    function logout() {
        signOut(auth);
    }
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setLoggedin(user.displayName || "Regular user ");
            } else {
                setLoggedin("");
            }
        });
        return () => {
            unsubAuth && unsubAuth();
        };
    }, []);
    return (
        <header className="bg-white border-b border-gray-200 shadow-sm px-4 lg:px-8 py-5 pdf-hide">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left Section */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Metro Line 4
                    </h1>
                    <p className="text-sm text-gray-600">
                        Project Dashboard
                    </p>

                    <p className="text-xs text-gray-500 mt-2">
                        Last updated: Sep 25th, 2025
                    </p>
                </div>

                {/* Right Section */}
                <div className="w-full lg:max-w-md space-y-3">
                    {/* Logged In */}
                    {loggedin && (
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                            <div>
                                <p className="text-xs text-gray-500">
                                    Logged in as
                                </p>
                                <p className="text-sm font-semibold text-cyan-700 truncate">
                                    {loggedin}
                                </p>
                            </div>

                            <button
                                onClick={logout}
                                className="bg-red-100 hover:bg-red-200 text-red-700 font-medium px-4 py-2 rounded-xl transition"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className=" cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-xl shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-600"
                        >
                            Download PDF
                        </button>
                    </div>

                    {/* Login Panel */}
                    {!loggedin && (
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-5">
                            <div className="space-y-1">
                                <h2 className="text-sm font-semibold text-gray-900">
                                    Admin Login
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Access the dashboard with your
                                    admin credentials.
                                </p>
                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={login}
                            >
                                <div className="space-y-2">
                                    <label
                                        htmlFor="email"
                                        className="text-xs font-medium text-gray-700"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="admin@email.com"
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="password"
                                        className="text-xs font-medium text-gray-700"
                                    >
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2.5 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-600"
                                >
                                    Login
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-400">
                                    OR
                                </span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            <button
                                onClick={reg}
                                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-800 text-sm font-medium py-2.5 rounded-xl border border-gray-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
                            >
                                Continue as Regular User
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
