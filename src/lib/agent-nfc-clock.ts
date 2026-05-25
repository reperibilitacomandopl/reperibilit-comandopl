/**
 * Logica condivisa con /nfc (tag badge): GPS + POST clock-in tipo AUTO + anomalie 428.
 */

export type GpsCoords = {
  lat: number
  lng: number
  accuracy: number
}

export type NfcJustificationPayload = {
  shiftId: string
  anomalyType: "LATE_IN" | "OVERTIME" | "EARLY_EXIT" | string
  diffMins: number
  plannedTime: string
  lat: number
  lng: number
  accuracy: number
}

export type NfcClockSuccess = {
  ok: true
  recordType: "IN" | "OUT"
  message: string
}

export type NfcClockError = {
  ok: false
  status: number
  message: string
  distance?: number
  allowed?: number
}

export type NfcClockJustification = {
  ok: false
  needsJustification: true
  data: NfcJustificationPayload
}

export type NfcClockResult = NfcClockSuccess | NfcClockError | NfcClockJustification

export function gpsErrorMessage(error: GeolocationPositionError | Error): string {
  if ("code" in error) {
    switch (error.code) {
      case 1:
        return "Permesso GPS negato. Su iPhone: Impostazioni → Safari → Posizione → Consenti."
      case 2:
        return "Posizione non disponibile. Esci all'aperto e riprova."
      case 3:
        return "Timeout GPS. Riprova."
      default:
        return "Errore durante l'acquisizione della posizione GPS."
    }
  }
  return error.message || "Errore GPS."
}

export function acquireGpsPosition(): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizzazione non supportata dal browser."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

export async function postNfcStyleClock(params: {
  type?: "AUTO" | "IN" | "OUT"
  lat: number
  lng: number
  accuracy: number
  overtimeReason?: string
  shiftId?: string
  isCorrection?: boolean
  actualEndTimeStr?: string
  checkAnomaly?: boolean
}): Promise<NfcClockResult> {
  const res = await fetch("/api/admin/clock-in", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      type: params.type ?? "AUTO",
      lat: params.lat,
      lng: params.lng,
      accuracy: params.accuracy,
      isManual: false,
      checkAnomaly:
        params.checkAnomaly ??
        (!params.overtimeReason && !params.isCorrection),
      overtimeReason: params.overtimeReason,
      shiftId: params.shiftId,
      isCorrection: params.isCorrection,
      actualEndTimeStr: params.actualEndTimeStr,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (res.status === 428 && data.requiresJustification) {
    return {
      ok: false,
      needsJustification: true,
      data: {
        shiftId: data.shiftId,
        anomalyType: data.anomalyType,
        diffMins: data.diffMins,
        plannedTime: data.plannedTime,
        lat: params.lat,
        lng: params.lng,
        accuracy: params.accuracy,
      },
    }
  }

  if (res.ok) {
    const recordType = (data.record?.type === "OUT" ? "OUT" : "IN") as "IN" | "OUT"
    const actionLabel = recordType === "IN" ? "Entrata" : "Uscita"
    return {
      ok: true,
      recordType,
      message: `Timbratura di ${actionLabel} registrata con successo!`,
    }
  }

  if (res.status === 401) {
    return {
      ok: false,
      status: 401,
      message:
        "Sessione scaduta. Effettua nuovamente il login, poi riprova la timbratura.",
    }
  }

  if (res.status === 403 && data.distance != null) {
    return {
      ok: false,
      status: 403,
      message: `Troppo lontano dalla sede! Distanza: ${data.distance}m (limite: ${data.allowed}m)`,
      distance: data.distance,
      allowed: data.allowed,
    }
  }

  return {
    ok: false,
    status: res.status,
    message: data.error || "Si è verificato un problema durante la timbratura.",
  }
}

/** Converte coordinate in oggetto compatibile con clockOutModalConfig (useAgentData). */
export function gpsCoordsToPosition(coords: GpsCoords): GeolocationPosition {
  return {
    coords: {
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy: coords.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  } as GeolocationPosition
}
