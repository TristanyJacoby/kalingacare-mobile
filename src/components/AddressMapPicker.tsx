// src/components/AddressMapPicker.tsx
// KalingaCare — drag-pin address picker, ported from the web app's
// settings.js address map. Drag the marker or tap anywhere on the map to
// set the exact delivery location; a search box on top uses Places
// Autocomplete to jump straight to an address. Either action
// reverse-geocodes the pin into a formatted address string.
import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  GOOGLE_MAPS_API_KEY,
  DEFAULT_CENTER,
  DEMO_MAP_ID,
  toLatLngLiteral,
} from "../utils/googleMaps";
import "./AddressMapPicker.css";

interface AddressMapPickerProps {
  savedLat?: number | null;
  savedLng?: number | null;
  onLocationChange: (data: { address: string; lat: number; lng: number }) => void;
}

const AddressMapPicker: React.FC<AddressMapPickerProps> = ({
  savedLat,
  savedLng,
  onLocationChange,
}) => {
  const mapElRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-key">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
        setStatus("no-key");
        return;
      }
      if (!mapElRef.current || !searchContainerRef.current) return;

      let googleMaps, AdvancedMarkerElement, PlaceAutocompleteElement, Geocoder;
      try {
        googleMaps = await loadGoogleMaps();
        ({ AdvancedMarkerElement } = await googleMaps.importLibrary("marker"));
        ({ PlaceAutocompleteElement } = await googleMaps.importLibrary("places"));
        ({ Geocoder } = await googleMaps.importLibrary("geocoding"));
      } catch (err) {
        console.error("KalingaCare Maps error:", err);
        if (!cancelled) setStatus("error");
        return;
      }
      if (cancelled) return;

      const center = {
        lat: savedLat ?? DEFAULT_CENTER.lat,
        lng: savedLng ?? DEFAULT_CENTER.lng,
      };

      const map = new googleMaps.Map(mapElRef.current, {
        center,
        zoom: savedLat ? 16 : 11,
        mapId: DEMO_MAP_ID, // required for AdvancedMarkerElement to render
        streetViewControl: false,
        mapTypeControl: false,
      });

      const marker = new AdvancedMarkerElement({
        position: center,
        map,
        gmpDraggable: true,
        title: "Drag to set the exact delivery location",
      });

      const geocoder = new Geocoder();

      async function updateFromPosition(latLngLiteral: { lat: number; lng: number }) {
        try {
          const result = await geocoder.geocode({ location: latLngLiteral });
          const formatted = result.results[0]?.formatted_address ?? "";
          onLocationChange({
            address: formatted,
            lat: latLngLiteral.lat,
            lng: latLngLiteral.lng,
          });
        } catch {
          // Reverse geocoding failing isn't critical — the pin position
          // is still passed up even if we can't turn it into text.
          onLocationChange({ address: "", lat: latLngLiteral.lat, lng: latLngLiteral.lng });
        }
      }

      marker.addListener("dragend", () =>
        updateFromPosition(toLatLngLiteral(marker.position)),
      );

      map.addListener("click", (e: any) => {
        const pos = toLatLngLiteral(e.latLng);
        marker.position = pos;
        updateFromPosition(pos);
      });

      // Places Autocomplete widget — a custom <gmp-place-autocomplete>
      // element, so it replaces the placeholder container rather than
      // binding to a plain <input>.
      const placeAutocomplete = new PlaceAutocompleteElement({
        includedRegionCodes: ["ph"],
      });
      placeAutocomplete.className = "address-map-search-input";
      searchContainerRef.current.innerHTML = "";
      searchContainerRef.current.appendChild(placeAutocomplete);

      placeAutocomplete.addEventListener("gmp-select", async ({ placePrediction }: any) => {
        try {
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ["location", "formattedAddress"] });
          if (!place.location) return;
          const pos = toLatLngLiteral(place.location);
          map.setCenter(pos);
          map.setZoom(16);
          marker.position = pos;
          onLocationChange({
            address: place.formattedAddress || "",
            lat: pos.lat,
            lng: pos.lng,
          });
        } catch {
          // If fetching the selected place's details fails, the map/marker
          // stay wherever they were — the user can still drag/tap manually.
        }
      });

      if (!cancelled) setStatus("ready");
    }

    init();
    return () => {
      cancelled = true;
    };
    // Only re-run if the saved starting point actually changes identity —
    // not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLat, savedLng]);

  if (status === "no-key") {
    return (
      <div className="address-map-placeholder">
        Map picker needs a Google Maps API key.
      </div>
    );
  }

  return (
    <div className="address-map-wrap">
      <div ref={searchContainerRef} className="address-map-search-wrap" />
      <div ref={mapElRef} className="address-map-canvas" />
      {status === "loading" && (
        <div className="address-map-placeholder address-map-placeholder-overlay">
          Loading map…
        </div>
      )}
      {status === "error" && (
        <div className="address-map-placeholder address-map-placeholder-overlay">
          Couldn't load the map right now.
        </div>
      )}
    </div>
  );
};

export default AddressMapPicker;
