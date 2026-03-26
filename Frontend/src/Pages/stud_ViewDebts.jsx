import { BASE_URL } from '../config';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Search, ChevronDown, ArrowDownUp, AlertTriangle, Loader2, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { useNotifications } from '../context/NotificationContext';

let razorpayScriptPromise;

const loadRazorpayScript = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
};

const DebtCard = ({ data, onPayDebt, isPaying }) => (
  <div className="bg-white rounded-xl mb-4 p-6 flex justify-between items-center shadow-sm border border-gray-100 transition-all overflow-hidden hover:shadow-md">
    <div>
      <h2 className="text-2xl font-medium text-black mb-1">{data.name}</h2>
    </div>

    <div className="flex flex-col items-end gap-2">
      <p className="font-bold text-gray-500 tracking-wide uppercase text-sm">
        Debt: <span className="text-black text-lg ml-1">₹{data.currentDebt} <span className="text-gray-400 font-medium normal-case text-base">/ ₹{data.limit}</span></span>
      </p>
      {data.currentDebt > 0 ? (
        <button
          className={`text-white px-6 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${isPaying ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#f97316] hover:bg-[#ea580c]'}`}
          disabled={isPaying}
          onClick={() => onPayDebt(data)}
        >
          {isPaying ? 'Processing...' : 'Pay Debt'}
        </button>
      ) : (
        <div className="bg-[#D1FAE5] text-[#065F46] px-6 py-2 rounded-full font-medium text-sm">
          Settled
        </div>
      )}
    </div>
  </div>
);

