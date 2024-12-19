const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Poll = require('../models/Poll');
const { JWT_SECRET } = require('../config/config');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Kullanıcı yetkilendirme işlemleri
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'Token gerekli.' });
    }
  
    // Bearer'den sonra gelen token'ı ayır
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token formatı hatalı.' });
    }
  
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Doğrulanan kullanıcıyı req.user'a ekle
      next();
    } catch (err) {
      console.error('Token doğrulama hatası:', err);
      res.status(401).json({ message: 'Geçersiz token.' });
    }
  };

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Kullanıcı kaydı
 *     tags: [Auth]
 *     description: Yeni bir kullanıcı oluşturur.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, user]
 *                 default: user
 *     responses:
 *       201:
 *         description: Kullanıcı başarıyla kaydedildi.
 *       400:
 *         description: Bu email zaten kullanılıyor.
 */
router.post('/register', async (req, res) => {
    const { username, email, password, role } = req.body;
  
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Bu email zaten kullanılıyor.' });
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    // Geçerli roller: admin, moderator, user
    const validRoles = ['admin', 'moderator', 'user'];
    const userRole = validRoles.includes(role) ? role : 'user';
  
    const newUser = new User({ username, email, password: hashedPassword, role: userRole });
    await newUser.save();
  
    res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi!', user: { username, role: userRole } });
  });

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Kullanıcı girişi
 *     tags: [Auth]
 *     description: Kullanıcı giriş yapar ve JWT token alır.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Başarılı giriş ve JWT token döner.
 *       404:
 *         description: Kullanıcı bulunamadı.
 *       400:
 *         description: Geçersiz şifre.
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Geçersiz şifre.' });

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Kullanıcı profilini getir
 *     tags: [Auth]
 *     description: JWT token ile giriş yapan kullanıcının profil bilgilerini döner.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı profil bilgisi döndü.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Yetkisiz erişim.
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Şifreyi döndürme
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    res.json({
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Kullanıcı profilini güncelle
 *     tags: [Auth]
 *     description: JWT token ile giriş yapan kullanıcı profilini günceller.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Kullanıcı profili başarıyla güncellendi.
 *       400:
 *         description: Geçersiz istek.
 *       401:
 *         description: Yetkisiz erişim.
 */
router.put('/profile', authenticate, async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    // Alanları güncelle
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);

    await user.save();

    res.json({ message: 'Profil başarıyla güncellendi!' });
  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
});

/**
 * @swagger
 * /api/auth/vote-history:
 *   get:
 *     summary: Kullanıcının oy geçmişini getir
 *     tags: [Auth]
 *     description: JWT token ile giriş yapan kullanıcının oy verdiği anketlerin geçmişini döner.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Oy geçmişi başarıyla getirildi.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   pollId:
 *                     type: string
 *                   question:
 *                     type: string
 *                   selectedOption:
 *                     type: string
 *       401:
 *         description: Yetkisiz erişim.
 */
router.get('/vote-history', authenticate, async (req, res) => {
    try {
      // Kullanıcının ID'sine göre oy geçmişini kontrol et
      const polls = await Poll.find({ 'voters.userId': req.user.id });
  
      // Kullanıcının oy verdiği seçenekleri bul
      const voteHistory = polls.map((poll) => {
        const userVote = poll.voters.find((voter) => voter.userId.toString() === req.user.id);
        const selectedOption = userVote ? poll.options[userVote.optionIndex].name : null;
  
        return {
          pollId: poll._id,
          question: poll.question,
          selectedOption,
        };
      });
  
      res.json(voteHistory);
    } catch (error) {
      console.error('Hata:', error);
      res.status(500).json({ message: 'Sunucu hatası.' });
    }
  });

module.exports = router;