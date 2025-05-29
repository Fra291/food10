import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

export function useAuth() {
  console.log("🔐 DEBUG: useAuth hook initializing...");
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("🔥 DEBUG: Setting up Firebase auth listener...");
    
    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        console.log("👤 Firebase auth state changed:", {
          hasUser: !!firebaseUser,
          uid: firebaseUser?.uid,
          email: firebaseUser?.email
        });
        
        setUser(firebaseUser);
        setIsLoading(false);
      });

      return () => {
        console.log("🔥 Cleaning up Firebase auth listener");
        unsubscribe();
      };
    } catch (error) {
      console.error("❌ Error setting up Firebase auth:", error);
      setIsLoading(false);
      setUser(null);
    }
  }, []);

  const authState = {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
  
  console.log("🔐 Current auth state:", authState);
  return authState;
}