const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado'))
.catch((err) => console.error('Error:', err));

// Skin Favorita
const favoriteSkinSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  skinImage: {
    type: String, // Base64 encoded image
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

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
  favoriteSkins: [favoriteSkinSchema],
});

const User = mongoose.model('User', userSchema);

// Routes

// Create or update user
app.post('/api/users', async (req, res) => {
  try {
    const { uid, email } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'UID y Correo necesarios' });
    }

    let user = await User.findOne({ uid });

    if (user) {
      user.lastLogin = new Date();
      await user.save();
      return res.json({ message: 'Actualizado', user });
    }

    user = new User({ uid, email });
    await user.save();
    res.status(201).json({ message: 'Creado', user });
  } catch (error) {
    console.error('Error usuario:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Get user by UID
app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error buscando:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Add favorite skin
app.post('/api/users/:uid/favorites', async (req, res) => {
  try {
    const { uid } = req.params;
    const { username, skinImage } = req.body;

    if (!username || !skinImage) {
      return res.status(400).json({ error: 'Username y skinImage requeridos' });
    }

    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Check if skin already favorited
    const existingFavorite = user.favoriteSkins.find(
      fav => fav.username.toLowerCase() === username.toLowerCase()
    );

    if (existingFavorite) {
      return res.status(400).json({ error: 'Skin ya está en favoritos' });
    }

    // Add new favorite
    user.favoriteSkins.push({
      username,
      skinImage,
    });

    await user.save();
    res.json({ message: 'Agregado a favoritos', user });
  } catch (error) {
    console.error('Error agregando favorito:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Remove favorite skin
app.delete('/api/users/:uid/favorites/:username', async (req, res) => {
  try {
    const { uid, username } = req.params;

    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.favoriteSkins = user.favoriteSkins.filter(
      fav => fav.username.toLowerCase() !== username.toLowerCase()
    );

    await user.save();
    res.json({ message: 'Eliminado de favoritos', user });
  } catch (error) {
    console.error('Error eliminando favorito:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Get user's favorite skins
app.get('/api/users/:uid/favorites', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ favoriteSkins: user.favoriteSkins });
  } catch (error) {
    console.error('Error obteniendo favoritos:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server en ${PORT}`);
});