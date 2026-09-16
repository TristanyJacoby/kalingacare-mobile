// src/utils/googleMaps.ts
// KalingaCare — Google Maps loader, ported from the web app's js/site.js.
// Reuses the same API key already public in the web repo (Google Maps
// keys are meant to be restricted by referrer/app, not kept secret, the
// same way the Firebase key is public — see the note on GOOGLE_MAPS_API_KEY
// below).

// IMPORTANT: this is the same key already committed in the web project's
// js/site.js. If you rotate it there, update it here too. Restrict it in
// Google Cloud Console under Application restrictions so only your web
// domain and this app's package name can use it.
export const GOOGLE_MAPS_API_KEY: string = "AIzaSyBBqPEJgekBOairKL01wi9ics8UilatFec";

// Metro Manila — used as the default map center when there's no saved
// pin yet (most deliveries are within the Philippines).
export const DEFAULT_CENTER = { lat: 14.5995, lng: 120.9842 };

// DEMO_MAP_ID is Google's own sanctioned placeholder Map ID for testing/
// coursework. AdvancedMarkerElement requires SOME Map ID to render at all;
// this avoids an extra Cloud Console setup step that isn't necessary here.
export const DEMO_MAP_ID = "DEMO_MAP_ID";

declare global {
  interface Window {
    google?: any;
  }
}

let googleMapsPromise: Promise<any> | null = null;

// Google's own official bootstrap loader snippet (documented at
// developers.google.com/maps/documentation/javascript/load-maps-js-api),
// wrapped in a function. It's what actually defines
// google.maps.importLibrary.
function installGoogleMapsBootstrap() {
  if (window.google?.maps?.importLibrary) return;
  ((g: any) => {
    let h: any, a: any, k: any, b: any;
    const p = "The Google Maps JavaScript API",
      c = "google",
      l = "importLibrary",
      q = "__ib__",
      m = document;
    b = window as any;
    b = b[c] || (b[c] = {});
    const d = b.maps || (b.maps = {}),
      r = new Set(),
      e = new URLSearchParams(),
      u = () =>
        h ||
        (h = new Promise(async (f: any, n: any) => {
          await (a = m.createElement("script"));
          e.set("libraries", [...r] + "");
          for (k in g)
            e.set(
              k.replace(/[A-Z]/g, (t: string) => "_" + t[0].toLowerCase()),
              g[k],
            );
          e.set("callback", c + ".maps." + q);
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
          d[q] = f;
          a.onerror = () => (h = n(Error(p + " could not load.")));
          a.nonce = (m.querySelector("script[nonce]") as HTMLScriptElement | null)?.nonce || "";
          m.head.append(a);
        }));
    d[l]
      ? console.warn(p + " only loads once. Ignoring:", g)
      : (d[l] = (f: any, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n)));
  })({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
  });
}

export async function loadGoogleMaps(): Promise<any> {
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = (async () => {
    installGoogleMapsBootstrap();
    await window.google.maps.importLibrary("maps");
    return window.google.maps;
  })();

  return googleMapsPromise;
}

// AdvancedMarkerElement's .position can come back as either a plain
// {lat, lng} literal or a google.maps.LatLng-style object with lat()/lng()
// methods, depending on how it was set — this normalizes either shape.
export function toLatLngLiteral(pos: any): { lat: number; lng: number } {
  if (typeof pos.lat === "function") return { lat: pos.lat(), lng: pos.lng() };
  return { lat: pos.lat, lng: pos.lng };
}
