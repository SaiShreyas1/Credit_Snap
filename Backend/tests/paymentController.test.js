const crypto = require('crypto');

function withPopulate(record) {
  return Object.assign(record, {
    populate: jest.fn(function populate() {
      return this;
    })
  });
}

function withSelect(record) {
  return Object.assign(record, {
    select: jest.fn(function select() {
      return this;
    })
  });
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

function createIoRecorder() {
  const events = [];

  return {
    events,
    io: {
      to(room) {
        return {
          emit(event, payload) {
            events.push({ room, event, payload });
          }
        };
      }
    }
  };
}

function loadPaymentController({
  Canteen = {},
  Debt = {},
  Order = {},
  Payment = {},
  settleDebtPayment = jest.fn(),
  Razorpay = class {}
} = {}) {
  jest.resetModules();

  jest.doMock('../models/canteenModel', () => Canteen);
  jest.doMock('../models/debtModel', () => Debt);
  jest.doMock('../models/ordersModel', () => Order);
  jest.doMock('../models/paymentModel', () => Payment);
  jest.doMock('../utils/debtPayments', () => ({ settleDebtPayment }));
  jest.doMock('razorpay', () => Razorpay);

  let controller;
  jest.isolateModules(() => {
    controller = require('../controllers/paymentController');
  });

  return { controller, settleDebtPayment };
}

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.resetModules();
});

describe('paymentController.createDebtOrder', () => {
  test('creates a Razorpay order and local payment record', async () => {
    const paymentCreate = jest.fn().mockResolvedValue({ _id: 'payment_local_1' });
    const debtRecord = withPopulate({
      _id: 'debt_12345678',
      amountOwed: 250.75,
      student: { _id: 'student_1' },
      canteen: {
        _id: 'canteen_1',
        name: 'Campus Cafe',
        razorpayMerchantKeyId: 'rzp_test_merchant123',
        getRazorpayMerchantKeySecret: () => 'merchant-secret'
      }
    });

    let razorpayOptions;
    let orderPayload;

    const { controller } = loadPaymentController({
      Debt: {
        findById: jest.fn().mockImplementation((id) => {
          expect(id).toBe('debt_12345678');
          return debtRecord;
        })
      },
      Payment: {
        create: paymentCreate
      },
      Razorpay: class FakeRazorpay {
        constructor(options) {
          razorpayOptions = options;
          this.orders = {
            create: jest.fn().mockImplementation(async (payload) => {
              orderPayload = payload;
              return { id: 'order_rzp_1', amount: payload.amount, currency: payload.currency };
            })
          };
        }
      }
    });

    const req = {
      params: { debtId: 'debt_12345678' },
      body: { amount: 125.5 },
      user: {
        role: 'student',
        _id: 'student_1',
        name: 'Ada',
        email: 'ada@example.com',
        phoneNo: '9999999999'
      }
    };
    const res = createResponse();

    await controller.createDebtOrder(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(razorpayOptions).toEqual({
      key_id: 'rzp_test_merchant123',
      key_secret: 'merchant-secret'
    });
    expect(orderPayload).toMatchObject({
      amount: 12550,
      currency: 'INR',
      notes: {
        debtId: 'debt_12345678',
        studentId: 'student_1',
        canteenId: 'canteen_1',
        purpose: 'debt_payment'
      }
    });
    expect(paymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'debt',
        student: 'student_1',
        canteen: 'canteen_1',
        debt: 'debt_12345678',
        amount: 125.5,
        currency: 'INR',
        providerOrderId: 'order_rzp_1',
        providerKeyId: 'rzp_test_merchant123'
      })
    );
    expect(paymentCreate.mock.calls[0][0].receipt).toBe(orderPayload.receipt);
    expect(paymentCreate.mock.calls[0][0].receipt).toMatch(/^debt_\d+_12345678$/);
    expect(res.body.data).toEqual({
      paymentRecordId: 'payment_local_1',
      keyId: 'rzp_test_merchant123',
      orderId: 'order_rzp_1',
      amount: 12550,
      currency: 'INR',
      merchantName: 'Campus Cafe',
      description: 'Debt payment for Campus Cafe',
      prefill: {
        name: 'Ada',
        email: 'ada@example.com',
        contact: '9999999999'
      }
    });
  });

  test('rejects amounts larger than the current debt', async () => {
    const paymentCreate = jest.fn();
    const debtRecord = withPopulate({
      _id: 'debt_12345678',
      amountOwed: 120,
      student: { _id: 'student_1' },
      canteen: {
        _id: 'canteen_1',
        name: 'Campus Cafe',
        razorpayMerchantKeyId: 'rzp_test_merchant123',
        getRazorpayMerchantKeySecret: () => 'merchant-secret'
      }
    });

    let razorpayConstructed = false;

    const { controller } = loadPaymentController({
      Debt: {
        findById: jest.fn().mockReturnValue(debtRecord)
      },
      Payment: {
        create: paymentCreate
      },
      Razorpay: class FakeRazorpay {
        constructor() {
          razorpayConstructed = true;
        }
      }
    });

    const req = {
      params: { debtId: 'debt_12345678' },
      body: { amount: 150 },
      user: { role: 'student', _id: 'student_1' }
    };
    const res = createResponse();

    await controller.createDebtOrder(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Amount exceeds current debt! The maximum payment is ₹120.'
    });
    expect(paymentCreate).not.toHaveBeenCalled();
    expect(razorpayConstructed).toBe(false);
  });
});

