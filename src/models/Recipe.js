const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Por favor, añade un título a la receta'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: false,
    },
    ingredients: [
      {
        type: String,
        required: [true, 'Por favor, añade al menos un ingrediente'],
      },
    ],
    instructions: {
      type: String,
      required: [true, 'Por favor, añade las instrucciones'],
    },
    imageUrl: {
        type: String,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Recipe', recipeSchema);