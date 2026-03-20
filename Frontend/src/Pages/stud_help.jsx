import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function StudentHelp() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "My order was rejected",
      answer: "Your order has been rejected by the canteen owner due to some reason. Therefore your debt balance remains unchanged. For any clarification on why the order was canceled, Please reach out to the canteen owner, or you can continue with your next order."
    },
    {
      question: "Payment Related Issues",
      answer: "Details regarding payment related issues will appear here."
    },
    {
      question: "Can i pay my debt offline",
      answer: "Information explaining offline debt payments will appear here."
    },
    {
      question: "Updating Personal Information",
      answer: "Steps to update your personal information will appear here."
    },
    {
      question: "How to pay Debts",
      answer: "Instructions on paying debts will appear here."
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full px-10 py-8 md:px-16 md:py-10 text-[#1e293b]"> 
      <div className="max-w-6xl mx-auto w-full"> 
        
        <h1 className="text-3xl lg:text-4xl font-medium mb-6">FAQs</h1>

        {/* Accordion Container */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 w-full">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`border-b border-gray-200 last:border-0 ${openIndex === index ? 'bg-white' : ''}`}
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full text-left px-8 py-4 flex justify-between items-center focus:outline-none hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-lg lg:text-xl text-gray-800">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronDown className="w-6 h-6 text-gray-800 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-gray-800 flex-shrink-0" />
                )}
              </button>
              
              {/* Expanded Content */}
              {openIndex === index && (
                <div className="px-8 pb-5 text-gray-600 text-[15px] lg:text-base leading-relaxed pr-12">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Us Section */}
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