describe('paymentController.verifyDebtPayment', () => {
  test('rejects invalid Razorpay signatures and marks the payment as failed', async () => {
    const claimedPayment = {
      _id: 'payment_1',
      canteen: 'canteen_1',
      debt: 'debt_1',
      amount: 150,
      status: 'processing',
      failureReason: '',
      save: jest.fn().mockResolvedValue(undefined)
    };

    let razorpayConstructed = false;

    const { controller } = loadPaymentController({
      Payment: {
        findById: jest.fn().mockResolvedValue({
          _id: 'payment_1',
          student: 'student_1',
          status: 'created',
          providerOrderId: 'order_1'
        }),
        findOneAndUpdate: jest.fn().mockResolvedValue(claimedPayment)
      },
      Canteen: {
        findById: jest.fn().mockImplementation((id) => {
          expect(id).toBe('canteen_1');
          return withSelect({
            _id: 'canteen_1',
            name: 'Campus Cafe',
            razorpayMerchantKeyId: 'rzp_test_merchant123',
            getRazorpayMerchantKeySecret: () => 'merchant-secret'
          });
        })
      },
      Razorpay: class FakeRazorpay {
        constructor() {
          razorpayConstructed = true;
        }
      }
    });

    const req = {
      body: {
        paymentRecordId: 'payment_1',
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'bad-signature'
      },
      user: { role: 'student', _id: 'student_1' }
    };
    const res = createResponse();

    await controller.verifyDebtPayment(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      status: 'fail',
      message: 'Invalid Razorpay signature.'
    });
    expect(claimedPayment.status).toBe('failed');
    expect(claimedPayment.failureReason).toBe('Invalid Razorpay signature.');
    expect(claimedPayment.save).toHaveBeenCalledTimes(1);
    expect(razorpayConstructed).toBe(false);
  });

  test('captures authorized payments, settles debt, and emits live updates', async () => {
    const claimedPayment = {
      _id: 'payment_1',
      canteen: 'canteen_1',
      debt: 'debt_1',
      amount: 230,
      status: 'processing',
      failureReason: 'stale-error',
      save: jest.fn().mockResolvedValue(undefined)
    };
    const debtRecord = withPopulate({
      _id: 'debt_1',
      canteen: 'canteen_1',
      student: {
        _id: 'student_1',
        name: 'Ada'
      }
    });
    const settlement = {
      canteenDebt: 70,
      studentTotalDebt: 70
    };
    const signature = crypto
      .createHmac('sha256', 'merchant-secret')
      .update('order_1|pay_1')
      .digest('hex');
    const { io, events } = createIoRecorder();

    const fetchPayment = jest.fn().mockResolvedValue({
      status: 'authorized',
      amount: 23000,
      currency: 'INR'
    });
    const capturePayment = jest.fn().mockResolvedValue({
      status: 'captured',
      amount: 23000,
      currency: 'INR'
    });

    const { controller, settleDebtPayment } = loadPaymentController({
      Payment: {
        findById: jest.fn().mockResolvedValue({
          _id: 'payment_1',
          student: 'student_1',
          status: 'created',
          providerOrderId: 'order_1'
        }),
        findOneAndUpdate: jest.fn().mockResolvedValue(claimedPayment)
      },
      Canteen: {
        findById: jest.fn().mockReturnValue(withSelect({
          _id: 'canteen_1',
          name: 'Campus Cafe',
          razorpayMerchantKeyId: 'rzp_test_merchant123',
          getRazorpayMerchantKeySecret: () => 'merchant-secret'
        }))
      },
      Debt: {
        findById: jest.fn().mockImplementation((id) => {
          expect(id).toBe('debt_1');
          return debtRecord;
        })
      },
      settleDebtPayment: jest.fn().mockResolvedValue(settlement),
      Razorpay: class FakeRazorpay {
        constructor(options) {
          expect(options).toEqual({
            key_id: 'rzp_test_merchant123',
            key_secret: 'merchant-secret'
          });
          this.payments = {
            fetch: fetchPayment,
            capture: capturePayment
          };
        }
      }
    });

    const req = {
      body: {
        paymentRecordId: 'payment_1',
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: signature
      },
      user: { role: 'student', _id: 'student_1' },
      app: {
        get(key) {
          return key === 'io' ? io : undefined;
        }
      }
    };
    const res = createResponse();

    await controller.verifyDebtPayment(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Successfully paid ₹230.',
      data: settlement
    });
    expect(fetchPayment).toHaveBeenCalledWith('pay_1');
    expect(capturePayment).toHaveBeenCalledWith('pay_1', 23000, 'INR');
    expect(settleDebtPayment).toHaveBeenCalledWith({
      debt: debtRecord,
      amountPaid: 230,
      receiptLabel: 'Online Debt Payment',
      transactionId: 'pay_1'
    });
    expect(claimedPayment.status).toBe('paid');
    expect(claimedPayment.failureReason).toBe('');
    expect(claimedPayment.settledAt).toBeInstanceOf(Date);
    expect(claimedPayment.save).toHaveBeenCalledTimes(1);
    expect(events.map(({ room, event }) => ({ room, event }))).toEqual([
      { room: 'student:student_1', event: 'debt-updated' },
      { room: 'student:student_1', event: 'payment-successful' },
      { room: 'canteen:canteen_1', event: 'debt-updated' },
      { room: 'canteen:canteen_1', event: 'payment-received' }
    ]);
    expect(events[1].payload).toEqual({
      amount: 230,
      canteenName: 'Campus Cafe'
    });
    expect(events[3].payload).toEqual({
      studentName: 'Ada',
      amount: 230,
      canteenName: 'Campus Cafe'
    });
  });
});

