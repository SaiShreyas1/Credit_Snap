const Debt = require('../models/debtModel');
const sendEmail = require('../utils/sendEmail'); 

// 📡 1. FETCH ACTIVE DEBTS (Loads the UI List)
exports.getActiveDebts = async (req, res) => {
  try {
    // Make sure the user requesting this is actually logged in and assigned to a canteen
    if (!req.user || !req.user.managedCanteen) {
      throw new Error('Not authorized to view this canteen\'s debts.');
    }

    const debts = await Debt.find({
      canteen: req.user.managedCanteen,
      amountOwed: { $gt: 0 } // Only fetch students who actually owe money
    }).populate('student', 'name email rollNo limit');

    res.status(200).json({ status: 'success', data: debts });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 💰 2. DEDUCT DEBT LOGIC (Paid Offline)
exports.payOffline = async (req, res) => {
  try {
    // Convert the input to a strict Number to prevent text inputs like "five"
    const amountPaid = Number(req.body.amountPaid);

    // EDGE CASE 1: Prevent empty, negative, or non-number inputs
    if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0) {
      throw new Error('Please enter a valid numeric amount greater than zero.');
    }

    const debt = await Debt.findById(req.params.id);
    
    if (!debt) {
      throw new Error('Debt record not found!');
    }

    // EDGE CASE 2: Prevent paying more than what is owed
    if (amountPaid > debt.amountOwed) {
      throw new Error(`Amount exceeds current debt! The maximum deduction is ₹${debt.amountOwed}.`);
    }

    // Do the math
    debt.amountOwed = debt.amountOwed - amountPaid;
    await debt.save();

    res.status(200).json({
      status: 'success',
      message: `Successfully deducted ₹${amountPaid}`,
      data: { updatedDebt: debt.amountOwed }
    });

  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};

// 🔔 3. NOTIFY STUDENT LOGIC (Using Nodemailer)
// 🔔 3. NOTIFY STUDENT LOGIC (Using Nodemailer)
exports.notifyStudent = async (req, res) => {
  try {
    // We now populate BOTH the student (for their email) AND the canteen (for its name)
    const debt = await Debt.findById(req.params.id)
      .populate('student')
      .populate('canteen'); 

    if (!debt || !debt.student || !debt.canteen) {
      throw new Error('Debt, Student, or Canteen record not found!');
    }

    // EDGE CASE 3: Don't spam students if their debt is already cleared
    if (debt.amountOwed === 0) {
      throw new Error(`${debt.student.name} has no pending debt. No email sent.`);
    }

    // The updated email message with the Canteen's actual name!
    const emailMessage = `
      Hello ${debt.student.name},
      
      This is a friendly reminder from ${debt.canteen.name} regarding your Credit Snap account. 
      Your current pending total at our shop is ₹${debt.amountOwed}.
      
      Please clear this amount at your earliest convenience.
      
      Thanks,
      ${debt.canteen.name} & The Credit Snap Team
    `;

    await sendEmail({
      email: debt.student.email,
      // We even put the canteen name in the subject line!
      subject: `Credit Snap: Pending Debt Reminder from ${debt.canteen.name}`, 
      message: emailMessage
    });

    res.status(200).json({
      status: 'success',
      message: `Notification sent to ${debt.student.name}`
    });

  } catch (err) {
    res.status(500).json({ status: 'fail', message: err.message });
  }
};