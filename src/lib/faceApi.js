// API routes for face recognition integration

const FACE_API_URL = process.env.NEXT_PUBLIC_FACE_API_URL || 'http://localhost:8000';

/**
 * Register a face and get embedding
 */
export async function registerFace(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${FACE_API_URL}/register`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Face registration failed');
    }

    return data;
  } catch (error) {
    console.error('Face registration error:', error);
    throw error;
  }
}

/**
 * Verify a face against stored embedding
 */
export async function verifyFace(imageFile, storedEmbedding) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    if (storedEmbedding) {
      formData.append('stored_embedding', JSON.stringify(storedEmbedding));
    }

    const response = await fetch(`${FACE_API_URL}/verify`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Face verification failed');
    }

    return data;
  } catch (error) {
    console.error('Face verification error:', error);
    throw error;
  }
}

/**
 * Detect face in image
 */
export async function detectFace(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${FACE_API_URL}/detect`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Face detection failed');
    }

    return data;
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

/**
 * Extract face embedding
 */
export async function extractEmbedding(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${FACE_API_URL}/extract-embedding`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Embedding extraction failed');
    }

    return data;
  } catch (error) {
    console.error('Embedding extraction error:', error);
    throw error;
  }
}

/**
 * Check liveness
 */
export async function checkLiveness(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);

    const response = await fetch(`${FACE_API_URL}/liveness`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Liveness check failed');
    }

    return data;
  } catch (error) {
    console.error('Liveness check error:', error);
    throw error;
  }
}

/**
 * Compare two embeddings
 */
export async function compareEmbeddings(embedding1, embedding2) {
  try {
    const response = await fetch(`${FACE_API_URL}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embedding1,
        embedding2,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Comparison failed');
    }

    return data;
  } catch (error) {
    console.error('Comparison error:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embeddings locally
 * @param {number[]} embedding1 - First embedding vector
 * @param {number[]} embedding2 - Second embedding vector
 * @returns {number} Similarity score between 0 and 1
 */
export function calculateCosineSimilarity(embedding1, embedding2) {
  if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
    return 0;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Check if a face embedding is unique (not already registered to another user)
 * @param {number[]} newEmbedding - The new face embedding to check
 * @param {Array} existingUsers - Array of users with their faceEmbedding
 * @param {number|null} excludeUserId - User ID to exclude from check (for updates)
 * @param {number} threshold - Similarity threshold (default 0.6 = 60%)
 * @returns {Object} { isUnique: boolean, matchedUser: object|null, similarity: number }
 */
export function checkFaceUniqueness(newEmbedding, existingUsers, excludeUserId = null, threshold = 0.6) {
  let highestSimilarity = 0;
  let matchedUser = null;

  for (const user of existingUsers) {
    // Skip if this is the user we're updating
    if (excludeUserId && user.id === excludeUserId) {
      continue;
    }

    // Skip users without face embedding
    if (!user.faceEmbedding) {
      continue;
    }

    try {
      const storedEmbedding = typeof user.faceEmbedding === 'string'
        ? JSON.parse(user.faceEmbedding)
        : user.faceEmbedding;

      const similarity = calculateCosineSimilarity(newEmbedding, storedEmbedding);

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        matchedUser = user;
      }
    } catch (error) {
      console.error(`Error parsing embedding for user ${user.id}:`, error);
    }
  }

  return {
    isUnique: highestSimilarity < threshold,
    matchedUser: highestSimilarity >= threshold ? matchedUser : null,
    similarity: highestSimilarity,
  };
}

