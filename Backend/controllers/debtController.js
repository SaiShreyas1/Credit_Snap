const Debt = require('../models/debtModel');
const sendEmail = require('../utils/sendEmail'); 

<<<<<<< HEAD
// 💰 DEDUCT DEBT LOGIC (Paid Offline) - WITH EDGE CASES
=======
// 📡 FETCH ACTIVE DEBTS (The missing integration piece!)
exports.getActiveDebts = async (req, res) => {
  try {
    // 1. Search the database for debts belonging to this specific canteen
    // 2. Only grab debts that are greater than 0
    const debts = await Debt.find({
      canteen: req.user.managedCanteen,
      amountOwed: { $gt: 0 }
    }).populate('student', 'name email rollNo limit'); // Grab the student's details too!

    // 3. Send the data back to the React fetch() call
    res.status(200).json({ status: 'success', data: debts });
  } catch (error) {
    res.status(400).json({ status: 'fail', message: error.message });
  }
};

// 💰 DEDUCT DEBT LOGIC (Paid Offline)
>>>>>>> c4fc257393ed5c652513a2818cf7a41f8d6d950c
exports.payOffline = async (req, res) => {
  try {
    const { amountPaid } = req.body;

    // EDGE CASE 1: Prevent negative numbers or zero
    if (!amountPaid || amountPaid <= 0) {
      throw new Error('Please enter a valid positive amount.');
    }

    // Find the specific Debt record
    const debt = await Debt.findById(req.params.id);
    
    if (!debt) {
      throw new Error('Debt record not found!');
    }

    // EDGE CASE 2: Prevent paying more than what is owed
    if (amountPaid > debt.amountOwed) {
      throw new Error(`Amount exceeds current debt! The maximum you can deduct is ₹${debt.amountOwed}.`);
    }

    // Do the math
    debt.amountOwed = debt.amountOwed - amountPaid;

    // Save the updated amount to the database
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

// 🔔 NOTIFY STUDENT LOGIC (Using Nodemailer)
exports.notifyStudent = async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id).populate('student');

    if (!debt || !debt.student) {
      throw new Error('Debt or Student not found!');
    }

    const studentEmail = debt.student.email;

    const emailMessage = `
      Hello ${debt.student.name},
      
      This is a reminder from your Canteen Owner. 
      Your current pending total on Credit Snap is ₹${debt.amountOwed}.
      
      Please clear this amount at your earliest convenience.
      
      Thanks,
      Credit Snap Team
    `;

    await sendEmail({
      email: studentEmail,
      subject: 'Credit Snap: Pending Debt Reminder',
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