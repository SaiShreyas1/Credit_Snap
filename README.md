# 💳 Credit Snap



**Credit Snap** is a full-stack MERN web application built for IIT Kanpur's campus canteen ecosystem. It digitizes the campus canteen credit system — allowing students to place food orders on credit and pay later, while canteen owners manage menus, track debts, process payments, and monitor live orders in real time.



---



## 🚀 Features



- 🔐 **Secure Authentication**: IITK email-only signup with email verification, JWT-based sessions, and password recovery

- 🍽️ **Browse Canteens & Menus**: View all campus canteens, their open/closed status, and full menus

- 🛒 **Order on Credit**: Place food orders without upfront payment — your balance is tracked automatically per canteen

- 💸 **Razorpay Payments**: Pay outstanding dues securely online via Razorpay; offline cash payments also supported

- 🔔 **Real-Time Order Notifications**: Students get instant updates when orders are accepted or rejected via Socket.IO

- 📊 **Owner Analytics Dashboard**: Visual charts for weekly order counts, monthly earnings, and top-selling items

- 📋 **Live Order Management**: Canteen owners see incoming orders in real time and accept/reject with one click

- 💰 **Smart Debt Management**: Per-canteen credit limits, custom per-student limits, and debt threshold alerts

- 📧 **Email Debt Reminders**: Owners can send automated email reminders to students with pending balances

- 📜 **Complete History**: Both students and owners can view a unified history of all orders and payments

- 👤 **Profile Management**: Update personal info, profile photo, hall/room number, and canteen payment credentials



---



## 🧱 Tech Stack



### Frontend

- **React.js**, **HTML5**, **CSS3**

- **Socket.IO** (real-time order updates and notifications)



### Backend

- **Node.js**, **Express.js**

- **MongoDB** with **Mongoose**

- **JWT** & **bcrypt** for authentication

- **Razorpay** for online payment processing

- **Nodemailer** for email verification and debt reminders



---



## 📁 Project Structure



- React frontend (Vite)

- Express backend

- Mongoose schemas

- API endpoints

- Business logic

- Real-time handlers (Socket.IO)



---



## 👥 User Roles



### 👨‍🎓 Students

- Sign up with a valid `@iitk.ac.in` email and verify to activate account

- Browse campus canteens, view menus, and place food orders on credit

- View and pay outstanding dues per canteen (online via Razorpay or offline)

- Track full order & payment history with real-time status notifications



### 🏪 Canteen Owners

- Manage canteen menu — add, edit, delete items, and toggle availability

- View and manage incoming student orders live on the dashboard

- Accept or reject orders; credit balances are updated automatically

- Set global or per-student credit limits and send debt reminder emails

- Record offline cash payments and view analytics



---



## Setup Instructions



```bash

# 1. Clone the repository

git clone https://github.com/SaiShreyas1/Credit_Snap.git

cd Credit_Snap



# 2. Backend setup

cd Backend

npm install



# 3. Frontend setup

cd ../Frontend

# Note: --legacy-peer-deps is required to resolve TailwindCSS and Vite 8 peer dependency conflicts

npm install --legacy-peer-deps


# 4. Run the project (Run both terminals separately)

# In the Backend folder:
npm start



# In the Frontend folder:
npm run dev
