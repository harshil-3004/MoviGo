const mongoose = require('mongoose');
const RedeemableItem = require('./models/RedeemableItem');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const items = [
  {
    name: 'Standard Popcorn',
    description: 'A large tub of our signature salted popcorn. Perfect for any blockbuster.',
    pointCost: 200,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1572177191856-3cde618dee1f?q=80&w=500&auto=format&fit=crop'
  },
  {
    name: 'Soft Drink (Large)',
    description: 'Ice-cold refreshment of your choice. Comes in a 750ml collectible cup.',
    pointCost: 150,
    category: 'Drinks',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=500&auto=format&fit=crop'
  },
  {
    name: 'Nachos with Cheese',
    description: 'Crunchy tortilla chips served with warm, gooey jalapeño cheese dip.',
    pointCost: 250,
    category: 'Snacks',
    image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?q=80&w=500&auto=format&fit=crop'
  },
  {
    name: 'MovieGo T-Shirt',
    description: 'Exclusive "Inner Circle" merchandise. Limited edition black cotton tee.',
    pointCost: 1000,
    category: 'Merchandise',
    image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500&auto=format&fit=crop'
  },
  {
    name: 'Double Feature Ticket',
    description: 'Get a free ticket for any upcoming movie of your choice.',
    pointCost: 1500,
    category: 'Tickets',
    image: 'https://images.unsplash.com/photo-1542204172-658a09b44139?q=80&w=500&auto=format&fit=crop'
  }
];

const seedLoyalty = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding loyalty items');

    await RedeemableItem.deleteMany({});
    console.log('🗑️  Cleared existing loyalty items');

    await RedeemableItem.insertMany(items);
    console.log('✨ Seeded 5 new loyalty items');

    process.exit();
  } catch (error) {
    console.error('❌ Error seeding items:', error);
    process.exit(1);
  }
};

seedLoyalty();
