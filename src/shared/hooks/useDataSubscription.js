"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
    normalizeActivity,
    useDataStore,
} from "@/stores/useDataStore";

export function useDataSubscription() {
    const setData = useDataStore((state) => state.setData);
    const setError = useDataStore((state) => state.setError);
    const setLoading = useDataStore((state) => state.setLoading);

    useEffect(() => {
        let unsubscribeData = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setData([]);
                setLoading(false);
                setError(null);
                if (unsubscribeData) {
                    unsubscribeData();
                    unsubscribeData = null;
                }
                return;
            }

            setLoading(true);
            let q = null;
            if (
                user.email === "admin@metro4thline.com" ||
                user.email === "reg@metro4thline.com"
            ) {
                q = query(collection(db, "Stations"));
            } else {
                q = query(
                    collection(db, "Stations"),
                    where("userID", "==", user.uid)
                );
            }

            unsubscribeData = onSnapshot(
                q,
                (snapshot) => {
                    const docs = snapshot.docs.map((doc) =>
                        normalizeActivity({
                            id: doc.id,
                            ...doc.data(),
                        })
                    );
                    setData(docs);
                    setError(null);
                    setLoading(false);
                },
                (err) => {
                    console.error("Firestore error:", err);
                    setError(err.message);
                    setLoading(false);
                }
            );
        });

        return () => {
            if (unsubscribeData) unsubscribeData();
            unsubscribeData = null;
            unsubscribeAuth();
        };
    }, [setData, setError, setLoading]);
}

