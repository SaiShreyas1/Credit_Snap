import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function StudentHelp() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  // openIndexes stores an array of indices for the FAQ items currently expanded.
  // Using an array (instead of a single number) allows multiple accordions to be open simultaneously.
  const [openIndexes, setOpenIndexes] = useState([]);

  // ==========================================
  // STATIC DATA
  // ==========================================
  
  // Hardcoded list of Frequently Asked Questions and their corresponding answers.
  const faqs = [
    {
      question: "My order was rejected",
      answer: "Orders can be rejected by canteens (due to some reason) or manually cancelled by you from your Dashboard while still pending. In both cases, your debt balance remains completely unaffected. You can verify the status in your Order History or contact the canteen owner directly for any further clarification."
    },
    {
      question: "Payment Related Issues",
      answer: "If you encounter any issues while making an online payment (like money deducted but debt not updated), please wait a few minutes and refresh the page. If the issue persists, contact the canteen owner or email our support with your transaction details."
    },
    {
      question: "Can I pay my debt offline?",
      answer: "Yes, you can directly pay the canteen owner with cash or via their personal UPI at the counter. Once you pay them, the canteen owner will manually update your debt balance in the system, which will immediately reflect in your account."
    },
    {
      question: "Updating Personal Information",
      answer: "To update your personal details like your phone number, or hall and room number, simply navigate to the Profile section by clicking on your avatar at the top right of the navigation bar, and then click on 'Edit Profile'."
    },
    {
      question: "How to pay Debts",
      answer: "Navigate to the 'View Debts' section from the left sidebar menu. Here you will see a list of canteens you owe money to. Click the 'Pay Debt' button, enter the amount you wish to pay, and proceed securely with the Razorpay payment gateway. Alternatively, you can pay via cash or UPI directly at the canteen counter, and the owner will manually update and clear your debt in the system."
    }
  ];

  // ==========================================
  // HANDLERS
  // ==========================================

  /**
   * Toggles the visibility of a specific FAQ item.
   * If the clicked index is already in the array, it removes it (collapsing the item).
   * If it is not in the array, it adds it (expanding the item).
   */
  const toggleFaq = (index) => {
    setOpenIndexes((currentIndexes) => (
      currentIndexes.includes(index)
        ? currentIndexes.filter((currentIndex) => currentIndex !== index)
        : [...currentIndexes, index]
    ));
  };

  // ==========================================
  // RENDER UI
  // ==========================================

  return (
    <div className="w-full px-10 py-8 md:px-16 md:py-10 text-[#1e293b]"> 
      <div className="max-w-6xl mx-auto w-full"> 
        
        {/* --- PAGE HEADER --- */}
        <h1 className="text-3xl lg:text-4xl font-medium mb-6">FAQs</h1>

        {/* --- FAQ ACCORDION CONTAINER --- */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 w-full">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`border-b border-gray-200 last:border-0 ${openIndexes.includes(index) ? 'bg-white' : ''}`}
            >
              {/* Accordion Toggle Button */}
              <button
                onClick={() => toggleFaq(index)}
                className="cursor-pointer w-full text-left px-8 py-4 flex justify-between items-center focus:outline-none hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-lg lg:text-xl text-gray-800">{faq.question}</span>
                {/* Dynamic Icon: Down arrow when open, Right arrow when closed */}
                {openIndexes.includes(index) ? (
                  <ChevronDown className="w-6 h-6 text-gray-800 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-gray-800 flex-shrink-0" />
                )}
              </button>
              
              {/* Accordion Expanded Content (Only renders if this item's index is in the openIndexes array) */}
              {openIndexes.includes(index) && (
                <div className="px-8 pb-5 text-gray-600 text-[15px] lg:text-base leading-relaxed pr-12">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* --- CONTACT SUPPORT SECTION --- */}
        <div className="mt-8">
          <h2 className="text-3xl lg:text-4xl font-medium mb-3">Contact Us</h2>
          <p className="text-lg lg:text-xl text-gray-800 font-medium">
            For any queries email to:{' '}
            <a href="mailto:creditsnapiitk24@gmail.com" className="text-blue-600 hover:text-blue-800 font-normal transition-colors">
              creditsnapiitk24@gmail.com
            </a>
          </p>
        </div>
        
      </div>
    </div>
  );
}