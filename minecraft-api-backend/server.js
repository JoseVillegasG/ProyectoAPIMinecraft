const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  minecraftUsername: {
    type: String,
    default: null,
  },
  favoriteSkinsHistory: [{
    username: String,
    skinUrl: String,
    searchedAt: Date,
  }],
});

const User = mongoose.model('User', userSchema);

// Routes

// Create or update user
app.post('/api/users', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and email are required' });
    }

    // Check if user exists
    let user = await User.findOne({ uid });

    if (user) {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      return res.json({ message: 'User login updated', user });
    }

    // Create new user
    user = new User({ uid, email });
    await user.save();
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user by UID
app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user's Minecraft username
app.patch('/api/users/:uid/minecraft', async (req, res) => {
  try {
    const { minecraftUsername } = req.body;
    
    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { minecraftUsername },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Minecraft username updated', user });
  } catch (error) {
    console.error('Error updating minecraft username:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add skin to user's history
app.post('/api/users/:uid/skins', async (req, res) => {
  try {
    const { username, skinUrl } = req.body;
    
    const user = await User.findOne({ uid: req.params.uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.favoriteSkinsHistory.push({
      username,
      skinUrl,
      searchedAt: new Date(),
    });

    // Keep only last 10 searches
    if (user.favoriteSkinsHistory.length > 10) {
      user.favoriteSkinsHistory = user.favoriteSkinsHistory.slice(-10);
    }

    await user.save();
    res.json({ message: 'Skin added to history', user });
  } catch (error) {
    console.error('Error adding skin to history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});