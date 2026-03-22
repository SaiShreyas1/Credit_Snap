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
    }).populate('student', 'name rollNo phone email'); 

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
    const emailMessage = `
      Hello ${debt.student.name},
      
      This is a friendly reminder from ${canteenName} regarding your Credit Snap account. 
      Your current pending total at our shop is ₹${debt.amountOwed}.
      
      Please clear this amount at your earliest convenience.
      
      Thanks,
      ${canteenName} & The Credit Snap Team
    `;

    // 6. Send the email
    await sendEmail({
      email: debt.student.email,
      subject: `Credit Snap: Pending Debt Reminder from ${canteenName}`, 
      message: emailMessage
    });

    res.status(200).json({
      status: 'success',
      message: `Notification sent to ${debt.student.name} from ${canteenName}`
    });

  } catch (err) {
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