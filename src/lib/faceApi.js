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
