import React, { useEffect, useRef } from 'react';
import { RescueCase } from '../types.ts';
import { MapPin } from 'lucide-react';

// We rely on standard Leaflet loaded via CDN in index.html.
// Access the global L object safely.
declare const L: any;

interface MapComponentProps {
  rescues: RescueCase[];
  onSelectRescue?: (rescue: RescueCase) => void;
  selectedRescueId?: number | null;
  interactive?: boolean; // If true, citizen can click to select report location
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  volunteerPosition?: { lat: number; lng: number } | null;
}

export default function MapComponent({
  rescues,
  onSelectRescue,
  selectedRescueId,
  interactive = false,
  onLocationSelect,
  volunteerPosition,
}: MapComponentProps) {
  const mapContainerId = useRef<string>(`map-${Math.random().toString(36).substr(2, 9)}`);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const selectedLocationMarkerRef = useRef<any>(null);
  const volunteerMarkerRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (typeof L === 'undefined') {
      console.warn('Leaflet library is not loaded yet.');
      return;
    }

    // Centered around Nepal (focused at 27.7172, 85.3239) and restricted to Nepal's boundaries
    const map = L.map(mapContainerId.current, {
      maxBounds: [[26.0, 80.0], [30.6, 88.5]],
      minZoom: 6,
      maxBoundsViscosity: 1.0
    }).setView([27.7172, 85.3239], 12);
    mapRef.current = map;

    // Use a clean, modern street map style
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    // Map Click Listener for interactive location selection
    if (interactive && onLocationSelect) {
      map.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Update selection marker
        if (selectedLocationMarkerRef.current) {
          selectedLocationMarkerRef.current.setLatLng([lat, lng]);
        } else {
          selectedLocationMarkerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'custom-selected-marker',
              html: `<div class="w-8 h-8 bg-rose-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-bounce">
                <div class="w-2 h-2 bg-white rounded-full"></div>
              </div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32]
            })
          }).addTo(map);
        }

        // Fetch reverse geocode address using free OSM Nominatim
        let address = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          if (response.ok) {
            const data = await response.json();
            address = data.display_name || address;
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        }

        onLocationSelect(lat, lng, address);
      });
    }

    // Clean up
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Update Markers when rescues list changes
  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add pins for all rescues
    rescues.forEach((rescue) => {
      let colorClass = 'bg-blue-500';
      if (rescue.injurySeverity === 'Critical') colorClass = 'bg-rose-600 animate-pulse-slow';
      else if (rescue.injurySeverity === 'Moderate') colorClass = 'bg-amber-500';
      else if (rescue.injurySeverity === 'Minor') colorClass = 'bg-emerald-500';

      // Status indicator ring
      let borderClass = 'border-white';
      if (rescue.status === 'Assigned') borderClass = 'border-blue-400 border-4';
      else if (rescue.status === 'En Route') borderClass = 'border-purple-400 border-4 animate-pulse';
      else if (rescue.status === 'Rescued' || rescue.status === 'In Treatment') borderClass = 'border-teal-400 border-4';
      else if (rescue.status === 'Adoption Ready') borderClass = 'border-rose-400 border-4 animate-bounce';

      const iconHtml = `
        <div class="w-8 h-8 ${colorClass} rounded-full border-2 ${borderClass} shadow-md flex items-center justify-center text-white font-semibold text-[10px] transform transition-transform hover:scale-125">
          ${rescue.species === 'dog' ? '🐶' : rescue.species === 'cat' ? '🐱' : rescue.species === 'bird' ? '🐦' : '🐾'}
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-rescue-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([rescue.latitude, rescue.longitude], { icon: markerIcon })
        .addTo(mapRef.current)
        .on('click', () => {
          if (onSelectRescue) onSelectRescue(rescue);
        });

      // Bind simple popup
      const severityColor = rescue.injurySeverity === 'Critical' ? 'text-rose-600' : rescue.injurySeverity === 'Moderate' ? 'text-amber-500' : 'text-emerald-500';
      marker.bindPopup(`
        <div class="p-1">
          <h4 class="font-bold font-display text-sm m-0 text-slate-900">${rescue.title}</h4>
          <p class="text-xs text-slate-500 m-1">Status: <strong class="text-blue-600 font-semibold">${rescue.status}</strong></p>
          <p class="text-xs m-1">Severity: <span class="font-bold ${severityColor}">${rescue.injurySeverity}</span></p>
          <p class="text-[10px] text-slate-400 m-0 leading-tight">${rescue.address || 'No address'}</p>
        </div>
      `);

      markersRef.current.push(marker);

      // Focus on selected rescue
      if (selectedRescueId === rescue.id) {
        mapRef.current.setView([rescue.latitude, rescue.longitude], 15);
        marker.openPopup();
      }
    });

    // Always center on Kathmandu Valley by default if no active selected
    if (!selectedRescueId) {
      mapRef.current.setView([27.7172, 85.3239], 13);
    }
  }, [rescues, selectedRescueId]);

  // Update Volunteer Position Marker
  useEffect(() => {
    if (!mapRef.current || typeof L === 'undefined') return;

    if (volunteerMarkerRef.current) {
      volunteerMarkerRef.current.remove();
      volunteerMarkerRef.current = null;
    }

    if (volunteerPosition) {
      const iconHtml = `
        <div class="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-lg animate-pulse-slow">
          🚑
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-volunteer-marker',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      volunteerMarkerRef.current = L.marker([volunteerPosition.lat, volunteerPosition.lng], { icon: markerIcon })
        .addTo(mapRef.current);

      volunteerMarkerRef.current.bindPopup(`<div class="p-1 font-semibold text-xs text-blue-700">Volunteer Active Ambulance</div>`).openPopup();

      // Recenter around volunteer and target
      mapRef.current.setView([volunteerPosition.lat, volunteerPosition.lng], 14);
    }
  }, [volunteerPosition]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200/80">
      <div id={mapContainerId.current} className="w-full h-full z-10" />
      
      {/* Kathmandu Valley Recenter button and status overlay */}
      <button 
        onClick={() => {
          if (mapRef.current) {
            mapRef.current.setView([27.7172, 85.3239], 13);
          }
        }}
        className="absolute top-2 right-2 z-20 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-md text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:shadow-lg transition-all"
        title="Recenter on Kathmandu Valley"
      >
        <MapPin className="w-3.5 h-3.5 text-rose-500" />
        <span>Kathmandu Valley (27.7172° N, 85.3239° E)</span>
      </button>

      <div className="absolute bottom-2 left-2 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md text-[10px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
        <span className="flex items-center gap-1">🔴 Critical</span>
        <span className="flex items-center gap-1">🟡 Moderate</span>
        <span className="flex items-center gap-1">🟢 Minor</span>
        <span className="flex items-center gap-1">🚨 En Route</span>
        <span className="flex items-center gap-1">💗 Adoption Ready</span>
      </div>
    </div>
  );
}
