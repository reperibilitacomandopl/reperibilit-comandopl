"use client"
import { useEffect } from "react"
import { syncOfflineRequests } from "@/lib/offline-sync"
import toast from "react-hot-toast"

export default function PWAListener() {
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
