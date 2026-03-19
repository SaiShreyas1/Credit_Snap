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

// 💰 2. DEDUCT DEBT LOGIC (Updates BOTH Debt ticket and User profile)
exports.payOffline = async (req, res) => {
  try {
    const amountPaid = Number(req.body.amountPaid);

    if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0) {
      throw new Error('Please enter a valid numeric amount greater than zero.');
    }

    // ⭐ Notice we added .populate('student') here so we can edit the User too!
    const debt = await Debt.findById(req.params.id).populate('student');
    
    if (!debt) {
      throw new Error('Debt record not found!');
    }

    if (amountPaid > debt.amountOwed) {
      throw new Error(`Amount exceeds current debt! The maximum deduction is ₹${debt.amountOwed}.`);
    }

    // 1️⃣ Update the specific Canteen Debt Ticket
    debt.amountOwed = debt.amountOwed - amountPaid;
    await debt.save();

    // 2️⃣ Update the Student's overall totalDebt in the Users collection
    const student = debt.student; // We have the student data because of .populate()
    student.totalDebt = student.totalDebt - amountPaid;
    
    // Safety check so totalDebt never goes below 0
    if (student.totalDebt < 0) {
      student.totalDebt = 0; 
    }
    await student.save();

    res.status(200).json({
      status: 'success',
      message: `Successfully deducted ₹${amountPaid} from both Canteen and Student records.`,
      data: { 
        canteenDebt: debt.amountOwed,
        studentTotalDebt: student.totalDebt
      }
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