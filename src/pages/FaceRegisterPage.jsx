import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import FaceScanner from '../components/FaceScanner';
import { CheckCircle2, ScanFace, Trash2 } from 'lucide-react';

export default function FaceRegisterPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*, branches(name), departments(name, branch_id, branches(name))')
      .order('employee_code');
    if (data) setEmployees(data);
  };

  const handleRegisterFace = async (descriptor) => {
    if (!selectedEmp) return;

    const { error } = await supabase
      .from('employees')
      .update({ face_descriptor: descriptor })
      .eq('id', selectedEmp.id);

    if (error) {
      setMessage('เกิดข้อผิดพลาด: ' + error.message);
    } else {
      setMessage(`ลงทะเบียนใบหน้าสำเร็จ — ${selectedEmp.name}`);
      setShowScanner(false);
      setSelectedEmp(null);
      loadEmployees();
    }
  };

  const handleRemoveFace = async (empId) => {
    const { error } = await supabase
      .from('employees')
      .update({ face_descriptor: null })
      .eq('id', empId);

    if (!error) {
      setMessage('ลบข้อมูลใบหน้าสำเร็จ');
      loadEmployees();
    }
  };

  if (showScanner && selectedEmp) {
    return (
      <div className="apple-dashboard-container">
        <header className="dashboard-header">
          <div className="greeting-text">
            <h1>ลงทะเบียนใบหน้า</h1>
            <p>กำลังลงทะเบียนให้ {selectedEmp.name} ({selectedEmp.employee_code})</p>
          </div>
        </header>
        <div className="ios-widget" style={{ padding: 32, maxWidth: 520, margin: '0 auto' }}>
          <FaceScanner
            mode="register"
            onSuccess={handleRegisterFace}
            onCancel={() => { setShowScanner(false); setSelectedEmp(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="apple-dashboard-container">
      <header className="dashboard-header">
        <div className="greeting-text">
          <h1>ลงทะเบียนใบหน้า</h1>
          <p>จัดการข้อมูลใบหน้าสำหรับเช็คอินอัตโนมัติ</p>
        </div>
      </header>

      {message && (
        <div style={{
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--success-bg)',
          color: 'var(--success)',
          fontWeight: 500,
          fontSize: 14,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CheckCircle2 size={16} />
          {message}
        </div>
      )}

      <div className="admin-table-container ios-widget" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>พนักงาน</th>
              <th>รหัส</th>
              <th>สาขา</th>
              <th>แผนก</th>
              <th>สถานะหน้า</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="admin-user-cell">
                    <div className="admin-user-avatar" style={{ background: 'var(--primary-light-rgba)', color: 'var(--primary)' }}>
                      {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{emp.employee_code}</td>
                <td>{emp.branches?.name || emp.departments?.branches?.name || '--'}</td>
                <td>{emp.departments?.name || '--'}</td>
                <td>
                  <span
                    className={`admin-status-badge ${emp.face_descriptor ? 'office' : 'absent'}`}
                  >
                    <span className="admin-status-dot" />
                    {emp.face_descriptor ? 'ลงทะเบียนแล้ว' : 'ยังไม่ลงทะเบียน'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setSelectedEmp(emp); setShowScanner(true); setMessage(''); }}
                    >
                      <ScanFace size={14} />
                      {emp.face_descriptor ? 'ลงทะเบียนใหม่' : 'ลงทะเบียน'}
                    </button>
                    {emp.face_descriptor && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRemoveFace(emp.id)}
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
