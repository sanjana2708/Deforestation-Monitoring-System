import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function Recenter({ lat, lon }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], Math.max(map.getZoom(), 11))
  }, [lat, lon, map])
  return null
}

export default function ForestMap({ lat, lon }) {
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
      <CircleMarker center={[lat, lon]} radius={9} pathOptions={{ color: '#c9a227', fillColor: '#f5d76e', fillOpacity: 0.95, weight: 2 }} />
      <Recenter lat={lat} lon={lon} />
    </MapContainer>
  )
}
