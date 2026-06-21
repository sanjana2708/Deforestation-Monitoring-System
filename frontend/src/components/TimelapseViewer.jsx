import { motion } from 'framer-motion';
import { Play, Calendar, Zap, Maximize2, Layers } from 'lucide-react';

export default function TimelapseViewer({ timelapseUrl, dateRange }) {
  if (!timelapseUrl) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-8 rounded-2xl space-y-6 shadow-2xl overflow-hidden relative"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full -mr-32 -mt-32"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="text-secondary w-5 h-5 fill-secondary" />
            <h3 className="text-2xl font-bold tracking-tight">Himalayan Timelapse</h3>
          </div>
          <p className="text-text-dim text-sm max-w-lg">
            Visual progression of forest canopy health throughout the selected observation period. 
            Generated automatically from Sentinel-2 cloud-free mosaics.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
            <Calendar className="text-primary w-4 h-4" />
            <div>
              <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider">Time Window</p>
              <p className="text-xs font-mono font-bold text-primary">{dateRange.start} → {dateRange.end}</p>
            </div>
          </div>
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
            <Layers className="text-secondary w-4 h-4" />
            <div>
              <p className="text-[10px] text-text-dim uppercase font-bold tracking-wider">Resolution</p>
              <p className="text-xs font-mono font-bold text-secondary">224px (CNN optimized)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video/GIF Container */}
      <div className="group relative rounded-3xl overflow-hidden border border-border shadow-inner bg-black/40 aspect-video md:aspect-[21/9]">
        <img 
          src={`http://localhost:8000${timelapseUrl}`} 
          alt="Deforestation Timelapse" 
          className="w-full h-full object-contain"
        />
        
        {/* Quality Overlay */}
        <div className="absolute top-4 right-4 flex gap-2">
           <span className="glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-black/40 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
             Live Asset
           </span>
        </div>

        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-4 text-xs text-text-dim">
          <span className="flex items-center gap-1.5 font-bold">
            <Play size={14} className="text-primary fill-primary" /> Sentinel Engine 4.0
          </span>
          <span className="w-1 h-1 rounded-full bg-border"></span>
          <span className="font-medium">Temporal Smoothing: Active</span>
        </div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-1.5">
          <Maximize2 size={12} /> Expand Focus
        </button>
      </div>
    </motion.div>
  );
}
