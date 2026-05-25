"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { syncOfflineRequests } from "@/lib/offline-sync"
import { syncPushSubscriptionToServer } from "@/lib/push-subscription-client"
import toast from "react-hot-toast"

export default function PWAListener() {
  const { status } = useSession()

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status !== "authenticated") return;

    syncPushSubscriptionToServer().catch(() => {})
  }, [status])

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Routine iniziale
    if (window.navigator.onLine) {
       syncOfflineRequests();
    }
    
    // Ascoltatore in trincea: allarme quando se ne va la rete
    const handleOffline = () => {
       toast("Nessuna Connessione Rilevata - Modalità Store & Forward Attiva", {
          icon: "⚠️",
          style: { background: "#fffbeb", color: "#b45309" }
       });
    };

    // Ascoltatore al ripristino dell'antenna
    const handleOnline = () => {
       toast.success("Connessione Ripristinata - Sincronizzo database...");
       syncOfflineRequests();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
       window.removeEventListener("online", handleOnline);
       window.removeEventListener("offline", handleOffline);
    }
  }, []);

  return null; // Componente fantasma (Headless)
}
