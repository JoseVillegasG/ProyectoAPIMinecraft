const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Conectado'))
.catch((err) => console.error('Error:', err));

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
});

const User = mongoose.model('User', userSchema);

//Rutas

//Crear o actualizar usuario
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

//Buscar UID
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

//Chequeo
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

//Inicio
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server en ${PORT}`);
});