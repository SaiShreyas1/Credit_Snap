import React, { useState } from 'react';
import OwnerLayout from './owner_layout';

export default function CanteenHome() {
  // Manage operational boolean flag representing whether the canteen accepts live orders
  // State for the toggle switch (Red = false, Green = true)
  const [isCanteenOpen, setIsCanteenOpen] = useState(false);

  return (
    <OwnerLayout>
      <div className="active-orders-container">
        {/* Isolated inline styling encapsulating the toggle component and active orders view */}
        <style>{`
          .active-orders-container {
            display: flex;
            flex-direction: column;
            height: 100%; /* Takes up the full height of the dashboard container */
            width: 100%;
          }

          /* --- TOP ROW --- */
          .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
          }

          .page-title {
            font-size: 34px;
            font-weight: 400;
            color: #000;
          }

          .status-container {
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 22px;
            font-weight: 400;
            color: #000;
          }

          /* --- TOGGLE SWITCH --- */
          .switch {
            position: relative;
            display: inline-block;
            width: 64px;
            height: 34px;
          }
          
          .switch input { 
            opacity: 0; 
            width: 0; 
            height: 0; 
          }
          
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #D00000; /* Red when OFF */
            transition: .4s;
            border-radius: 34px;
          }
          
          .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
          }
          
          input:checked + .slider { 
            background-color: #38b000; /* Green when ON */
          }
          
          input:checked + .slider:before { 
            transform: translateX(30px); 
          }

          /* --- CENTERED TEXT --- */
          .empty-state-wrapper {
            flex-grow: 1; /* Pushes everything else out of the way to take remaining space */
            display: flex;
            align-items: center;
            justify-content: center;
            padding-bottom: 80px; /* Slight optical adjustment to center it perfectly */
          }

          .empty-text {
            font-family: "Righteous", "Arial Black", sans-serif;
            font-size: 80px;
            font-weight: 700;
            color: #000;
            letter-spacing: -1px;
          }
        `}</style>

        {/* Top Header Row */}
        <div className="page-header">
          <h1 className="page-title">Active Orders</h1>
          
          <div className="status-container">
            <span>Canteen Status:</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isCanteenOpen} 
                onChange={() => setIsCanteenOpen(!isCanteenOpen)} 
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Render contextual status texts alternating dynamically per current toggle state */}
        {/* Dynamic Centered Text */}
        <div className="empty-state-wrapper">
        {isCanteenOpen ? (
            /* Shows when toggle is ON (Green) */
            <h2 className="empty-text">No Current Orders</h2>
        ) : (
            /* Shows when toggle is OFF (Red) */
            <div style={{ textAlign: 'center' }}>
            <h2 className="empty-text" style={{ color: '#D00000' }}>Canteen Closed</h2>
            <p style={{ fontSize: '24px', color: '#666', marginTop: '10px' }}>
                Toggle status to "Accepting Orders" to go live
            </p>
            </div>
        )}
        </div>

      </div>
    </OwnerLayout>
  );
}