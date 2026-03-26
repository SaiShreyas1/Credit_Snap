# Credit_Snap

**Credit_Snap** is a full-stack MERN web application designed to streamline food ordering and digital "khata" (debt) management between students and campus canteens. The platform replaces traditional pen-and-paper tabs with a secure, real-time digital ecosystem, allowing students to order food seamlessly, track their credit limits, and settle debts online.

### 🚀 Features

* **🔐 Secure Authentication:** JWT-based login and session management for students and canteen owners.
* **🍔 Live Food Ordering:** Browse open canteens, search dynamic menus, and manage a digital cart with custom quantities.
* **💳 Smart Debt Management:** Track total owed amounts across different canteens. Includes automated alerts when students reach 80% or 100% of their credit limits.
* **💸 Digital Payments:** Secure, integrated online payment gateway powered by **Razorpay** to settle canteen debts instantly.
* **⚡ Real-Time Updates:** Live order status tracking (Pending, Accepted, Rejected) and instant canteen open/close sync powered by **Socket.IO**.
* **🔔 Interactive Notifications:** Real-time push notifications for order updates, debt limit warnings, and manual payment reminders from canteen owners.
* **📜 History & Tracking:** Comprehensive dashboards for students to view active orders, past transactions, and payment history.
* **🏪 Vendor Dashboard:** Tools for canteen owners to manage incoming orders, update menu availability, and monitor student debt lists.

### 🧱 Tech Stack

**Frontend**
* React.js, HTML5
* Tailwind CSS (Modern, responsive UI design)
* Lucide-React (Iconography)
* Socket.IO-client (Real-time updates)

**Backend & Integration**
* Node.js, Express.js
* MongoDB with Mongoose
* Socket.IO (WebSockets for live communication)
* Razorpay SDK (Payment processing)
* JWT & bcrypt (Authentication & Security)

### 📁 Project Structure

* **React frontend:** UI components, Context API (Notifications), React Router, Axios integration.
* **Express backend:** RESTful APIs for users, canteens, orders, and payments.
* **Mongoose schemas:** Data models for Users, Canteens, Orders, and Debt records.
* **Payment Controllers:** Razorpay order creation and signature verification.
* **Real-time handlers:** Socket.IO event listeners for broadcasting menu changes and order statuses.

### 👥 User Roles

**🎓 Students**
* Browse live menus and place food orders on credit.
* Track active orders and receive real-time status updates.
* Monitor total debt across various canteens and pay online via Razorpay.
* Manage profile details and view transaction history.

**🏪 Canteen Owners (Vendors)**
* Accept, reject, and manage incoming student orders in real-time.
* Update menu item availability and prices.
* Monitor individual student debt limits and send manual payment reminders.
* Open or close the canteen (instantly syncing to student dashboards).

### 🛠️ Setup Instructions

**1. Clone the repository**
```bash
git clone [https://github.com/your-org/credit_snap.git](https://github.com/your-org/credit_snap.git)
cd credit_snap
```
**2. Backend Setup**
```bash
cd Backend

```
