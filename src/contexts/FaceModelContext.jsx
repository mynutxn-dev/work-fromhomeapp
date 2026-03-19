import { createContext, useContext, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';

const FaceModelContext = createContext(null);
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export function FaceModelProvider({ children }) {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load Face Models', err);
        setError('ไม่สามารถโหลดโมเดล AI ได้ โปรดตรวจสอบอินเทอร์เน็ต');
      }
    };
    loadModels();
  }, []);

  return (
    <FaceModelContext.Provider value={{ modelsLoaded, error }}>
      {children}
    </FaceModelContext.Provider>
  );
}

export function useFaceModel() {
  const context = useContext(FaceModelContext);
  if (!context) throw new Error('useFaceModel must be used within FaceModelProvider');
  return context;
}
