const express = require('express');
const Poll = require('../models/Poll');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const authorize = require('../middlewares/authorize'); 

module.exports = (io) => {
    const router = express.Router();

    const authenticate = (req, res, next) => {
        const token = req.headers['authorization'];
        if (!token) return res.status(401).json({ message: 'Yetkisiz erişim' });

        try {
        const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
        req.user = decoded;
        next();
        } catch (err) {
        res.status(401).json({ message: 'Geçersiz token' });
        }
    };

    /**
     * @swagger
     * /api/polls:
     *   post:
     *     summary: Yeni anket oluştur
     *     tags: [Polls]
     *     description: Admin kullanıcısı tarafından yeni bir anket oluşturulur.
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               question:
     *                 type: string
     *               options:
     *                 type: array
     *                 items:
     *                   type: string
     *               startAt:
     *                 type: string
     *                 format: date-time
     *                 example: 2024-12-20T12:00:00Z
     *               endAt:
     *                 type: string
     *                 format: date-time
     *                 example: 2024-12-21T12:00:00Z
     *     responses:
     *       201:
     *         description: Anket başarıyla oluşturuldu.
     *       400:
     *         description: Geçersiz giriş.
     */
    router.post('/', authenticate, authorize('admin'), async (req, res) => {
        const { question, options, startAt, endAt } = req.body;
      
        if (!question || !options || !Array.isArray(options)) {
          return res.status(400).json({ message: 'Soru ve seçenekler sağlanmalıdır.' });
        }
      
        if (!startAt || !endAt || new Date(startAt) >= new Date(endAt)) {
          return res.status(400).json({ message: 'Geçerli bir başlangıç ve bitiş zamanı belirtilmelidir.' });
        }
      
        try {
          const poll = new Poll({
            question,
            options: options.map((option) => ({ name: option })),
            createdBy: req.user.username,
            startAt,
            endAt,
          });
      
          await poll.save();
          res.status(201).json(poll);
        } catch (error) {
          console.error('Hata:', error);
          res.status(500).json({ message: 'Sunucu hatası.' });
        }
      });

    /**
     * @swagger
     * /api/polls:
     *   get:
     *     summary: Tüm anketleri listele
     *     tags: [Polls]
     *     responses:
     *       200:
     *         description: Anketler başarıyla listelendi.
     */
    router.get('/', async (req, res) => {
        const polls = await Poll.find().sort({ createdAt: -1 });
        res.json(polls);
    });

    /**
     * @swagger
     * /api/polls/vote/{id}:
     *   post:
     *     summary: Ankete oy ver
     *     tags: [Polls]
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Oy verilecek anketin ID'si
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               optionIndex:
     *                 type: integer
     *     responses:
     *       200:
     *         description: Oy başarıyla kullanıldı.
     *       400:
     *         description: Geçersiz istek veya zaten oy kullanılmış.
     */
    router.post('/vote/:id', authenticate, authorize('user'), async (req, res) => {
        const { id } = req.params;
        const { optionIndex } = req.body;
      
        try {
          const poll = await Poll.findById(id);
          if (!poll) return res.status(404).json({ message: 'Anket bulunamadı.' });
      
          const now = new Date();
          if (now < new Date(poll.startAt)) {
            return res.status(400).json({ message: 'Anket oylama süresi henüz başlamadı.' });
          }
      
          if (now > new Date(poll.endAt)) {
            return res.status(400).json({ message: 'Anket oylama süresi sona erdi.' });
          }
      
          if (poll.voters.some((voter) => voter.userId.toString() === req.user.id)) {
            return res.status(400).json({ message: 'Bu ankete zaten oy verdiniz.' });
          }
      
          if (optionIndex < 0 || optionIndex >= poll.options.length) {
            return res.status(400).json({ message: 'Geçersiz seçenek.' });
          }
      
          poll.options[optionIndex].votes += 1;
          poll.voters.push({ userId: req.user.id, optionIndex });
      
          await poll.save();
          io.emit('pollUpdated', poll);
          res.json(poll);
        } catch (error) {
          console.error('Hata:', error);
          res.status(500).json({ message: 'Sunucu hatası.' });
        }
      });

    /**
     * @swagger
     * /api/polls/{id}:
     *   get:
     *     summary: Belirli bir anketi getir
     *     tags: [Polls]
     *     description: Belirtilen ID'ye sahip bir anketi getirir.
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Anketin benzersiz ID'si
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Belirtilen anket başarıyla getirildi.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 _id:
     *                   type: string
     *                 question:
     *                   type: string
     *                 options:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       name:
     *                         type: string
     *                       votes:
     *                         type: integer
     *                 createdBy:
     *                   type: string
     *                 createdAt:
     *                   type: string
     *       404:
     *         description: Anket bulunamadı.
     *       500:
     *         description: Sunucu hatası.
     */
        router.get('/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const poll = await Poll.findById(id);
                if (!poll) return res.status(404).json({ message: 'Anket bulunamadı' });

                res.json(poll);
            } catch (error) {
                console.error('Hata:', error);
                res.status(500).json({ message: 'Sunucu hatası' });
            }
        });

    /**
     * @swagger
     * /api/polls/{id}:
     *   delete:
     *     summary: Anket sil
     *     tags: [Polls]
     *     description: Belirli bir ID'ye sahip anketi siler. Sadece admin yetkisine sahip kullanıcılar bu işlemi gerçekleştirebilir.
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Silinecek anketin benzersiz ID'si
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Anket başarıyla silindi.
     *       403:
     *         description: Yetkisiz işlem.
     *       404:
     *         description: Anket bulunamadı.
     */
    router.delete('/:id', authenticate, authorize(['admin', 'moderator']), async (req, res) => {
        const { id } = req.params;
      
        try {
          const poll = await Poll.findByIdAndDelete(id);
          if (!poll) {
            return res.status(404).json({ message: 'Anket bulunamadı.' });
          }
      
          res.json({ message: 'Anket başarıyla silindi.' });
        } catch (error) {
          console.error('Hata:', error);
          res.status(500).json({ message: 'Sunucu hatası.' });
        }
      });

    /**
     * @swagger
     * /api/polls/{id}:
     *   put:
     *     summary: Anket güncelle
     *     tags: [Polls]
     *     description: Belirli bir ID'ye sahip anketin soru veya seçeneklerini günceller. Sadece admin yetkisine sahip kullanıcılar bu işlemi gerçekleştirebilir.
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: Güncellenecek anketin benzersiz ID'si
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               question:
     *                 type: string
     *               options:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: Anket başarıyla güncellendi.
     *       403:
     *         description: Yetkisiz işlem.
     *       404:
     *         description: Anket bulunamadı.
     */
    router.put('/:id', authenticate, authorize(['admin', 'moderator']), async (req, res) => {
        const { id } = req.params;
        const { question, options } = req.body;
      
        try {
          const updateData = {};
          if (question) updateData.question = question;
          if (options && Array.isArray(options)) {
            updateData.options = options.map((option) => ({ name: option, votes: 0 }));
          }
      
          const poll = await Poll.findByIdAndUpdate(id, updateData, { new: true });
          if (!poll) {
            return res.status(404).json({ message: 'Anket bulunamadı.' });
          }
      
          res.json({ message: 'Anket başarıyla güncellendi.', poll });
        } catch (error) {
          console.error('Hata:', error);
          res.status(500).json({ message: 'Sunucu hatası.' });
        }
      });

    /**
     * @swagger
     * /api/polls/{id}/stats:
     *   get:
     *     summary: Anket istatistiklerini getir
     *     tags: [Polls]
     *     description: Belirtilen ID'ye sahip anketin istatistiklerini döner.
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         description: İstatistikleri alınacak anketin ID'si
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Anket istatistikleri başarıyla döndü.
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 totalVotes:
     *                   type: integer
     *                 options:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       name:
     *                         type: string
     *                       votes:
     *                         type: integer
     *                       percentage:
     *                         type: number
     *                 topOption:
     *                   type: string
     *       404:
     *         description: Anket bulunamadı.
     */
    router.get('/:id/stats', async (req, res) => {
        try {
        const { id } = req.params;
    
        const poll = await Poll.findById(id);
        if (!poll) return res.status(404).json({ message: 'Anket bulunamadı.' });
    
        const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
    
        const options = poll.options.map((option) => ({
            name: option.name,
            votes: option.votes,
            percentage: totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(2) : 0,
        }));
    
        const topOption = options.reduce((max, option) => (option.votes > max.votes ? option : max), {
            name: 'Yok',
            votes: 0,
        }).name;
    
        res.json({
            totalVotes,
            options,
            topOption,
        });
        } catch (error) {
        console.error('Hata:', error);
        res.status(500).json({ message: 'Sunucu hatası.' });
        }
    });

    return router;
};