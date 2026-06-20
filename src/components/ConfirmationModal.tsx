import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDanger?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  isDanger = true
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto"
        />

        {/* Modal structure */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-100 z-10 pointer-events-auto"
        >
          {/* Header style */}
          <div className="p-6 pb-4 flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${isDanger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-grow">
              <h3 className="text-sm font-extrabold text-slate-900 pr-5">{title}</h3>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{message}</p>
            </div>
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-50 rounded-lg text-slate-300 hover:text-slate-600 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Action buttons footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isDanger 
                  ? 'bg-rose-600 hover:bg-rose-500 hover:shadow-rose-500/10' 
                  : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/10'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
