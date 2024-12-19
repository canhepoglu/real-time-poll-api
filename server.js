const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { MONGO_URI, PORT } = require('./config/config');
const authRoutes = require('./routes/auth');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Uygulama ve sunucu oluştur
const app = express();
const server = http.createServer(app);

// WebSocket için io nesnesini oluştur
const io = new Server(server, { cors: { origin: '*' } }); // io, burada tanımlandıktan sonra aktarılabilir

// Middleware'ler
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB bağlantısı
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB bağlantısı başarılı'))
  .catch((err) => console.error('MongoDB bağlantı hatası:', err));

// Temel rota (Test için)
app.get('/', (req, res) => {
  res.send('Gerçek Zamanlı Anket API çalışıyor!');
});

// Rotaları dahil et
const pollRoutes = require('./routes/poll')(io); // io'yu rotaya burada aktarabiliriz
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);

const swaggerOptions = {
    swaggerDefinition: {
      openapi: '3.0.0',
      info: {
        title: 'Gerçek Zamanlı Anket API',
        version: '1.0.0',
        description: 'Anket Sistemi API Dokümantasyonu',
      },
      servers: [
        { url: 'http://localhost:4000', description: 'Yerel Sunucu' },
      ],
    },
    apis: ['./routes/*.js'], // Route dosyalarının yolu
  };
  
  const swaggerDocs = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// WebSocket bağlantısı
io.on('connection', (socket) => {
  console.log('Bir kullanıcı bağlandı');

  socket.on('disconnect', () => {
    console.log('Bir kullanıcı ayrıldı');
  });
});

// Sunucuyu başlat
server.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} üzerinde çalışıyor`);
});