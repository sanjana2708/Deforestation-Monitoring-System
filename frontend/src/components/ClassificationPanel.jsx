import { Upload, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, Sparkles, Activity } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ClassificationPanel({ onClassify, loading, result, batchStats, delay = 0 }) {
  const [imagePath, setImagePath] = useState('');

  const stats = batchStats ? {
    total: batchStats.total,
    healthy: batchStats.results.filter(r => r.label === 'healthy_forest').length,
    anomaly: batchStats.results.filter(r => r.label !== 'healthy_forest').length,
    pending: batchStats.total - batchStats.results.length
  } : null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -2 }}
      className="glass p-6 rounded-2xl flex flex-col gap-6" 
      style={{ padding: '24px', borderRadius: '16px' }}
    >
      <div className="flex items-center gap-3">
        <Activity className="text-secondary w-5 h-5" />
        <h3 className="font-bold">Intelligence Summary</h3>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-xl border-primary/20 bg-primary/5">
            <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Healthy</p>
            <p className="text-2xl font-bold">{stats.healthy}</p>
          </div>
          <div className="glass p-4 rounded-xl border-accent/20 bg-accent/5">
            <p className="text-[10px] text-accent uppercase font-bold tracking-widest mb-1">Anomaly</p>
            <p className="text-2xl font-bold">{stats.anomaly}</p>
          </div>
          <div className="col-span-2 glass px-4 py-2 rounded-xl flex items-center justify-between">
             <span className="text-[10px] text-text-dim uppercase font-bold">Total Analyzed</span>
             <span className="text-sm font-bold">{stats.total - stats.pending} / {stats.total}</span>
          </div>
        </div>
      )}

      <div className="space-y-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="pt-4 border-t border-border/50">
          <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold mb-3">Manual Inspector</p>
          <div className="flex gap-3" style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Patch path..."
              value={imagePath}
              onChange={(e) => setImagePath(e.target.value)}
              className="flex-1 bg-bg-card border border-border rounded-xl p-3 text-sm text-text-main outline-none focus:border-secondary transition-all hover:bg-white/5" 
            />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onClassify(imagePath)}
              disabled={loading || !imagePath}
              className="btn-primary w-12 h-12 p-0 flex items-center justify-center rounded-xl bg-secondary text-bg-deep"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload size={20} />}
            </motion.button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className={`p-5 rounded-2xl border flex flex-col gap-3 ${
                result.label === 'healthy_forest' ? 'bg-primary/5 border-primary/20' : 'bg-accent/10 border-accent/20'
              }`} 
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  result.label === 'healthy_forest' ? 'bg-primary/20' : 'bg-accent/20'
                }`}>
                  {result.label === 'healthy_forest' ? (
                    <CheckCircle className="text-primary w-7 h-7" />
                  ) : (
                    <AlertTriangle className="text-accent w-7 h-7" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-dim uppercase tracking-widest font-bold">In-Depth Check</span>
                    <Sparkles size={10} className="text-secondary" />
                  </div>
                  <h4 className={`text-xl font-bold tracking-tight capitalize ${
                    result.label === 'healthy_forest' ? 'text-primary' : 'text-accent'
                  }`}>
                    {result.label.replace('_', ' ')}
                  </h4>
                </div>
              </div>

              <div className="w-full bg-black/20 h-1 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence * 100}%` }}
                  className={`h-full ${result.label === 'healthy_forest' ? 'bg-primary' : 'bg-accent'}`}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

