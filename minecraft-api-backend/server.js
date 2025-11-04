const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
// Inicia express y lo guarda en la variable app
const app = express();
// Llama la funcion cors para que todo funcione
app.use(cors());
// Sube el limite del json para las imag64
app.use(express.json({ limit: '10mb' })); 

//Conecta al mongo
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado'))
.catch((err) => console.error('Error:', err));

// Formato de skin favorita
const favoriteSkinSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  skinImage: {
    type: String, // imag64
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});
// Formato de usuario
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
  //llama el esquema de skins favoritas y lo guarda aqui. Lista dentro de una lista
  favoriteSkins: [favoriteSkinSchema],
});
// Guarda el modelo del esquema en la constante user
const User = mongoose.model('User', userSchema);

// Rutas de API

// Crear o actualizar usuario
app.post('/api/users', async (req, res) => {
  try {
    const { uid, email } = req.body;
    // Si falta uid o correo
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID y Correo necesarios' });
    }

    let user = await User.findOne({ uid });
    // Confirma que haya usuario, actualiza el login
    if (user) {
      user.lastLogin = new Date();
      await user.save();
      return res.json({ message: 'Actualizado', user });
    }
    // Si no hay usuario, entonces lo creaa con el esquema de arriba y lo guarda en la variable
    user = new User({ uid, email });
    await user.save();
    // Guarda el usuario
    res.status(201).json({ message: 'Creado', user });
  } catch (error) {
    console.error('Error usuario:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Buscar user por UID
app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    // Si no hay usuario
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    // Si hay respuesta, lo guarda en json
    res.json(user);
  } catch (error) {
    console.error('Error buscando:', error);
    res.status(500).json({ error: 'Error de Server' });
  }
});

// Agrega skin favorita
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

    // Checa si la skin ya esta en favoritos (doble refuerzo)
    const existingFavorite = user.favoriteSkins.find(
      fav => fav.username.toLowerCase() === username.toLowerCase()
    );

    if (existingFavorite) {
      return res.status(400).json({ error: 'Skin ya está en favoritos' });
    }

    // Agrega el favorito
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

// Remover skin favorita
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

// Buscar las skins favoritas del usuario
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

// Chequeo constante
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Inicio de server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server en ${PORT}`);
});