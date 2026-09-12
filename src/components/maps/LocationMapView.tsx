import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

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

export interface LocationMapViewProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
  height?: string;
  className?: string;
}

export function LocationMapView({
  latitude,
  longitude,
  locationName,
  height = '240px',
  className = '',
}: LocationMapViewProps) {
  const hasCoords =
    typeof latitude === 'number' &&
    !isNaN(latitude) &&
    typeof longitude === 'number' &&
    !isNaN(longitude);

  if (!hasCoords) {
    return (
      <div className={`p-3.5 rounded-xl bg-secondary/30 border border-border/60 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span>
            Pickup Location: <strong className="text-foreground">{locationName || 'Unspecified'}</strong>
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6 italic">
          (Specific map coordinates were not provided by the supplier for this listing)
        </p>
      </div>
    );
  }

  const center: [number, number] = [latitude as number, longitude as number];

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
          <span>Pickup Location: <strong className="text-foreground">{locationName || 'Designated Facility'}</strong></span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          Lat: {(latitude as number).toFixed(5)}, Lng: {(longitude as number).toFixed(5)}
        </div>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border border-border/80 shadow-sm bg-muted z-0"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={14}
          scrollWheelZoom={false}
          dragging={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center}>
            <Popup>
              <div className="p-1 text-xs">
                <div className="font-semibold">{locationName || 'Pickup Location'}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {(latitude as number).toFixed(5)}, {(longitude as number).toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