describe('paymentController.recordPaymentFailure', () => {
  test('records failed online payments such as invalid UPI attempts', async () => {
    const paymentRecord = {
      _id: 'payment_1',
      student: 'student_1',
      canteen: 'canteen_1',
      amount: 300,
      providerOrderId: 'order_1',
      failureReason: 'Payment failed due to invalid UPI ID.'
    };
    const paymentUpdate = jest.fn().mockResolvedValue(paymentRecord);
    const findOrder = jest.fn().mockResolvedValue(null);
    const createOrder = jest.fn().mockResolvedValue({ _id: 'history_order_1' });
    const { io, events } = createIoRecorder();

    const { controller } = loadPaymentController({
      Payment: {
        findOneAndUpdate: paymentUpdate
      },
      Order: {
        findOne: findOrder,
        create: createOrder
      }
    });

    const req = {
      body: {
        paymentRecordId: 'payment_1',
        error_description: 'Payment failed due to invalid UPI ID.'
      },
      app: {
        get(key) {
          return key === 'io' ? io : undefined;
        }
      }
    };
    const res = createResponse();

    await controller.recordPaymentFailure(req, res);

    expect(paymentUpdate).toHaveBeenCalledWith(
      { _id: 'payment_1', status: { $ne: 'paid' } },
      {
        $set: {
          status: 'failed',
          failureReason: 'Payment failed due to invalid UPI ID.'
        }
      },
      { new: true }
    );
    expect(findOrder).toHaveBeenCalledWith({ transactionId: 'order_1' });
    expect(createOrder).toHaveBeenCalledWith({
      student: 'student_1',
      canteen: 'canteen_1',
      items: [{ name: 'Online Debt Payment', quantity: 1, price: 300 }],
      totalAmount: 300,
      status: 'rejected',
      failureReason: 'Payment failed due to invalid UPI ID.',
      transactionId: 'order_1'
    });
    expect(events.map(({ room, event }) => ({ room, event }))).toEqual([
      { room: 'student:student_1', event: 'orderStatusUpdated' },
      { room: 'canteen:canteen_1', event: 'orderStatusUpdated' }
    ]);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: 'success',
      message: 'Failure recorded successfully.'
    });
  });
});
