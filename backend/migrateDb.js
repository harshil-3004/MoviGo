const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const LOCAL_URI = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/moviegoo';
const ATLAS_URI = process.env.MONGO_URI;

async function migrate() {
  if (!ATLAS_URI) {
    console.error('❌ MONGO_URI is not set in backend/.env');
    process.exit(1);
  }
  try {
    console.log('Connecting to Local DB...');
    const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    const localDb = localConn.db;
    console.log('✅ Connected to Local DB.');

    console.log('Connecting to Atlas DB...');
    const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    const atlasDb = atlasConn.db;
    console.log('✅ Connected to Atlas DB.');

    const collections = await localDb.listCollections().toArray();
    
    for (let colInfo of collections) {
      const colName = colInfo.name;
      // Skip system collections
      if (colName.startsWith('system.')) continue;
      
      console.log(`\nMigrating collection: ${colName}...`);
      
      const localCollection = localDb.collection(colName);
      const atlasCollection = atlasDb.collection(colName);
      
      const docs = await localCollection.find({}).toArray();
      
      if (docs.length > 0) {
        console.log(`Found ${docs.length} documents. Copying...`);
        // clear existing to avoid _id conflicts
        await atlasCollection.deleteMany({});
        await atlasCollection.insertMany(docs);
        console.log(`✅ Copied to ${colName}`);
      } else {
        console.log(`⚠️ Collection empty, skipping.`);
      }
    }
    
    console.log('\n🎉 All local data has been successfully copied to MongoDB Atlas!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during migration:', err);
    process.exit(1);
  }
}
migrate();
