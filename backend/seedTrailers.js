const mongoose = require('mongoose');
require('dotenv').config();
const Movie = require('./models/Movie');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Update specific movies with trailer URLs
    // Deadpool
    await Movie.findOneAndUpdate(
      { title: { $regex: /Deadpool/i } },
      { $set: { trailerUrl: 'https://www.youtube.com/embed/73_1biulkYk?autoplay=1' } }
    );
    
    // Gladiator II
    await Movie.findOneAndUpdate(
      { title: { $regex: /Gladiator/i } },
      { $set: { trailerUrl: 'https://www.youtube.com/embed/4rgYUipGJNo?autoplay=1' } }
    );
    
    // Fallback: update any other movie that doesn't have a trailer with a generic placeholder (like Dune trailer)
    await Movie.updateMany(
      { trailerUrl: { $exists: false } },
      { $set: { trailerUrl: 'https://www.youtube.com/embed/Way9Dexny3w?autoplay=1' } }
    );

    console.log('Trailer URLs seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding trailers:', error);
    process.exit(1);
  }
};

run();
