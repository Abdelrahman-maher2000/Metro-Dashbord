"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { fetchClickUpData } from "../api/clickup/ٍSpaces/route";
import { useClickUpStore } from "@/stores/useDataStore";
import { fetchClickUpTasks } from "../api/clickup/Tasks/route";
import { fetchClickUpList } from "../api/clickup/lists/route";

export default function ClickUp() {
    const setToken = useClickUpStore((state) => state.setToken);
    const token = useClickUpStore((state) => state.token);
    const spaces = useClickUpStore((state) => state.spaces);

    const [companyData, setCompanyData] = useState([]);

    useEffect(() => {
        const unSubAuth = onAuthStateChanged(auth, async (user) => {
            console.log(user.email);
            if (user.email === "admin@metro4thline.com") {
                const docRef = doc(db, "ClickUp", user.uid);
                const snaphot = await getDoc(docRef);
                setToken(snaphot.data());
            }
        });

        return () => {
            unSubAuth();
        };
    }, []);

    useEffect(() => {
        if (!token.ClickUpToken) return;
        fetchClickUpData();
        fetchClickUpTasks();
        fetchClickUpList();
    }, [token]);

    useEffect(() => {
        if (!spaces.spaces) return;
        console.log("spa", spaces.spaces);
    }, [spaces]);

    async function filter(compnay) {
        setCompanyData(
            spaces.spaces.filter((space) => space.name == compnay)
        );
    }
    return (
        <div className="p-10 mt-20">
            <button
                className="bg-yellow-500"
                onClick={() => filter("Arab Contractors")}
            >
                Arab Cont
            </button>
            {companyData &&
                companyData.map((e) => {
                    return <div key={e.id}>{e.id}</div>;
                })}
        </div>
    );
}
