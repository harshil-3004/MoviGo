const mongoose = require('mongoose');
require('dotenv').config();
const Movie = require('./models/Movie');

const upcomingMoviesData = [
  {
    title: 'Deadpool & Wolverine',
    description: 'A listless Wade Wilson toils away in civilian life. His days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.',
    genre: 'Action / Comedy',
    poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&w=1600&q=80',
    releaseDate: 'Jul 26, 2026',
    isUpcoming: true,
    rating: 0
  },
  {
    title: 'Gladiator II',
    description: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum after his home is conquered by the tyrannical Emperors who now lead Rome with an iron fist.',
    genre: 'Action / Drama',
    poster: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1600&q=80',
    releaseDate: 'Nov 22, 2026',
    isUpcoming: true,
    rating: 0
  },
  {
    title: 'Avatar 3: Fire & Ash',
    description: 'Set years after the events of The Way of Water, the Na\'vi must face a new threat from the Ash People, a volcanic tribe that represents the darker side of Pandora.',
    genre: 'Sci-Fi / Adventure',
    poster: 'https://images.unsplash.com/photo-1618336753174-89b5dc6b4c19?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1506443432602-ac2fcd6f54e0?auto=format&fit=crop&w=1600&q=80',
    releaseDate: 'Dec 19, 2026',
    isUpcoming: true,
    rating: 0
  },
  {
    title: 'Mufasa: The Lion King',
    description: 'Rafiki relays the legend of Mufasa to young lion cub Kiara, daughter of Simba and Nala, with Timon and Pumbaa lending their signature schtick. Told in flashbacks, the story introduces Mufasa as an orphaned cub, lost and alone until he meets a sympathetic lion named Taka.',
    genre: 'Animation / Drama',
    poster: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
    backdrop: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=80',
    releaseDate: 'Dec 20, 2026',
    isUpcoming: true,
    rating: 0
  }
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Purging existing upcoming movies...');
    await Movie.deleteMany({ isUpcoming: true });
    
    console.log('Inserting new upcoming movies...');
    await Movie.insertMany(upcomingMoviesData);
    
    console.log('Successfully seeded upcoming movies!');
    process.exit();
  })
  .catch(err => {
    console.error('Connection Error:', err);
    process.exit(1);
  });
