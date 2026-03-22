import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export default function Help() {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "How to edit menu",
      answer: "If any item in menu is not available temporarily you can simply change the availability status by the availability check box and to add an item simply you can click on add item and add it. To delete any item just click on edit and then click on delete to delete it permanently from menu."
    },
    {
      question: "Payment related issues",
      answer: "Details regarding payment related issues will appear here."
    },
    {
      question: "Understand what is Credit",
      answer: "Information explaining how credit works will appear here."
    },
    {
      question: "Updating Personal Information",
      answer: "Steps to update your personal information will appear here."
    },
    {
      question: "How to clear Debt manually",
      answer: "Instructions on manually clearing debt will appear here."
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    // Changed to px-10 py-8 to keep it wide but reduce top/bottom padding
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
                // Reduced py-5 to py-4 to save vertical space inside the accordion
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
        {/* Changed mt-16 to mt-8 to pull this section up and remove the need to scroll */}
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