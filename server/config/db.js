const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB Connected');
      
      // First check and fix location data, then ensure indexes
      await fixLocationData();
      await ensureIndexes();
      return;
    } catch (error) {
      retries += 1;
      console.error(`MongoDB Connection Error (Attempt ${retries}/${maxRetries}):`, error.message);
      if (retries === maxRetries) {
        console.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// Function to fix improperly formatted location data
async function fixLocationData() {
  try {
    const collection = mongoose.connection.collection('safetyreports');
    
    // Check a sample document
    const sampleDoc = await collection.findOne({});
    console.log('Sample document location structure:', JSON.stringify(sampleDoc.location, null, 2));
    
    // Find all documents
    const cursor = collection.find({});
    const totalDocs = await cursor.count();
    console.log(`Checking ${totalDocs} documents for location data issues`);
    
    let fixedCount = 0;
    
    // Process each document
    await cursor.forEach(async (doc) => {
      let needsUpdate = false;
      let newLocation = { type: 'Point', coordinates: [0, 0] };
      
      // Check if location exists but isn't properly formatted
      if (doc.location) {
        // Case 1: Missing type field or not "Point"
        if (!doc.location.type || doc.location.type !== 'Point') {
          needsUpdate = true;
        }
        
        // Case 2: Missing coordinates or not an array of 2 numbers
        if (!doc.location.coordinates || 
            !Array.isArray(doc.location.coordinates) || 
            doc.location.coordinates.length !== 2) {
          needsUpdate = true;
        } else {
          // Use existing coordinates if they exist
          newLocation.coordinates = doc.location.coordinates;
        }
        
        // Case 3: Has lat/lng fields instead of coordinates
        if (doc.location.lat !== undefined && doc.location.lng !== undefined) {
          newLocation.coordinates = [doc.location.lng, doc.location.lat];
          needsUpdate = true;
        }
      } else {
        // No location field at all
        needsUpdate = true;
      }
      
      // Update document if needed
      if (needsUpdate) {
        try {
          await collection.updateOne(
            { _id: doc._id },
            { $set: { location: newLocation } }
          );
          fixedCount++;
        } catch (updateError) {
          console.error(`Error updating document ${doc._id}:`, updateError);
        }
      }
    });
    
    console.log(`Fixed ${fixedCount} documents with improper location data`);
  } catch (error) {
    console.error('Error fixing location data:', error);
  }
}

// Function to ensure all required indexes exist
async function ensureIndexes() {
  try {
    const collection = mongoose.connection.collection('safetyreports');
    
    // Drop existing index if it exists (clean slate)
    try {
      await collection.dropIndex('location_2dsphere');
      console.log('Dropped existing geospatial index');
    } catch (e) {
      // It's okay if this fails - might not exist yet
      console.log('No existing index to drop or error dropping index');
    }
    
    // Create the geospatial index explicitly
    await collection.createIndex({ "location": "2dsphere" });
    
    // Verify the index exists
    const indexes = await collection.indexes();
    console.log('Existing indexes:', JSON.stringify(indexes, null, 2));
    console.log('Geospatial index for safetyreports collection created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    // Not exiting here as the application might still work with degraded performance
  }
}

module.exports = connectDB;