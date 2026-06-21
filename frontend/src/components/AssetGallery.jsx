import { motion } from 'framer-motion';
import { ImageIcon, ExternalLink, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AssetGallery({ patches, classifications, loading }) {
  if (!patches || patches.length === 0) {
    return (
      <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-text-dim border-dashed border-2 border-border/50">
        <ImageIcon size={48} className="mb-4 opacity-20" />
        <p className="text-sm font-medium">No anomaly patches detected yet</p>
        <p className="text-xs opacity-50 mt-1">Run an analysis to harvest satellite frames</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="text-primary w-5 h-5" />
          <h3 className="text-xl font-bold">Anomaly Patch Gallery</h3>
        </div>
        <span className="text-[10px] glass px-3 py-1 rounded-full font-bold uppercase tracking-widest text-text-dim">
          {patches.length} Sources Found
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {patches.map((patch, index) => {
          const result = classifications[patch];
          const isClassifying = loading && !result;

          return (
            <motion.div
              key={patch}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative glass rounded-2xl overflow-hidden border border-border/50 hover:border-primary/30 transition-all shadow-lg"
            >
              {/* Image Container */}
              <div className="relative aspect-square overflow-hidden bg-black/40">
                <img 
                  src={`http://localhost:8000${patch}`} 
                  alt={`Anomaly ${index}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Overlay for classification status */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                   <a 
                    href={`http://localhost:8000${patch}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-white flex items-center gap-1.5 text-xs font-bold"
                   >
                     View Source <ExternalLink size={12} />
                   </a>
                </div>

                {isClassifying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Classifying...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Footer */}
              <div className="p-4 bg-white/5">
                {result ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {result.label === 'healthy_forest' ? (
                          <CheckCircle size={14} className="text-primary" />
                        ) : (
                          <AlertTriangle size={14} className="text-accent" />
                        )}
                        <span className={`text-xs font-bold uppercase tracking-tight ${
                          result.label === 'healthy_forest' ? 'text-primary' : 'text-accent'
                        }`}>
                          {result.label.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-50">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    {/* Mini Confidence Bar */}
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${result.confidence * 100}%` }}
                        className={`h-full ${result.label === 'healthy_forest' ? 'bg-primary' : 'bg-accent'}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-text-dim/40 py-1">
                    <Sparkles size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest italic">Pending ML Insight</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
