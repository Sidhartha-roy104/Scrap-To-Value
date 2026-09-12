import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L, { LatLngExpression, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, AlertCircle, X, Check, Loader2 } from 'lucide-react';

// Fix Leaflet default icon asset paths for Vite/React bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationMapPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  onLocationChange: (location: LocationCoordinates | null) => void;
  height?: string;
  disabled?: boolean;
}

// Default center: South India / Tamil Nadu geographic center
const DEFAULT_CENTER: [number, number] = [11.1271, 78.6569];
const DEFAULT_ZOOM = 7;
const DETAIL_ZOOM = 14;

// Component to handle map clicks for placing/updating marker
function MapClickHandler({
  onSelect,
  disabled,
}: {
  onSelect: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onSelect(
        parseFloat(e.latlng.lat.toFixed(7)),
        parseFloat(e.latlng.lng.toFixed(7))
      );
    },
  });
  return null;
}

// Component to programmatically re-center map when coordinates change externally
function MapCenterController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

export function LocationMapPicker({
  latitude,
  longitude,
  onLocationChange,
  height = '280px',
  disabled = false,
}: LocationMapPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const markerRef = useRef<LeafletMarker>(null);

  const hasCoords =
    typeof latitude === 'number' &&
    !isNaN(latitude) &&
    typeof longitude === 'number' &&
    !isNaN(longitude);

  const currentCenter: [number, number] = useMemo(() => {
    if (hasCoords) {
      return [latitude as number, longitude as number];
    }
    return DEFAULT_CENTER;
  }, [hasCoords, latitude, longitude]);

  const currentZoom = hasCoords ? DETAIL_ZOOM : DEFAULT_ZOOM;

  const handleMarkerDragEnd = () => {
    const marker = markerRef.current;
    if (marker && !disabled) {
      const latLng = marker.getLatLng();
      onLocationChange({
        latitude: parseFloat(latLng.lat.toFixed(7)),
        longitude: parseFloat(latLng.lng.toFixed(7)),
      });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setGeoError(null);
    onLocationChange({ latitude: lat, longitude: lng });
  };

  const handleUseCurrentLocation = () => {
    if (disabled) return;
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please select a location on the map.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = parseFloat(position.coords.latitude.toFixed(7));
        const lng = parseFloat(position.coords.longitude.toFixed(7));
        onLocationChange({ latitude: lat, longitude: lng });
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location permission was denied. You can manually click on the map to set pickup location.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location information is unavailable. Please click or drag on the map.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please try again or click the map directly.');
            break;
          default:
            setGeoError('Unable to retrieve current location. Please select manually on the map.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClearLocation = () => {
    if (disabled) return;
    setGeoError(null);
    onLocationChange(null);
  };

  return (
    <div className="space-y-2">
      {/* Map Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span>Click map or drag marker to set exact facility/warehouse pickup point</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-secondary hover:bg-secondary/80 text-foreground border border-border/70 transition-colors disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="h-3 w-3 text-primary" />
                <span>📍 Use My Current Location</span>
              </>
            )}
          </button>
          {hasCoords && !disabled && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-destructive hover:bg-destructive/10 transition-colors"
              title="Clear coordinates"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Geolocation Feedback Alert */}
      {geoError && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Map Container */}
      <div
        className="relative rounded-xl overflow-hidden border border-border/80 shadow-sm bg-muted z-0"
        style={{ height, minHeight: '220px' }}
      >
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onSelect={handleMapClick} disabled={disabled} />
          <MapCenterController center={currentCenter} zoom={currentZoom} />

          {hasCoords && (
            <Marker
              position={[latitude as number, longitude as number]}
              draggable={!disabled}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
              ref={markerRef}
            />
          )}
        </MapContainer>

        {/* Overlay instruction if no marker selected yet */}
        {!hasCoords && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-[1000] bg-background/90 backdrop-blur-sm border border-border/70 text-foreground text-xs px-3 py-1.5 rounded-full shadow-md">
            Click anywhere on the map to set pickup pin
          </div>
        )}
      </div>

      {/* Selected Coordinates Readout */}
      {hasCoords ? (
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
          <div className="flex items-center gap-1.5 text-primary font-medium">
            <Check className="h-3.5 w-3.5" />
            <span>Pickup coordinates pinned:</span>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            Lat: <span className="text-foreground font-semibold">{(latitude as number).toFixed(5)}</span>, Lng:{' '}
            <span className="text-foreground font-semibold">{(longitude as number).toFixed(5)}</span>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground italic px-1">
          No precise map coordinates selected (optional). Listing will rely on location city name.
        </div>
      )}
    </div>
  );
}
