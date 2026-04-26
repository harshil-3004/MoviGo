const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Movie = require('./models/Movie');
const User = require('./models/User');
const Theater = require('./models/Theater');
const Showtime = require('./models/Showtime');
const Booking = require('./models/Booking');
const Promotion = require('./models/Promotion');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/movigo';

const MOCK_MOVIES = [
  {
    title: "Monkey Man",
    description: "An anonymous young man unleashes a campaign of vengeance against the corrupt leaders who murdered his mother and continue to systemically victimize the poor and powerless.",
    genre: "Action/Thriller",
    rating: 4.5,
    poster: "https://image.tmdb.org/t/p/original/uDsyRkvq9sX7qt3SCDvGZ3MvGfs.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/fUls7K6pT65Jp9J6L6K6pT65Jp9.jpg",
    releaseDate: "2024-04-05"
  },
  {
    title: "Civil War",
    description: "In a near-future dystopian America, a team of military-embedded journalists race against time to reach Washington, D.C., before rebel factions descend upon the White House.",
    genre: "Action/Drama",
    rating: 4.3,
    poster: "https://image.tmdb.org/t/p/original/sh7RgPmcO979ZSTbbZ9A7SDBoff.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/vY5pE9GueS5v9J6L6K6pT65Jp9.jpg",
    releaseDate: "2024-04-12"
  },
  {
    title: "Challengers",
    description: "Tashi, a former tennis prodigy turned coach, turned her husband into a world-famous champion. To jolt him out of his recent losing streak, she makes him play a 'Challenger' event against his former best friend and Tashi's former boyfriend.",
    genre: "Drama/Romance",
    rating: 4.7,
    poster: "https://image.tmdb.org/t/p/original/8Y9Uoj9oH4vU8xN9eLqY6m6a6m6.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/zY5pE9GueS5v9J6L6K6pT65Jp9.jpg",
    releaseDate: "2024-04-26"
  },
  {
    title: "Abigail",
    description: "After a group of criminals kidnap the ballerina daughter of a powerful underworld figure, they retreat to an isolated mansion, unaware that they're locked inside with a very real monster.",
    genre: "Horror/Thriller",
    rating: 4.2,
    poster: "https://image.tmdb.org/t/p/original/799pS1J6L6K6pT65Jp9J6L6K6pT.jpg",
    backdrop: "https://image.tmdb.org/t/p/original/xY5pE9GueS5v9J6L6K6pT65Jp9.jpg",
    releaseDate: "2024-04-19"
  }
];

const MOCK_THEATERS = [
  {
    idString: "t1",
    name: "MoviGo Galaxy Cinema",
    location: "Downtown Mall, Sector 5",
    format: "IMAX / 4DX",
    screens: [
      { number: 1, name: "Screen 1 - Grand IMAX", rows: 10, cols: 15, pricing: { "A": 500, "B": 500, "C": 450, "D": 450, "E": 400 } },
      { number: 2, name: "Screen 2 - Atmos Gold", rows: 8, cols: 12, pricing: { "A": 650, "B": 650, "C": 600 } }
    ]
  },
  {
    idString: "t2",
    name: "Cineplex Platinum",
    location: "Heritage Square",
    format: "Standard / Dolby",
    screens: [
      { number: 1, name: "Platinum Reel 1", rows: 12, cols: 12, pricing: { "A": 350, "B": 350, "C": 300 } }
    ]
  }
];

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.');

    // 1. Clear Data
    console.log('Clearing existing data...');
    await Movie.deleteMany({});
    await User.deleteMany({});
    await Theater.deleteMany({});
    await Showtime.deleteMany({});
    await Booking.deleteMany({});
    await Promotion.deleteMany({});
    console.log('✅ Collections cleared.');

    // 2. Create Users
    console.log('Seeding users...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const managerPassword = await bcrypt.hash('manager123', salt);
    const userPassword = await bcrypt.hash('user123', salt);

    const users = await User.insertMany([
      { name: 'System Admin', email: 'admin@movigo.com', password: adminPassword, role: 'admin', membershipLevel: 'Gold', rewardPoints: 10000 },
      { name: 'Theater Manager', email: 'manager@cinema.com', password: managerPassword, role: 'theater_admin', theaterId: 't1' },
      { name: 'John Doe', email: 'user@test.com', password: userPassword, role: 'user', rewardPoints: 500 }
    ]);
    console.log('✅ Users seeded.');

    // 3. Create Movies
    console.log('Seeding current movies...');
    const createdMovies = await Movie.insertMany(MOCK_MOVIES);
    console.log('✅ Movies seeded.');

    // 4. Create Theaters
    console.log('Seeding theaters...');
    const createdTheaters = await Theater.insertMany(MOCK_THEATERS);
    console.log('✅ Theaters seeded.');

    // 5. Create Showtimes
    console.log('Seeding showtimes...');
    const showtimes = [];
    const dates = ['2024-04-20', '2024-04-21', '2024-04-22'];
    const times = ['11:00 AM', '02:30 PM', '06:00 PM', '09:30 PM'];

    createdMovies.forEach((movie, mIdx) => {
      dates.forEach((date, dIdx) => {
        times.forEach((time, tIdx) => {
           // Alternate theaters and screens
           const theater = createdTheaters[mIdx % createdTheaters.length];
           showtimes.push({
             theater: theater._id,
             movie: movie._id,
             date,
             time,
             screenNumber: (tIdx % theater.screens.length) + 1,
             bookedSeats: [],
             lockedSeats: []
           });
        });
      });
    });

    await Showtime.insertMany(showtimes);
    console.log('✅ Showtimes seeded.');

    // 6. Create Promos
    console.log('Seeding promotions...');
    await Promotion.insertMany([
      { code: 'MOVIGO10', type: 'percentage', value: 10, expiry: '2026-12-31', scope: 'global' },
      { code: 'WELCOME50', type: 'flat', value: 50, expiry: '2026-12-31', scope: 'global' }
    ]);
    console.log('✅ Promotions seeded.');

    console.log('\n🚀 DATABASE SEEDED SUCCESSFULLY!');
    console.log('-----------------------------------');
    console.log('Admin Login: admin@movigo.com / admin123');
    console.log('Manager Login: manager@cinema.com / manager123');
    console.log('User Login: user@test.com / user123');
    console.log('-----------------------------------');

    process.exit();
  } catch (error) {
    console.error('❌ SEEDING FAILED:', error);
    process.exit(1);
  }
};

seedData();
