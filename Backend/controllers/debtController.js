const Debt = require('../models/debtModel');
const Order = require('../models/ordersModel'); // 👈 ADD THIS LINE
const sendEmail = require('../utils/sendEmail');

const Canteen = require('../models/canteenModel'); // 👈 Make sure Canteen is imported!

// Get all active debts for the logged-in owner's canteen
exports.getActiveDebts = async (req, res) => {
  try {
    // 1. Find the Canteen that belongs to the logged-in Owner
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });
    
    // 2. THE FIX: Search for debts using the Owner's ID (your friend's logic) 
    // OR the Canteen ID (your logic) so nothing gets missed!
    const activeDebts = await Debt.find({ 
      $or: [
        { canteen: req.user.id }, 
        { canteen: myCanteen ? myCanteen._id : null }
      ],
      amountOwed: { $gt: 0 } 
    }).populate('student', 'name rollNo phoneNo email limit'); 

    res.status(200).json({
      status: 'success',
      data: activeDebts
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 💰 2. DEDUCT DEBT LOGIC (Updates Debt, User, AND creates History Receipt)
exports.payOffline = async (req, res) => {
  try {
    const amountPaid = Number(req.body.amountPaid);

    if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ status: 'fail', message: 'Please enter a valid numeric amount greater than zero.' });
    }

    const debt = await Debt.findById(req.params.id).populate('student');
    
    if (!debt) {
      return res.status(404).json({ status: 'fail', message: 'Debt record not found!' });
    }

    if (amountPaid > debt.amountOwed) {
      return res.status(400).json({ status: 'fail', message: `Amount exceeds current debt! The maximum deduction is ₹${debt.amountOwed}.` });
    }

    // 1️⃣ Update the specific Canteen Debt Ticket
    debt.amountOwed = debt.amountOwed - amountPaid;
    await debt.save();

    // 2️⃣ Update the Student's overall totalDebt in the Users collection
    const student = debt.student; 
    student.totalDebt = student.totalDebt - amountPaid;
    if (student.totalDebt < 0) student.totalDebt = 0; 
    await student.save();

    // 3️⃣ NEW: Create a "Receipt" in the Orders collection for the History page!
    await Order.create({
      student: student._id,
      canteen: debt.canteen,
      items: [{
        name: 'Offline Debt Payment', // Identifies this as a payment, not food!
        quantity: 1,
        price: amountPaid
      }],
      totalAmount: amountPaid,
      status: 'accepted' // Automatically accepted so it gets the green tag in the UI
    });

    // 4️⃣ EMIT TO SOCKET.IO ROOMS SO IT UPDATES LIVE
    const io = req.app.get('io');
    if (io) {
      if (student && student._id) {
        io.to(`student:${student._id}`).emit('debt-updated');
      }
      if (debt.canteen) {
        io.to(`canteen:${debt.canteen}`).emit('debt-updated');
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Successfully deducted ₹${amountPaid} and recorded the transaction in History.`,
      data: { 
        canteenDebt: debt.amountOwed,
        studentTotalDebt: student.totalDebt
      }
    });

  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// 🔔 3. NOTIFY STUDENT LOGIC (Using Nodemailer)
exports.notifyStudent = async (req, res) => {
  try {
    // 1. Fetch debt and populate both student and canteen
    const debt = await Debt.findById(req.params.id)
      .populate('student', 'name email')
      .populate('canteen', 'name'); 

    // 2. Strict safety check for the core records
    if (!debt || !debt.student) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'Debt or Student record not found in the database!' 
      });
    }

    // 3. Prevent sending emails for cleared debts
    if (debt.amountOwed === 0) {
      return res.status(400).json({ 
        status: 'fail', 
        message: `${debt.student.name} has no pending debt.` 
      });
    }

    // 4. THE FAIL-SAFE: Safely grab the Canteen Name
    const canteenName = debt.canteen && debt.canteen.name 
      ? debt.canteen.name 
      : "our canteen";

    // 5. Draft the email
    // const emailMessage = `
    //   Hello ${debt.student.name},
      
    //   This is a friendly reminder from ${canteenName} regarding your Credit Snap account. 
    //   Your current pending total at our shop is ₹${debt.amountOwed}.
      
    //   Please clear this amount at your earliest convenience.
      
    //   Thanks,
    //   ${canteenName} & The Credit Snap Team
    // `;
    // 5. Draft the email
    const emailMessage = `Hello ${debt.student.name},

This is a friendly reminder from ${canteenName} regarding your Credit Snap account. 
Your current pending total at our shop is ₹${debt.amountOwed}.

Please clear this amount at your earliest convenience.

Thanks,
${canteenName} & The Credit Snap Team`;

    // 6. Send the email with graceful error handling
    try {
      await sendEmail({
        email: debt.student.email,
        subject: `Credit Snap: Pending Debt Reminder from ${canteenName}`, 
        message: emailMessage
      });
      res.status(200).json({
        status: 'success',
        message: `Notification sent to ${debt.student.name} from ${canteenName}`
      });
    } catch (emailErr) {
      console.error("❌ Failed to send email:", emailErr);
      return res.status(500).json({ 
        status: 'error', 
        message: `Failed to dispatch email. Cause: ${emailErr.message}` 
      });
    }

  } catch (err) {
    console.error("❌ Unexpected error in notifyStudent:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
// Get all debts for the logged-in STUDENT
exports.getMyDebts = async (req, res) => {
  try {
    // Find debts for this student where the amount is greater than 0
    const debts = await Debt.find({ 
      student: req.user.id,
      amountOwed: { $gt: 0 } 
    }).populate('canteen', 'name'); // Pulls the Canteen name

    res.status(200).json({
      status: 'success',
      data: debts
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// 🔧 4. UPDATE CUSTOM DEBT LIMIT LOGIC
exports.updateDebtLimit = async (req, res) => {
  console.log(`[ROUTE HIT] PATCH /api/debts/:id/limit called with ID: ${req.params.id}`);
  console.log(`[REQUEST BODY] limit: ${req.body.limit}`);
  try {
    const newLimit = Number(req.body.limit);

    if (isNaN(newLimit) || newLimit < 0) {
      console.log(`[REJECTED] Invalid limit: ${req.body.limit}`);
      return res.status(400).json({ status: 'fail', message: 'Please provide a valid numeric limit (e.g., 3000).' });
    }

    console.log(`[DB SEARCH] Searching for Debt ID: ${req.params.id}`);
    const debt = await Debt.findById(req.params.id);
    
    if (!debt) {
      console.log(`[404 ERROR] Debt not found for ID: ${req.params.id}`);
      return res.status(404).json({ status: 'fail', message: 'Debt record not found!' });
    }

    // Ensure the owner requesting this actually runs the canteen this debt belongs to
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });
    
    // Allow if debt.canteen matches the real canteen ID OR the owner's own user ID (legacy records)
    const debtCanteenStr = debt.canteen.toString();
    const ownerMatches = debtCanteenStr === req.user.id ||
      (myCanteen && debtCanteenStr === myCanteen._id.toString());

    if (!ownerMatches) {
       return res.status(403).json({ status: 'fail', message: 'You can only change debt limits for students at your own canteen.' });
    }

    if (newLimit < debt.amountOwed) {
       return res.status(400).json({ status: 'fail', message: `Cannot set limit to ₹${newLimit} because this student currently owes ₹${debt.amountOwed}.` });
    }

    debt.limit = newLimit;
    await debt.save();

    // 📡 Emit so dashboards live-refresh!
    const io = req.app.get('io');
    if (io) {
      io.to(`student:${debt.student}`).emit('debt-updated');
      io.to(`canteen:${debt.canteen}`).emit('debt-updated');
    }

    console.log(`[SUCCESS] Updated limit to ${newLimit} for Debt ID: ${req.params.id}`);
    res.status(200).json({
      status: 'success',
      message: `Custom debt limit successfully updated to ₹${newLimit}`,
      data: debt
    });
  } catch (err) {
    console.error(`[500 ERROR] Error updating debt limit:`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};