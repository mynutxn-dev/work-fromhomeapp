import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ScanFace } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCheckIn } from '../contexts/CheckInContext';
import { supabase } from '../lib/supabase';
import FaceScanner from '../components/FaceScanner';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [faceNote, setFaceNote] = useState('');
  const [faceStatus, setFaceStatus] = useState('');
  const [faceScanStarted, setFaceScanStarted] = useState(false);
  const [faceScanError, setFaceScanError] = useState('');
  const { login, register, branches, departments, loadBranches, loadDepartments } = useAuth();
  const { checkIn } = useCheckIn();
  const navigate = useNavigate();

  const isEmptySystem = branches.length === 0;
  const availableDepartments = departments.filter((dept) => dept.branch_id === branchId);

  const resetFaceScanFlow = () => {
    setShowFaceScan(false);
    setFaceScanStarted(false);
    setFaceStatus('');
    setFaceNote('');
    setFaceScanError('');
  };

  const handleOpenFaceScan = () => {
    setFaceStatus('');
    setFaceNote('');
    setFaceScanError('');
    setFaceScanStarted(false);
    setShowFaceScan(true);
  };

  const handleStartFaceScan = () => {
    if (!faceStatus) {
      setFaceScanError('กรุณาเลือกรูปแบบการทำงานก่อนสแกนหน้า');
      return;
    }

    if (faceStatus === 'other' && !faceNote.trim()) {
      setFaceScanError('กรุณาระบุหมายเหตุเมื่อเลือก อื่นๆ');
      return;
    }

    setFaceScanError('');
    setFaceScanStarted(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        // In empty system mode, create branch & department first
        if (isEmptySystem) {
          if (!name || !employeeCode || !pinCode || !newBranchName.trim() || !newDeptName.trim()) {
            setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            setIsLoading(false);
            return;
          }
          if (pinCode.length < 4) {
            setError('PIN ต้องมีอย่างน้อย 4 หลัก');
            setIsLoading(false);
            return;
          }

          // Create the branch
          const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .insert({ name: newBranchName.trim() })
            .select()
            .single();
          if (branchError) {
            setError('สร้างสาขาไม่ได้: ' + branchError.message);
            setIsLoading(false);
            return;
          }

          // Create the department
          const { data: deptData, error: deptError } = await supabase
            .from('departments')
            .insert({ name: newDeptName.trim(), branch_id: branchData.id })
            .select()
            .single();
          if (deptError) {
            setError('สร้างแผนกไม่ได้: ' + deptError.message);
            setIsLoading(false);
            return;
          }

          // Now register with the new IDs
          const result = await register({
            name,
            employee_code: employeeCode,
            pin_code: pinCode,
            branch_id: branchData.id,
            department_id: deptData.id,
          });

          if (result.success) {
            await loadBranches();
            await loadDepartments();
            navigate('/');
          } else {
            setError(result.error);
          }
        } else {
          // Normal registration with existing branches/departments
          if (!name || !employeeCode || !pinCode || !branchId || !departmentId) {
            setError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            setIsLoading(false);
            return;
          }
          if (pinCode.length < 4) {
            setError('PIN ต้องมีอย่างน้อย 4 หลัก');
            setIsLoading(false);
            return;
          }
          const result = await register({ name, employee_code: employeeCode, pin_code: pinCode, branch_id: branchId, department_id: departmentId });
          if (result.success) {
            navigate('/');
          } else {
            setError(result.error);
          }
        }
      } else {
        if (!employeeCode || !pinCode) {
          setError('กรุณากรอกรหัสพนักงานและ PIN');
          setIsLoading(false);
          return;
        }
        const result = await login(employeeCode, pinCode);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceLoginSuccess = async (employee) => {
    let lat = null;
    let lng = null;

    const resolvedStatus = faceStatus === 'other' ? 'leave' : faceStatus;
    const resolvedNote = faceStatus === 'other'
      ? `อื่นๆ: ${faceNote.trim()}`
      : faceNote.trim() || 'เช็คอินอัตโนมัติด้วยใบหน้า';

    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
    } catch (err) {
      console.warn('Geolocation not available or denied:', err);
    }

    // Auto check-in when logging in by face
    // Pass employee.id directly because currentUser state hasn't updated yet
    await checkIn(resolvedStatus, resolvedNote, 'face', employee.id, lat, lng);
    resetFaceScanFlow();
    navigate('/');
  };

  if (showFaceScan) {
    return (
      <div className="login-page">
        <div className="login-card glass-card" style={{ maxWidth: 520 }}>
          <div className="login-header" style={{ marginBottom: 16 }}>
            <div className="login-icon">📸</div>
            <h1>สแกนหน้าเข้างาน</h1>
            <p>{faceScanStarted ? 'หันหน้าเข้ากล้องเพื่อเช็คอินอัตโนมัติ' : 'เลือกรูปแบบการทำงานและระบุหมายเหตุก่อนเริ่มสแกน'}</p>
          </div>

          {!faceScanStarted ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { type: 'wfh', icon: '🏠', label: 'WFH', desc: 'ทำงานที่บ้าน' },
                  { type: 'office', icon: '🏢', label: 'Office', desc: 'ทำงานที่ออฟฟิศ' },
                  { type: 'other', icon: '📝', label: 'อื่นๆ', desc: 'ระบุหมายเหตุ' },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => { setFaceStatus(opt.type); setFaceScanError(''); }}
                    style={{
                      padding: '16px 12px', borderRadius: 'var(--radius-md)',
                      border: faceStatus === opt.type ? '2px solid var(--primary)' : '2px solid var(--border)',
                      background: faceStatus === opt.type ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: faceStatus === opt.type ? 'var(--primary-light)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 20, textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  หมายเหตุ {faceStatus === 'other' ? '(บังคับ)' : '(ไม่บังคับ)'}
                </label>
                <textarea 
                  className="form-input" 
                  placeholder={faceStatus === 'other' ? 'เช่น ประชุมนอกสถานที่, ไซต์ลูกค้า, ลากิจ...' : 'เช่น ทำงานที่บ้านลูกค้า, ประชุมข้างนอก...'} 
                  value={faceNote} 
                  onChange={(e) => { setFaceNote(e.target.value); setFaceScanError(''); }} 
                  rows={2} 
                  style={{ width: '100%', resize: 'none' }} 
                />
              </div>

              {faceScanError && (
                <div className="form-error" style={{ marginBottom: 16 }}>
                  <AlertCircle size={14} /> {faceScanError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-full btn-lg"
                  onClick={handleStartFaceScan}
                >
                  <ScanFace size={20} />
                  เริ่มสแกนหน้า
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-full btn-lg"
                  onClick={resetFaceScanFlow}
                >
                  ยกเลิก
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 13 }}>
                ประเภทงาน: <strong>{faceStatus === 'wfh' ? 'WFH' : faceStatus === 'office' ? 'Office' : 'อื่นๆ'}</strong>
                {faceNote.trim() ? ` • หมายเหตุ: ${faceNote.trim()}` : ''}
              </div>
              <FaceScanner
                mode="login"
                onSuccess={handleFaceLoginSuccess}
                onCancel={() => setFaceScanStarted(false)}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card glass-card">
        <div className="login-header">
          <img src="/logo.png" alt="Company Logo" style={{ height: 64, width: 'auto', marginBottom: 16, objectFit: 'contain' }} />
          <h1>{isRegister ? (isEmptySystem ? '🛡️ ตั้งค่าผู้ดูแลระบบ' : 'สร้างบัญชีใหม่') : 'เข้าสู่ระบบ'}</h1>
          <p>
            {isRegister
              ? isEmptySystem
                ? 'ลงทะเบียนเป็นผู้ดูแลระบบคนแรก (Admin)'
                : 'ลงทะเบียนเพื่อเริ่มใช้งาน WFH Check-in'
              : 'ยินดีต้อนรับกลับ! เข้าสู่ระบบด้วยรหัสพนักงาน'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label>ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {isEmptySystem ? (
                <>
                  <div className="form-group">
                    <label>ชื่อสาขา (สร้างใหม่)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น สำนักงานใหญ่"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>ชื่อแผนก (สร้างใหม่)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น Engineering, HR"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>สาขา</label>
                    <select
                      className="form-select"
                      value={branchId}
                      onChange={(e) => {
                        setBranchId(e.target.value);
                        setDepartmentId('');
                      }}
                    >
                      <option value="">เลือกสาขา</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>แผนก</label>
                    <select
                      className="form-select"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      disabled={!branchId}
                    >
                      <option value="">{branchId ? 'เลือกแผนก' : 'เลือกสาขาก่อน'}</option>
                      {availableDepartments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label>รหัสพนักงาน</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น EMP001, ADMIN01"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group">
            <label>PIN Code</label>
            <input
              type="password"
              className="form-input"
              placeholder="กรอก PIN 4-6 หลัก"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              maxLength={6}
            />
          </div>

          {error && (
            <div className="form-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 8 }}
            disabled={isLoading}
          >
            {isLoading ? 'กำลังโหลด...' : isRegister ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        {!isRegister && (
          <button
            className="btn btn-ghost btn-full btn-lg"
            style={{ marginTop: 12 }}
            onClick={handleOpenFaceScan}
          >
            <ScanFace size={20} />
            สแกนหน้าเข้างาน
          </button>
        )}

        <div className="login-toggle">
          {isRegister ? 'มีบัญชีแล้ว?' : 'ยังไม่มีบัญชี?'}{' '}
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'เข้าสู่ระบบ' : 'สร้างบัญชีใหม่'}
          </button>
        </div>

      </div>
    </div>
  );
}
