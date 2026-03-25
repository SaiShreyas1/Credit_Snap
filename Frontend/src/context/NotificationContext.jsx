import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, X } from 'lucide-react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    variant: 'info', // 'info', 'success', 'warning', 'error'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    onClose: null
  });

  const showAlert = useCallback((title, message, variant = 'info', onClose = null) => {
    setModal({
      isOpen: true,
      type: 'alert',
      variant,
      title,
      message,
      onConfirm: null,
      onCancel: null,
      onClose
    });
  }, []);

  const showConfirm = useCallback((title, message, onConfirm, onCancel = null) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      variant: 'warning',
      title,
      message,
      onConfirm,
      onCancel,
      onClose: null
    });
  }, []);

  const closeModal = useCallback(() => {
    if (modal.type === 'confirm' && modal.onCancel) {
      modal.onCancel();
    }
    if (modal.onClose) {
      modal.onClose();
    }
    setModal(prev => ({ ...prev, isOpen: false }));
  }, [modal]);

  const handleConfirm = useCallback(() => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    setModal(prev => ({ ...prev, isOpen: false }));
  }, [modal]);

  const getIcon = () => {
    switch (modal.variant) {
      case 'success': return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'error': return <XCircle className="w-12 h-12 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-12 h-12 text-orange-500" />;
      default: return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getButtonClass = () => {
    switch (modal.variant) {
      case 'success': return 'bg-green-500 hover:bg-green-600 focus:ring-green-500';
      case 'error': return 'bg-red-500 hover:bg-red-600 focus:ring-red-500';
      case 'warning': return 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500';
      default: return 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500';
    }
  };

  return (
    <NotificationContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* ── CENTRAL MODAL UI ── */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={modal.type === 'alert' ? closeModal : undefined}
          ></div>

          {/* Modal Card */}
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 flex flex-col items-center text-center">
              <div className="mb-6 bg-slate-50 p-4 rounded-full">
                {getIcon()}
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {modal.title}
              </h3>
              
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                {modal.message}
              </p>

              <div className="flex gap-3 w-full">
                {modal.type === 'confirm' && (
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={modal.type === 'confirm' ? handleConfirm : closeModal}
                  className={`flex-1 px-4 py-3 rounded-xl text-white font-semibold shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-offset-2 cursor-pointer ${getButtonClass()}`}
                >
                  {modal.type === 'confirm' ? 'Confirm' : 'Okay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
