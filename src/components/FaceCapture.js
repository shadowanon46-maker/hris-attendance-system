'use client';

import { useState, useRef, useEffect } from 'react';

export default function FaceCapture({ onCapture, onCancel, mode = 'register', autoCapture = false }) {
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [status, setStatus] = useState('Memulai kamera...');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionCanvasRef = useRef(null);
  const autoCaptureTriggered = useRef(false);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Start detection when camera is ready
  useEffect(() => {
    if (cameraReady && !detectionIntervalRef.current) {
      startSimpleDetection();
    }
  }, [cameraReady]);

  // Auto-capture when face is detected
  useEffect(() => {
    if (autoCapture && faceDetected && !autoCaptureTriggered.current) {
      autoCaptureTriggered.current = true;
      setStatus('✓ Wajah Terdeteksi! Memulai capture...');
      // Wait 1 second after face detected, then start countdown
      setTimeout(() => {
        captureImage();
      }, 1000);
    }
  }, [autoCapture, faceDetected]);

  const startSimpleDetection = () => {
    const canvas = detectionCanvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 120;

    detectionIntervalRef.current = setInterval(() => {
      if (!video || video.readyState !== 4) return;

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const detected = simplePresenceDetection(imageData);
        
        setFaceDetected(detected);
        setStatus(detected ? '✓ Wajah Terdeteksi' : '⏳ Mencari wajah...');
      } catch (err) {
        console.error('Detection error:', err);
      }
    }, 300);
  };

  const simplePresenceDetection = (imageData) => {
    const data = imageData.data;
    const centerWidth = imageData.width * 0.6;
    const centerHeight = imageData.height * 0.6;
    const startX = Math.floor((imageData.width - centerWidth) / 2);
    const startY = Math.floor((imageData.height - centerHeight) / 2);
    const endX = startX + centerWidth;
    const endY = startY + centerHeight;

    let brightPixels = 0;
    let totalChecked = 0;

    // Check center region only
    for (let y = startY; y < endY; y += 2) {
      for (let x = startX; x < endX; x += 2) {
        const i = (y * imageData.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        // Check if it's face-like brightness (not too dark, not too bright)
        if (brightness > 60 && brightness < 220) {
          brightPixels++;
        }
        totalChecked++;
      }
    }

    // If 30% of center area has face-like brightness, consider face detected
    return totalChecked > 0 && (brightPixels / totalChecked) > 0.3;
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
          setStatus('✓ Kamera Siap');
        };
      }
      setError('');
    } catch (err) {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || capturing) return;

    setCapturing(true);
    setError('');

    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(0);

    // Capture image
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' });
        
        // Send to parent component
        if (onCapture) {
          onCapture(file);
        }
        
        stopCamera();
      }
      setCapturing(false);
    }, 'image/jpeg', 0.95);
  };

  const handleCancel = () => {
    stopCamera();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {mode === 'register' ? 'Registrasi Wajah' : 'Verifikasi Wajah - Clock In/Out'}
        </h2>
        
        {mode === 'attendance' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">
              ⚡ Sistem akan mendeteksi wajah dan mengambil foto otomatis
            </p>
          </div>
        )}
        
        {/* Detection Status */}
        <div className={`mb-4 p-4 rounded-lg border-2 transition-all ${
          faceDetected 
            ? 'bg-green-50 border-green-300' 
            : cameraReady
            ? 'bg-yellow-50 border-yellow-300'
            : 'bg-gray-50 border-gray-300'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              faceDetected 
                ? 'bg-green-500 animate-pulse' 
                : cameraReady 
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-gray-400 animate-pulse'
            }`}></div>
            <p className={`font-semibold ${
              faceDetected 
                ? 'text-green-800' 
                : cameraReady
                ? 'text-yellow-800'
                : 'text-gray-600'
            }`}>
              {status}
            </p>
          </div>
          {cameraReady && !faceDetected && (
            <p className="text-xs text-yellow-700 mt-2">
              Posisikan wajah Anda di tengah kamera dan pastikan pencahayaan cukup
            </p>
          )}
          {faceDetected && autoCapture && (
            <p className="text-xs text-green-700 mt-2 font-medium animate-pulse">
              Wajah terdeteksi! Foto akan diambil dalam 1 detik...
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          {/* Face guide overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-white border-dashed rounded-full w-64 h-64 opacity-50"></div>
          </div>

          {/* Countdown overlay */}
          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-8xl font-bold animate-pulse">
                {countdown}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <canvas ref={detectionCanvasRef} className="hidden" />

        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800 font-medium mb-2">Instruksi:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Posisikan wajah Anda di tengah kamera</li>
            <li>• Pastikan pencahayaan cukup terang</li>
            <li>• Lepas kacamata atau topi (jika ada)</li>
            <li>• Tatap langsung ke kamera</li>
            {autoCapture ? (
              <li className="font-bold text-blue-900">• Wajah akan dideteksi otomatis, lalu foto diambil</li>
            ) : (
              <li>• Jaga ekspresi netral</li>
            )}
          </ul>
        </div>

        {!autoCapture && (
          <div className="flex gap-3">
            <button
              onClick={captureImage}
              disabled={!stream || capturing || !cameraReady || !faceDetected}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {capturing ? 'Mengambil Gambar...' : faceDetected ? '📸 Ambil Foto' : cameraReady ? '⏳ Menunggu Wajah...' : '⏳ Memulai Kamera...'}
            </button>
            <button
              onClick={handleCancel}
              disabled={capturing}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        )}

        {autoCapture && (
          <div className="flex justify-center">
            <button
              onClick={handleCancel}
              disabled={capturing}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
