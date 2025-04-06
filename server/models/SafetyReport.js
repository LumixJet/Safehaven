const mongoose = require('mongoose');

const SafetyReportSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function (v) {
          return (
            v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 && // lng
            v[1] >= -90 && v[1] <= 90      // lat
          );
        },
        message: 'Coordinates must be [lng, lat] with lng (-180 to 180) and lat (-90 to 90)'
      }
    }
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['unsafe', 'suspicious', 'incident', 'safe'],
    default: 'unsafe'
  },
  severity: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  }
});

// Create a 2dsphere index for geospatial queries
SafetyReportSchema.index({ location: '2dsphere' });

// Static method to find reports near a location - with error handling
SafetyReportSchema.statics.findNearby = async function (lat, lng, radiusInKm = 1) {
  try {
    return await this.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat] // Note: GeoJSON uses [lng, lat] order
          },
          $maxDistance: radiusInKm * 1000 // Convert km to meters
        }
      }
    }).sort({ timestamp: -1 }).limit(100);
  } catch (error) {
    console.error("Error in findNearby:", error);
    // Fall back to alternative method if geospatial query fails
    try {
      return await this.findNearbyAlternative(lat, lng, radiusInKm);
    } catch (altError) {
      console.error("Alternative query also failed:", altError);
      return [];
    }
  }
};

// Alternative implementation using $geoWithin for a bounding box (fallback)
SafetyReportSchema.statics.findNearbyAlternative = async function (lat, lng, radiusInKm = 1) {
  try {
    const earthRadiusKm = 6378.1; // Earth's radius in kilometers
    const latDelta = (radiusInKm / earthRadiusKm) * (180 / Math.PI);
    const lngDelta = (radiusInKm / earthRadiusKm) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

    return await this.find({
      location: {
        $geoWithin: {
          $box: [
            [lng - lngDelta, lat - latDelta], // Bottom-left corner
            [lng + lngDelta, lat + latDelta]  // Top-right corner
          ]
        }
      }
    }).sort({ timestamp: -1 }).limit(100);
  } catch (error) {
    console.error("Error in findNearbyAlternative:", error);
    // As a last resort, try a simple query based on coordinate ranges
    return await this.find({
      'location.coordinates.0': { $gte: lng - 0.05, $lte: lng + 0.05 },
      'location.coordinates.1': { $gte: lat - 0.05, $lte: lat + 0.05 }
    }).sort({ timestamp: -1 }).limit(100);
  }
};

// Additional methods used in your SafetyMLService
SafetyReportSchema.statics.getSafeRoutes = async function (lat, lng, radiusInKm = 0.2) {
  try {
    return await this.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInKm * 1000
        }
      }
    }).sort({ timestamp: -1 }).limit(100);
  } catch (error) {
    console.error("Error in getSafeRoutes:", error);
    // Use the alternative method as a fallback
    try {
      return await this.findNearbyAlternative(lat, lng, radiusInKm);
    } catch (altError) {
      console.error("Alternative safe routes query also failed:", altError);
      return [];
    }
  }
};

// Method to get all reports in an area
SafetyReportSchema.statics.getReports = async function (lat, lng, radiusInKm = 1) {
  try {
    return await this.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radiusInKm * 1000
        }
      }
    }).sort({ timestamp: -1 }).limit(100);
  } catch (error) {
    console.error("Error in getReports:", error);
    // Use the alternative method as a fallback
    try {
      return await this.findNearbyAlternative(lat, lng, radiusInKm);
    } catch (altError) {
      console.error("Alternative getReports query also failed:", altError);
      return [];
    }
  }
};

const SafetyReport = mongoose.model('SafetyReport', SafetyReportSchema);

module.exports = SafetyReport;