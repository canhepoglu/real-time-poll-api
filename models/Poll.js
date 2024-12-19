const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  votes: { type: Number, default: 0 },
});

const voterSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  optionIndex: { type: Number, required: true },
});

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [optionSchema],
    voters: [voterSchema],
    createdBy: { type: String, required: true },
    startAt: { type: Date, required: true }, // Anketin başlama zamanı
    endAt: { type: Date, required: true },   // Anketin bitiş zamanı
  },
  { timestamps: true }
);

module.exports = mongoose.model('Poll', pollSchema);