const Debt = require('../models/debtModel');
const sendEmail = require('../utils/sendEmail'); // This is Tejas's Nodemailer tool!

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
exports.payOffline = async (req, res) => {
  try {
    // 1. Find the specific Debt record using the ID sent by React
    const debt = await Debt.findById(req.params.id);
    
    if (!debt) {
      throw new Error('Debt record not found!');
    }

    // 2. Subtract the amount paid from the 'amountOwed' field
    debt.amountOwed = debt.amountOwed - req.body.amountPaid;

    // Make sure debt doesn't go below 0!
    if (debt.amountOwed < 0) {
      debt.amountOwed = 0;
    }

    // 3. Save the updated amount to the database
    await debt.save();

    res.status(200).json({
      status: 'success',
      message: `Successfully deducted ₹${req.body.amountPaid}`,
      data: { updatedDebt: debt.amountOwed }
    });

  } catch (err) {
    res.status(400).json({ status: 'fail', message: err.message });
  }
};


// 🔔 NOTIFY STUDENT LOGIC (Using Nodemailer)
exports.notifyStudent = async (req, res) => {
  try {
    // 1. Find the debt record. 
    // .populate('student') is Mongoose magic! It takes the student's ID and 
    // replaces it with their full profile (name, email) so we can use it!
    const debt = await Debt.findById(req.params.id).populate('student');

    if (!debt || !debt.student) {
      throw new Error('Debt or Student not found!');
    }

    // 2. We now have the exact student's email!
    const studentEmail = debt.student.email;

    // 3. Write the email
    const emailMessage = `
      Hello ${debt.student.name},
      
      This is a reminder from your Canteen Owner. 
      Your current pending total on Credit Snap is ₹${debt.amountOwed}.
      
      Please clear this amount at your earliest convenience.
      
      Thanks,
      Credit Snap Team
    `;

    // 4. Give the email to Tejas's Nodemailer tool to send it off!
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