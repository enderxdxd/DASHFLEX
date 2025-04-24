import { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        setRole(snap.exists() ? snap.data().role : null);
      })
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, []);
  
  return { role, loading };
}