export default function ViewDebts() {
  const { showAlert } = useNotifications();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingDebtId, setPayingDebtId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeSort, setActiveSort] = useState('A-Z');

  const [payModal, setPayModal] = useState({ isOpen: false, debt: null, amount: '' });

  const sortRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (sortRef.current && !sortRef.current.contains(event.target)) setIsSortOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMyDebts = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (!token) {
        console.error('NO TOKEN FOUND IN BROWSER!');
        return;
      }

      const res = await axios.get(`${BASE_URL}/api/debts/my-debts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'success') {
        const mappedData = res.data.data.map((d) => ({
          id: d._id,
          name: d.canteen?.name || 'Unknown Canteen',
          currentDebt: d.amountOwed,
          limit: d.limit || d.canteen?.defaultLimit || 3000
        }));
        setDebts(mappedData);
      }
    } catch (err) {
      console.error('Failed to fetch debts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyDebts();

    const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const socket = io(`${BASE_URL}`);

        socket.on('connect', () => {
          socket.emit('join-student', user._id);
        });

        socket.on('debt-updated', () => {
          fetchMyDebts();
        });

        return () => {
          socket.disconnect();
        };
      } catch (e) {
        console.error('Socket err', e);
      }
    }

    return undefined;
  }, []);

  const openPayModal = (debt) => {
    setPayModal({ isOpen: true, debt: debt, amount: debt.currentDebt.toString() });
  };

  const closePayModal = () => {
    setPayModal({ isOpen: false, debt: null, amount: '' });
  };

  const confirmPayment = async () => {
    const paymentAmount = parseFloat(payModal.amount);
    const targetDebt = payModal.debt;

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showAlert("Invalid Amount", "Please enter a valid amount greater than 0.", "error");
      return;
    }
    if (paymentAmount > targetDebt.currentDebt) {
      showAlert("Amount Exceeds Debt", `Amount cannot exceed the total debt of ₹${targetDebt.currentDebt}!`, "error");
      return;
    }

    closePayModal();
    await handlePayDebt(targetDebt, paymentAmount);
  };

  // Check if payment amount is valid
  const isPaymentAmountValid = () => {
    const amount = parseFloat(payModal.amount);
    return !isNaN(amount) && amount > 0 && amount <= (payModal.debt?.currentDebt || 0);
  };

  const handlePayDebt = async (debt, amount = null) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (!token) {
      showAlert('Session Expired', 'Please log in again to continue.', 'warning');
      return;
    }

    setPayingDebtId(debt.id);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay checkout could not be loaded. Please check your internet connection and try again.');
      }

      const createOrderRes = await axios.post(
        `${BASE_URL}/api/payments/debts/${debt.id}/create-order`,
        { amount: amount || debt.currentDebt },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const checkoutData = createOrderRes.data.data;
      const razorpay = new window.Razorpay({
        key: checkoutData.keyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: checkoutData.merchantName,
        description: checkoutData.description,
        order_id: checkoutData.orderId,
        prefill: checkoutData.prefill,
        theme: {
          color: '#f97316'
        },
        handler: async (response) => {
          try {
            await axios.post(
              `${BASE_URL}/api/payments/verify`,
              {
                paymentRecordId: checkoutData.paymentRecordId,
                ...response
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            await fetchMyDebts();
            showAlert('Payment Successful', `Your debt for ${debt.name} has been updated.`, 'success');
          } catch (error) {
            showAlert(
              'Verification Failed',
              error.response?.data?.message || 'Payment was authorized, but verification failed. Please contact support.',
              'error'
            );
          } finally {
            setPayingDebtId(null);
          }
        },
        modal: {
          ondismiss: () => setPayingDebtId(null)
        }
      });

      razorpay.on('payment.failed', (response) => {
        const failureMessage = response.error?.description || 'Payment failed. Please try again.';
        showAlert('Payment Failed', failureMessage, 'error');
        setPayingDebtId(null);
      });

      razorpay.open();
    } catch (error) {
      showAlert(
        'Unable To Start Payment',
        error.response?.data?.message || error.message || 'Unable to start Razorpay checkout right now.',
        'error'
      );
      setPayingDebtId(null);
    }
  };

  let processedDebts = [...debts];

  if (searchTerm) {
    processedDebts = processedDebts.filter((canteen) =>
      canteen.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  processedDebts.sort((a, b) => {
    if (activeSort === 'High to Low') return b.currentDebt - a.currentDebt;
    if (activeSort === 'Low to High') return a.currentDebt - b.currentDebt;
    if (activeSort === 'A-Z') return a.name.localeCompare(b.name);
    if (activeSort === 'Z-A') return b.name.localeCompare(a.name);
    return 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#f97316] mb-4" />
        <p className="text-xl text-gray-600 font-medium">Fetching your debts...</p>
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10 w-full min-h-screen bg-[#f8f9fa] relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-5 relative z-20">
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-5 h-11 w-full max-w-[450px] shadow-sm focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all duration-300">
          <Search className="w-4 h-4 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search for Canteen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none text-sm text-gray-700 bg-transparent placeholder-gray-400 font-medium"
          />
        </div>

        <div className="flex gap-4">
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="bg-[#f97316] text-white px-5 h-11 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-[#ea580c] transition-colors justify-between min-w-[140px] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4" />
                {activeSort === 'A-Z' ? 'Sort by' : activeSort}
              </div>
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden py-2">
                {['A-Z', 'Z-A', 'High to Low', 'Low to High'].map((option) => (
                  <div
                    key={option}
                    onClick={() => { setActiveSort(option); setIsSortOpen(false); }}
                    className={`px-5 py-2.5 text-sm cursor-pointer transition-colors ${activeSort === option ? 'bg-orange-50 font-bold text-[#f97316]' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    {option.includes('High') ? `Debt: ${option}` : `Name: ${option}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        {processedDebts.length > 0 ? (
          processedDebts.map((canteen) => (
            <DebtCard
              key={canteen.id}
              data={canteen}
              onPayDebt={openPayModal}
              isPaying={payingDebtId === canteen.id}
            />
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center flex flex-col items-center justify-center gap-3 mt-4 min-h-[300px]">
            <div className="bg-orange-50 p-4 rounded-full mb-2">
              <AlertTriangle className="w-10 h-10 text-[#f97316]" />
            </div>
            <p className="text-xl font-bold text-gray-800">No debts found!</p>
            <p className="text-gray-500 text-sm font-medium mb-2">Try adjusting your active filters.</p>
            <button
              onClick={() => { setSearchTerm(''); setActiveSort('A-Z'); }}
              className="bg-white border-2 border-gray-200 hover:border-[#f97316] hover:text-[#f97316] text-gray-700 font-bold px-6 py-2.5 rounded-xl transition-all duration-300 text-sm cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* PAYMENT AMOUNT MODAL */}
      {payModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={closePayModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-semibold text-gray-900 mb-2">Pay Debt</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter the amount you want to pay for <strong>{payModal.debt?.name}</strong>.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Current Debt</p>
              <p className="text-2xl font-bold text-gray-900">₹{payModal.debt?.currentDebt}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={payModal.amount}
                  onChange={(e) => setPayModal({ ...payModal, amount: e.target.value })}
                  className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-[#6366f1] outline-none text-lg transition-colors ${
                    !isPaymentAmountValid() && payModal.amount
                      ? 'border-red-300 focus:ring-red-200 bg-red-50'
                      : 'border-gray-300 focus:ring-[#6366f1]'
                  }`}
                  placeholder="Enter amount"
                  min="1"
                  max={payModal.debt?.currentDebt}
                  autoFocus
                />
              </div>
              {!isPaymentAmountValid() && payModal.amount && (
                <p className="text-xs text-red-600 mt-1">
                  Amount must be between ₹1 and ₹{payModal.debt?.currentDebt}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closePayModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                disabled={!isPaymentAmountValid()}
                className={`flex-1 font-medium py-3 rounded-lg transition ${
                  isPaymentAmountValid()
                    ? 'bg-[#f97316] hover:bg-[#ea580c] text-white cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
