import React from 'react';
import { Mail, Phone } from 'lucide-react';
// 1. The image is imported here:
import aboutImage from './about-illustration.png';

export default function AboutUs() {
  return (
    <main className="p-8 overflow-y-auto flex-1 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-normal text-gray-900 mb-6">About Us</h1>

      <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-10 items-center">
        
        {/* Illustration Section */}
        <div className="w-full lg:w-1/2 flex justify-center">
          {/* 2. And it is actually used here inside the curly braces! */}
          <img 
            src={aboutImage} 
            alt="CreditSnap Team Collaboration" 
            className="w-full max-w-lg object-contain"
          />
        </div>

        {/* Content Section */}
        <div className="w-full lg:w-1/2 flex flex-col gap-6 pr-4">
          <div className="text-black text-[17px] leading-relaxed">
            <span className="text-[5.5rem] font-normal float-left mr-3 leading-[0.7] mt-2 text-black">
              C
            </span>
            reditSnap is a specialized platform developed by students of IIT Kanpur to modernize the credit management system within campus canteens. Our mission is to streamline credit transactions between students and canteen managers, ensuring efficiency, transparency, and security. By digitizing credit operations that were traditionally manually managed, we aim to eliminate error, reduce waiting times, and enhance financial trust within the campus community.
          </div>

          <div className="mt-4">
            <h2 className="text-2xl font-medium text-black mb-5">Contact Information</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-[#6366f1]">
                  {/* Added strokeWidth={0} to remove the outline and make it solid */}
                  <Mail className="w-6 h-6" fill="currentColor" strokeWidth={0} />
                </div>
                <a href="mailto:creditsnapiitk24@gmail.com" className="text-[#6366f1] text-[17px] hover:underline">
                  creditsnapiitk24@gmail.com
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-[#22c55e]">
                  {/* Added strokeWidth={0} to remove the outline and make it solid */}
                  <Phone className="w-6 h-6" fill="currentColor" strokeWidth={0} />
                </div>
                <span className="text-black text-[17px]">+91 63034 52600</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </main>
  );
}