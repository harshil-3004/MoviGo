const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB } = require('./utils/db');

const Movie = require('./models/Movie');
const User = require('./models/User');
const Theater = require('./models/Theater');
const Showtime = require('./models/Showtime');
const Booking = require('./models/Booking');
const Promotion = require('./models/Promotion');

const REAL_MOVIES = [
  {
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.",
    genre: "Sci-Fi / Adventure",
    rating: 4.8,
    duration: "2h 46m",
    releaseDate: "2024-03-01",
    isFeatured: true,
    poster: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
    backdrop: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/Way9Dexny3w?autoplay=1"
  },
  {
    title: "Deadpool & Wolverine",
    description: "A listless Wade Wilson toils away in civilian life before an existential threat to his homeworld forces him to reluctantly suit up again alongside an even more reluctant Wolverine.",
    genre: "Action / Comedy",
    rating: 4.7,
    duration: "2h 08m",
    releaseDate: "2024-07-26",
    isFeatured: false,
    poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=800&q=80",
    backdrop: "https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/73_1biulkYk?autoplay=1"
  },
  {
    title: "Oppenheimer",
    description: "The biographical drama following J. Robert Oppenheimer's leadership of the Manhattan Project during World War II and its dramatic aftermath.",
    genre: "Biography / Drama",
    rating: 4.9,
    duration: "3h 00m",
    releaseDate: "2023-07-21",
    isFeatured: false,
    poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80",
    backdrop: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/uYPbbksJxIg?autoplay=1"
  },
  {
    title: "Spider-Man: Across the Spider-Verse",
    description: "Miles Morales catapults across the Multiverse, joining forces with Gwen Stacy and a team of Spider-People to confront a powerful new villain.",
    genre: "Animation / Action",
    rating: 4.8,
    duration: "2h 20m",
    releaseDate: "2023-06-02",
    isFeatured: false,
    poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80",
    backdrop: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/cqGjhVJWtEg?autoplay=1"
  },
  {
    title: "Interstellar",
    description: "When Earth becomes uninhabitable, a team of ex-NASA pilots and researchers journey through a wormhole near Saturn in search of a new home for humanity.",
    genre: "Sci-Fi / Drama",
    rating: 4.9,
    duration: "2h 49m",
    releaseDate: "2014-11-07",
    isFeatured: false,
    poster: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
    backdrop: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/zSWdZVtXT7E?autoplay=1"
  },
  {
    title: "The Dark Knight",
    description: "When the menace known as the Joker emerges, Batman must confront one of his greatest psychological tests while striving to preserve justice in Gotham.",
    genre: "Action / Crime",
    rating: 5.0,
    duration: "2h 32m",
    releaseDate: "2008-07-18",
    isFeatured: false,
    poster: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80",
    backdrop: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80",
    trailerUrl: "https://www.youtube.com/embed/EXeTwQWrcwY?autoplay=1"
  }
];

const MOCK_THEATERS = [
  {
    idString: "t1",
    name: "MoviGo Galaxy Cinema",
    location: "Downtown Mall, Sector 5",
    format: "IMAX / 4DX",
    approvalStatus: "Approved",
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
    approvalStatus: "Approved",
    screens: [
      { number: 1, name: "Platinum Reel 1", rows: 12, cols: 12, pricing: { "A": 350, "B": 350, "C": 300 } }
    ]
  }
];

const getFutureDates = (count = 7) => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
};

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
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
    console.log('Seeding current movies with real metadata, images, and trailers...');
    const createdMovies = await Movie.insertMany(REAL_MOVIES);
    console.log(`✅ ${createdMovies.length} Movies seeded.`);

    // 4. Create Theaters
    console.log('Seeding approved theaters...');
    const createdTheaters = await Theater.insertMany(MOCK_THEATERS);
    console.log(`✅ ${createdTheaters.length} Theaters seeded.`);

    // Link theater t1 to manager user
    await User.findOneAndUpdate(
      { email: 'manager@cinema.com' },
      { $addToSet: { theaterIds: createdTheaters[0]._id } }
    );

    // 5. Create Showtimes with active dates
    console.log('Seeding active showtimes (today + upcoming 7 days)...');
    const showtimes = [];
    const dates = getFutureDates(7);
    const times = ['11:00 AM', '02:30 PM', '06:00 PM', '09:30 PM'];

    createdMovies.forEach((movie, mIdx) => {
      dates.forEach((date, dIdx) => {
        times.forEach((time, tIdx) => {
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
    console.log(`✅ ${showtimes.length} Showtimes seeded.`);

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

    process.exit(0);
  } catch (error) {
    console.error('❌ SEEDING FAILED:', error);
    process.exit(1);
  }
};

seedData();
