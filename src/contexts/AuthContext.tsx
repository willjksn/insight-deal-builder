"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/config";
import { AppUser, UserRole } from "@/lib/types";
import { EMPTY_PERMISSIONS } from "@/lib/constants/permissions";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    role?: UserRole
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser && db) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setAppUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
          } else {
            setAppUser(null);
          }
        } catch (err) {
          console.error("Failed to load user profile from Firestore:", err);
          setAppUser(null);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth not configured");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = "member"
  ) => {
    if (!auth || !db) throw new Error("Firebase not configured");
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await setDoc(doc(db, "users", credential.user.uid), {
      email,
      displayName,
      role: "member",
      company: "",
      permissions: { ...EMPTY_PERMISSIONS },
      approved: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      const token = await credential.user.getIdToken();
      await fetch("/api/users/signup-notify", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (notifyErr) {
      console.error("Failed to notify admins of signup:", notifyErr);
    }
  };

  const signOut = async () => {
    if (!auth) throw new Error("Firebase Auth not configured");
    await firebaseSignOut(auth);
  };

  const refreshProfile = async () => {
    if (!user || !db) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setAppUser({ id: userDoc.id, ...userDoc.data() } as AppUser);
      }
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        isConfigured: isFirebaseConfigured,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
