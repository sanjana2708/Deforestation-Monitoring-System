import { useEffect } from 'react'
// 🌟 FIX 1: Added 'useMapEvents' to the react-leaflet import list
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function Recenter({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], Math.max(map.getZoom(), 15))
  }, [lat, lon, map])
  return null
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        // LatLng values extracted and passed back to context setter
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// 🌟 FIX 2: Added 'onMapClick' into the main component argument signature
export default function ForestMap({ lat, lon, onMapClick }) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={11}
      className="forest-map"
      scrollWheelZoom
      style={{ height: '100%', width: '100%', borderRadius: '12px', minHeight: '280px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      <CircleMarker 
        center={[lat, lon]} 
        radius={9} 
        pathOptions={{ color: '#c9a227', fillColor: '#f5d76e', fillOpacity: 0.95, weight: 2 }} 
      />
      
      {/* Dynamic recentering script trigger */}
      <Recenter lat={lat} lon={lon} />
      
      {/* 🌟 FIX 3: Injected the click event handler inside the MapContainer context */}
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  )
}