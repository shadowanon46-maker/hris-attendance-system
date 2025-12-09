/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if coordinate is within radius of office location
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @param {number} officeLat - Office latitude
 * @param {number} officeLng - Office longitude
 * @param {number} radius - Allowed radius in meters
 * @returns {boolean} True if within radius
 */
export function isWithinRadius(userLat, userLng, officeLat, officeLng, radius) {
  const distance = calculateDistance(userLat, userLng, officeLat, officeLng);
  return distance <= radius;
}

/**
 * Check if coordinate is within any of the office locations
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @param {Array} officeLocations - Array of office locations with lat, lng, radius
 * @returns {Object} {isValid: boolean, nearestLocation: object, distance: number}
 */
export function isWithinAnyOfficeLocation(userLat, userLng, officeLocations) {
  if (!officeLocations || officeLocations.length === 0) {
    return { isValid: false, nearestLocation: null, distance: null };
  }

  let nearestLocation = null;
  let minDistance = Infinity;
  let isValid = false;

  for (const location of officeLocations) {
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);
    const radius = location.radius;

    const distance = calculateDistance(userLat, userLng, lat, lng);

    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }

    if (distance <= radius) {
      isValid = true;
    }
  }

  return {
    isValid,
    nearestLocation,
    distance: Math.round(minDistance),
  };
}

/**
 * Check if current time is late based on shift
 * @param {string} startTime - Shift start time (HH:MM:SS)
 * @param {number} toleranceMinutes - Tolerance in minutes
 * @returns {boolean} True if late
 */
export function isLate(startTime, toleranceMinutes = 15) {
  const now = new Date();
  const [hours, minutes] = startTime.split(':').map(Number);
  
  const shiftStart = new Date(now);
  shiftStart.setHours(hours, minutes, 0, 0);
  
  const tolerance = new Date(shiftStart);
  tolerance.setMinutes(tolerance.getMinutes() + toleranceMinutes);
  
  return now > tolerance;
}

/**
 * Format time to HH:MM:SS
 * @param {Date} date - Date object
 * @returns {string} Formatted time
 */
export function formatTime(date) {
  return date.toTimeString().split(' ')[0];
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}
