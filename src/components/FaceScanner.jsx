import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFaceModel } from '../contexts/FaceModelContext';
import { Camera, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';

const MATCH_THRESHOLD = 0.45;

export default function FaceScanner({ mode = 'login', onSuccess, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading, ready, scanning, success, error
  const [message, setMessage] = useState('กำลังเตรียมระบบสแกนหน้า...');
  const { loginByFace } = useAuth();
  const { modelsLoaded, error: modelError } = useFaceModel();

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (modelError) {
      setStatus('error');
      setMessage(modelError);
    } else if (modelsLoaded && status === 'loading') {
      setMessage('กำลังเปิดกล้อง...');
      startCamera();
    }
  }, [modelsLoaded, modelError, status]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setStatus('ready');
          setMessage('พร้อมสแกน — กดปุ่ม "สแกนหน้า" เพื่อเริ่ม');
        };
      }
    } catch (err) {
      setStatus('error');
      setMessage('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const handleScan = async () => {
    if (!videoRef.current || status === 'scanning') return;

    setStatus('scanning');
    setMessage('กำลังสแกนหน้า...');

    try {
      // Small delay to allow UI to update to 'scanning' state
      await new Promise(resolve => setTimeout(resolve, 100));

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus('ready');
        setMessage('ไม่พบใบหน้า กรุณาหันหน้าเข้ากล้องแล้วลองใหม่');
        return;
      }

      const scannedDescriptor = detection.descriptor;

      if (mode === 'register') {
        // Return descriptor for registration
        stopCamera();
        setStatus('success');
        setMessage('บันทึกใบหน้าสำเร็จ!');
        onSuccess && onSuccess(Array.from(scannedDescriptor));
        return;
      }

      // Login/verify mode: match against all employees with face_descriptor
      const { data: employees } = await supabase
        .from('employees')
        .select('*, branches(name), departments(name, branch_id, branches(name))')
        .not('face_descriptor', 'is', null);

      if (!employees || employees.length === 0) {
        setStatus('error');
        setMessage('❌ ยังไม่มีพนักงานที่ลงทะเบียนใบหน้า — กรุณาลงทะเบียนใบหน้าก่อนใช้งาน');
        return;
      }

      let bestMatch = null;
      let bestDistance = Infinity;

      for (const emp of employees) {
        try {
          const storedDescriptor = new Float32Array(emp.face_descriptor);
          if (storedDescriptor.length !== 128) continue; // Skip invalid descriptors
          const distance = faceapi.euclideanDistance(scannedDescriptor, storedDescriptor);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = emp;
          }
        } catch {
          continue; // Skip employees with corrupted face data
        }
      }

      console.log(`[FaceScanner] Best match: ${bestMatch?.name}, distance: ${bestDistance.toFixed(4)}, threshold: ${MATCH_THRESHOLD}`);

      if (bestMatch && bestDistance < MATCH_THRESHOLD) {
        // Match found!
        const confidence = Math.round((1 - bestDistance) * 100);
        stopCamera();
        setStatus('success');
        setMessage(`✅ สวัสดี! ${bestMatch.name} (${bestMatch.employee_code}) — ความมั่นใจ ${confidence}%`);

        const matchedUser = {
          ...bestMatch,
          branchName: bestMatch.branches?.name || bestMatch.departments?.branches?.name || '',
          departmentName: bestMatch.departments?.name || '',
        };

        if (mode === 'login') {
          await loginByFace(matchedUser);
        }

        setTimeout(() => {
          onSuccess && onSuccess(matchedUser);
        }, 1500);
      } else {
        setStatus('ready');
        const distPct = isFinite(bestDistance) ? (bestDistance * 100).toFixed(0) : '??';
        setMessage(
          `❌ ไม่พบใบหน้าที่ตรงกัน (ค่าต่าง: ${distPct}%, ต้องต่ำกว่า ${(MATCH_THRESHOLD * 100).toFixed(0)}%) — กรุณาหันหน้าตรงแล้วลองใหม่`
        );
      }
    } catch (err) {
      setStatus('ready');
      setMessage('เกิดข้อผิดพลาด: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Camera View */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 400,
          aspectRatio: '4/3',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: 'var(--bg-tertiary)',
          border: status === 'success'
            ? '3px solid var(--success)'
            : status === 'scanning'
            ? '3px solid var(--primary)'
            : '3px solid var(--border)',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Overlay for scanning */}
        {status === 'scanning' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 160,
                height: 160,
                border: '3px solid var(--primary-light)',
                borderRadius: '50%',
                animation: 'pulse-ring 1.5s infinite',
              }}
            />
          </div>
        )}

        {/* Loading overlay */}
        {status === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'var(--bg-tertiary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>กำลังโหลดโมเดล AI...</span>
          </div>
        )}
      </div>

      {/* Status Message */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 'var(--radius-md)',
          fontSize: 14,
          fontWeight: 500,
          background: status === 'success'
            ? 'var(--success-bg)'
            : status === 'error'
            ? 'var(--danger-bg)'
            : 'var(--bg-tertiary)',
          color: status === 'success'
            ? 'var(--success)'
            : status === 'error'
            ? 'var(--danger)'
            : 'var(--text-secondary)',
          width: '100%',
          textAlign: 'center',
          justifyContent: 'center',
        }}
      >
        {status === 'success' && <CheckCircle2 size={16} />}
        {status === 'error' && <AlertCircle size={16} />}
        {status === 'scanning' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
        {message}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        {(status === 'ready' || status === 'error') && (
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleScan}
            disabled={status !== 'ready'}
          >
            <Camera size={20} />
            {mode === 'register' ? 'ถ่ายรูปลงทะเบียน' : 'สแกนหน้า'}
          </button>
        )}
        <button
          className="btn btn-ghost btn-full"
          onClick={() => {
            stopCamera();
            onCancel && onCancel();
          }}
        >
          <X size={18} />
          ยกเลิก
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
