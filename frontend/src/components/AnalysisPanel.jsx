import { useState, useEffect } from 'react';
import { Calendar, MapPin, Play, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AnalysisPanel({ 
  position, 
  setPosition,
  startDate, 
  setStartDate, 
  endDate, 
  setEndDate, 
  onAnalyze, 
  loading,
  error
}) {
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');

  // Sync inputs when position prop changes from outside (e.g., Map click)
  useEffect(() => {
    if (position) {
      const currentLat = parseFloat(latInput);
      const currentLng = parseFloat(lngInput);
      
      // Only update if the change came from outside (like a map click)
      // or if it's the first time position is set.
      if (isNaN(currentLat) || Math.abs(currentLat - position.lat) > 0.000001) {
        setLatInput(position.lat.toFixed(6));
      }
      if (isNaN(currentLng) || Math.abs(currentLng - position.lng) > 0.000001) {
        setLngInput(position.lng.toFixed(6));
      }
    } else {
      setLatInput('');
      setLngInput('');
    }
  }, [position]);

  const handleLatChange = (val) => {
    setLatInput(val);
    const lat = parseFloat(val);
    if (!isNaN(lat)) {
      setPosition(prev => ({ ...prev, lat, lng: prev?.lng || 0 }));
    }
  };

  const handleLngChange = (val) => {
    setLngInput(val);
    const lng = parseFloat(val);
    if (!isNaN(lng)) {
      setPosition(prev => ({ ...prev, lng, lat: prev?.lat || 0 }));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      whileHover={{ y: -2 }}
      className="analysis-panel glass p-6 rounded-2xl flex flex-col gap-6 shadow-xl" 
      style={{ padding: '24px', borderRadius: '16px' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="text-primary w-5 h-5" />
        <h3 className="text-lg font-bold">Analysis Parameters</h3>
      </div>

      <div className="space-y-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="input-group">
          <label className="text-xs text-text-dim uppercase tracking-wider block mb-2 font-bold" style={{ fontSize: '11px', marginBottom: '8px', display: 'block' }}>
            Region Coordinates
          </label>
          <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-primary font-bold">LAT</span>
              <input 
                type="number"
                step="0.000001"
                value={latInput}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="0.000000"
                className="w-full bg-[#1c2621]/50 border border-border rounded-xl p-3 pl-10 text-sm text-[#f8fafc] focus:border-primary outline-none transition-all hover:bg-white/5 font-mono"
                style={{ borderRadius: '12px', padding: '12px 12px 12px 40px', backgroundColor: '#1c2621' }}
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-secondary font-bold">LNG</span>
              <input 
                type="number"
                step="0.000001"
                value={lngInput}
                onChange={(e) => handleLngChange(e.target.value)}
                placeholder="0.000000"
                className="w-full bg-[#1c2621]/50 border border-border rounded-xl p-3 pl-10 text-sm text-[#f8fafc] focus:border-primary outline-none transition-all hover:bg-white/5 font-mono"
                style={{ borderRadius: '12px', padding: '12px 12px 12px 40px', backgroundColor: '#1c2621' }}
              />
            </div>
          </div>
          {!position && (
            <div className="flex items-center gap-2 text-[10px] text-text-dim italic mt-2">
              <AlertCircle size={12} />
              <span>Or click on map to select region</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="input-group">
            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2 font-bold" style={{ fontSize: '11px', marginBottom: '8px', display: 'block' }}>
              Start Date <span className="text-[10px] opacity-50">(YYYY-MM-DD)</span>
            </label>
            <div className="relative">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#1c2621] border border-border rounded-xl p-3 text-sm text-[#f8fafc] focus:border-primary outline-none transition-all hover:bg-white/5" 
                style={{ 
                  width: '100%', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  color: '#f8fafc',
                  backgroundColor: '#1c2621',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
            </div>
          </div>
          <div className="input-group">
            <label className="text-xs text-text-dim uppercase tracking-wider block mb-2 font-bold" style={{ fontSize: '11px', marginBottom: '8px', display: 'block' }}>
              End Date <span className="text-[10px] opacity-50">(YYYY-MM-DD)</span>
            </label>
            <div className="relative">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#1c2621] border border-border rounded-xl p-3 text-sm text-[#f8fafc] focus:border-primary outline-none transition-all hover:bg-white/5"
                style={{ 
                  width: '100%', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  color: '#f8fafc',
                  backgroundColor: '#1c2621',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
            </div>
          </div>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAnalyze}
          disabled={!position || loading}
          className={`btn-primary w-full justify-center mt-4 h-12 ${(!position || loading) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
          style={{ width: '100%', justifyContent: 'center', marginTop: '16px', borderRadius: '12px' }}
        >
          {loading ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" />
              <span className="font-bold">Execute GEE Analysis</span>
            </div>
          )}
        </motion.button>
      </div>

      <div className="mt-4 pt-6 border-t border-border flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between text-[10px] text-text-dim uppercase tracking-widest font-bold">
          <span>Processing Engine</span>
          <span className="text-secondary">Sentinel-2</span>
        </div>
        <div className="w-full bg-border h-1 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={loading ? { width: "100%" } : { width: "100%" }}
            transition={loading ? { duration: 5, repeat: Infinity } : { duration: 1 }}
            className="h-full bg-primary"
          />
        </div>
      </div>
    </motion.div>
  );
}
