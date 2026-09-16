// src/components/TrackingMap.tsx
// KalingaCare — shows a line from KalingaCare HQ to the delivery
// destination, ported from the web app's profile.js renderTrackingMap().
import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  GOOGLE_MAPS_API_KEY,
  DEMO_MAP_ID,
} from "../utils/googleMaps";
import "./TrackingMap.css";

// KalingaCare HQ — TIP Quezon City (938 Aurora Blvd, Cubao), same
// coordinates used on web.
const HQ_LOCATION = {
  name: "KalingaCare HQ — TIP Quezon City",
  lat: 14.6198,
  lng: 121.0535,
};

interface TrackingMapProps {
  destLat?: number | null;
  destLng?: number | null;
}

const TrackingMap: React.FC<TrackingMapProps> = ({ destLat, destLng }) => {
  const mapElRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
        setMessage("Map needs a Google Maps API key.");
        return;
      }
      if (destLat == null || destLng == null) {
        setMessage(
          "No saved location for this order (placed before the address picker was added, or the address wasn't pinned on a map).",
        );
        return;
      }
      if (!mapElRef.current) return;

      let googleMaps, AdvancedMarkerElement, PinElement;
      try {
        googleMaps = await loadGoogleMaps();
        ({ AdvancedMarkerElement, PinElement } =
          await googleMaps.importLibrary("marker"));
      } catch (err) {
        console.error("KalingaCare Maps error:", err);
        if (!cancelled) setMessage("Couldn't load the map right now.");
        return;
      }
      if (cancelled) return;

      const origin = { lat: HQ_LOCATION.lat, lng: HQ_LOCATION.lng };
      const destination = { lat: destLat, lng: destLng };

      const bounds = new googleMaps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);

      const map = new googleMaps.Map(mapElRef.current, {
        mapId: DEMO_MAP_ID, // required for AdvancedMarkerElement to render
        streetViewControl: false,
        mapTypeControl: false,
      });
      map.fitBounds(bounds, 40);

      // Blue pin for HQ, so it's visually distinct from the (default red)
      // destination pin.
      const hqPin = new PinElement({
        background: "#4285F4",
        borderColor: "#1a5fb4",
        glyphColor: "#ffffff",
      });
      new AdvancedMarkerElement({
        position: origin,
        map,
        title: HQ_LOCATION.name,
        content: hqPin.element,
      });
      new AdvancedMarkerElement({
        position: destination,
        map,
        title: "Delivery destination",
      });

      new googleMaps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: "#67c8f7",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      });

      setMessage(null);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [destLat, destLng]);

  if (message) {
    return <div className="tracking-map-placeholder">{message}</div>;
  }

  return <div ref={mapElRef} className="tracking-map-canvas" />;
};

export default TrackingMap;
