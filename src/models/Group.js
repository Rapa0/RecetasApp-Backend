const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Por favor, añade un nombre al grupo'],
      trim: true,

    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    recipes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
      },
    ],
  },
  {
    timestamps: true,
  },
);

groupSchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);