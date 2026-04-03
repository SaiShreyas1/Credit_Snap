const Debt = require('../models/debtModel');
const Canteen = require('../models/canteenModel');
const sendEmail = require('../utils/sendEmail');
const { settleDebtPayment } = require('../utils/debtPayments');

// ==========================================
// OWNER DEBT MANAGEMENT
// ==========================================

/**
 * Retrieves all active debts for the logged-in owner's canteen.
 * Includes a fallback to check for legacy owner IDs.
 * @route GET /api/debts/active
 */
exports.getActiveDebts = async (req, res) => {
  try {
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });

    // Support both new Canteen ID references and legacy Owner ID references
    const activeDebts = await Debt.find({
      $or: [
        { canteen: req.user.id },
        { canteen: myCanteen ? myCanteen._id : null }
      ],
      amountOwed: { $gt: 0 }
    }).populate('student', 'name rollNo phoneNo email limit');

    const sanitizedDebts = activeDebts.map(d => {
      const dict = d.toObject();
      dict.amountOwed = Math.round(dict.amountOwed * 100) / 100;
      return dict;
    });

    res.status(200).json({ status: 'success', data: sanitizedDebts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Processes an offline payment, reduces the debt, and generates a history receipt.
 * @route POST /api/debts/:id/pay
 */
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

    // Process the payment using the utility function (updates User and creates Order receipt)
    const settlement = await settleDebtPayment({
      debt,
      amountPaid,
      receiptLabel: 'Offline Debt Payment'
    });

    const student = debt.student;

    // Broadcast the update so connected dashboards refresh instantly
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
      data: settlement
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Sends an email reminder and a real-time notification to a student with pending debt.
 * @route POST /api/debts/:id/notify
 */
exports.notifyStudent = async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id)
      .populate('student', 'name email')
      .populate('canteen', 'name');

    if (!debt || !debt.student) {
      return res.status(404).json({ status: 'fail', message: 'Debt or Student record not found in the database!' });
    }

    if (debt.amountOwed === 0) {
      return res.status(400).json({ status: 'fail', message: `${debt.student.name} has no pending debt.` });
    }

    const canteenName = debt.canteen && debt.canteen.name ? debt.canteen.name : "our canteen";

    const emailMessage = `Hello ${debt.student.name},

This is a friendly reminder from ${canteenName} regarding your Credit Snap account.
Your current pending total at our shop is ₹${debt.amountOwed}.

Please clear this amount at your earliest convenience.

Thanks,
${canteenName} & The Credit Snap Team`;

    try {
      await sendEmail({
        email: debt.student.email,
        subject: `Credit Snap: Pending Debt Reminder from ${canteenName}`,
        message: emailMessage
      });

      // Emit real-time bell notification to the student's browser
      const io = req.app.get('io');
      if (io && debt.student._id) {
        io.to(`student:${debt.student._id}`).emit('notify-student', {
          canteenName,
          amountOwed: debt.amountOwed
        });
      }

      res.status(200).json({
        status: 'success',
        message: `Notification sent to ${debt.student.name} from ${canteenName}`
      });
    } catch (emailErr) {
      console.error("[Debt Manager] ❌ Failed to send email:", emailErr);
      return res.status(500).json({
        status: 'error',
        message: `Failed to dispatch email. Cause: ${emailErr.message}`
      });
    }
  } catch (err) {
    console.error("[Debt Manager] ❌ Unexpected error in notifyStudent:", err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

/**
 * Updates the custom credit limit for a specific student's debt record.
 * Includes authorization to ensure owners only edit their own customers.
 * @route PATCH /api/debts/:id/limit
 */
exports.updateDebtLimit = async (req, res) => {
  try {
    const newLimit = Number(req.body.limit);

    if (isNaN(newLimit) || newLimit < 0) {
      return res.status(400).json({ status: 'fail', message: 'Please provide a valid numeric limit (e.g., 3000).' });
    }

    const debt = await Debt.findById(req.params.id);

    if (!debt) {
      return res.status(404).json({ status: 'fail', message: 'Debt record not found!' });
    }

    // Security Check: Ensure the owner requesting this actually runs the canteen this debt belongs to
    const myCanteen = await Canteen.findOne({ ownerId: req.user.id });
    const debtCanteenStr = debt.canteen.toString();
    const ownerMatches = debtCanteenStr === req.user.id || (myCanteen && debtCanteenStr === myCanteen._id.toString());

    if (!ownerMatches) {
      return res.status(403).json({ status: 'fail', message: 'You can only change debt limits for students at your own canteen.' });
    }

    // Validation Check: Prevent lowering limit below current debt
    if (newLimit < debt.amountOwed) {
      return res.status(400).json({ status: 'fail', message: `Cannot set limit to ₹${newLimit} because this student currently owes ₹${debt.amountOwed}.` });
    }

    debt.limit = newLimit;
    await debt.save();

    // Broadcast update
    const io = req.app.get('io');
    if (io) {
      io.to(`student:${debt.student}`).emit('debt-updated');
      io.to(`canteen:${debt.canteen}`).emit('debt-updated');
    }

    res.status(200).json({
      status: 'success',
      message: `Custom debt limit successfully updated to ₹${newLimit}`,
      data: debt
    });
  } catch (err) {
    console.error(`[Debt Manager] ❌ Error updating debt limit:`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// ==========================================
// STUDENT DEBT MANAGEMENT
// ==========================================

/**
 * Retrieves all outstanding debts for the currently logged-in student.
 * @route GET /api/debts/my-debts
 */
exports.getMyDebts = async (req, res) => {
  try {
    const debts = await Debt.find({
      student: req.user.id,
      amountOwed: { $gt: 0 }
    }).populate('canteen', 'name');

    const sanitizedDebts = debts.map(d => {
      const dict = d.toObject();
      dict.amountOwed = Math.round(dict.amountOwed * 100) / 100;
      return dict;
    });

    res.status(200).json({ status: 'success', data: sanitizedDebts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};