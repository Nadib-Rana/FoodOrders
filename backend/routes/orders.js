const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const authMiddleware = require('../middleware/authMiddleware');

// ✅ POST /api/orders/place - Place a new order
router.post('/place', authMiddleware, async (req, res) => {
  try {
    const { paymentMethod, name, location, transactionId } = req.body;

    if (!paymentMethod || !name || !location || !transactionId) {
      return res.status(400).json({ message: 'All payment details are required' });
    }

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.foodItem');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    // Calculate total
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + item.foodItem.price * item.quantity;
    }, 0);

    // Create new order
    const newOrder = new Order({
      user: req.user._id,
      name,
      location,
      paymentMethod,
      transactionId,
      totalAmount,
      items: cart.items.map(item => ({
        foodItem: item.foodItem._id,
        quantity: item.quantity,
      })),
    });

    await newOrder.save();

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({ message: 'Order placed successfully!' });
  } catch (err) {
    console.error('❌ Error placing order:', err);
    res.status(500).json({ message: 'Failed to place order' });
  }
});

// ✅ GET /api/orders/history - Fetch user's order history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.foodItem');

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      name: order.name,
      location: order.location,
      paymentMethod: order.paymentMethod,
      transactionId: order.transactionId || '',
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        foodItem: item.foodItem ? {
          name: item.foodItem.name,
          price: item.foodItem.price,
        } : null,
        quantity: item.quantity,
      })),
    }));

    res.json(formattedOrders);
  } catch (err) {
    console.error(' Error fetching order history:', err);
    res.status(500).json({ message: 'Server error while fetching order history.' });
  }
});

module.exports = router;
