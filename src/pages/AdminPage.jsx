import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { Search, Download, Loader2, MapPin, Plus, Edit2, Trash2, UserPlus } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useCheckIn } from '../contexts/CheckInContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
  const {
    currentUser,
    branches,
    departments: authDepartments,
    refreshCurrentUser,
    loadBranches: refreshAuthBranches,
    loadDepartments: refreshAuthDepartments,
  } = useAuth();
  const { getAllTodayCheckIns, allEmployees, loadEmployees } = useCheckIn();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [dbBranches, setDbBranches] = useState([]);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState({ name: '' });
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', branch_id: '' });
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({ employee_code: '', branch_id: '', department_id: '', role: 'employee' });
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [showInlineDeptForm, setShowInlineDeptForm] = useState(false);
  const [inlineDeptName, setInlineDeptName] = useState('');
  const [isAddingInlineDept, setIsAddingInlineDept] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [hideUnusedDepts, setHideUnusedDepts] = useState(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState({ name: '', employee_code: '', pin_code: '', branch_id: '', department_id: '', role: 'employee' });
  const [isSavingNewEmployee, setIsSavingNewEmployee] = useState(false);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const isAdmin = currentUser?.role === 'admin';

  const loadBranches = async () => {
    const { data, error } = await supabase.from('branches').select('*').order('created_at');
    if (error) {
      console.error('[AdminPage] loadBranches error:', error);
      setLoadError('โหลดสาขาไม่ได้: ' + error.message + ' (ตรวจสอบว่ารัน SQL schema แล้ว และ RLS policy ถูกสร้างใน Supabase)');
    } else {
      setLoadError(null);
    }
    if (data) setDbBranches(data);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*, branches(name)').order('created_at');
    if (error) console.error('[AdminPage] loadDepartments error:', error);
    else console.log('[AdminPage] loadDepartments:', data?.length, 'departments loaded');
    if (data) setDbDepartments(data);
  };

  const closeBranchModal = () => {
    setShowBranchModal(false);
    setEditingBranch(null);
    setBranchForm({ name: '' });
  };

  const closeDepartmentModal = () => {
    setShowDeptModal(false);
    setEditingDept(null);
    setDeptForm({ name: '', branch_id: '' });
  };

  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
    setEmployeeForm({ employee_code: '', branch_id: '', department_id: '', role: 'employee' });
    setShowInlineDeptForm(false);
    setInlineDeptName('');
  };

  const openEmployeeModal = async (employee) => {
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่แก้ไขรหัสพนักงาน สาขา และแผนกได้');
      return;
    }

    if (dbBranches.length === 0) {
      await loadBranches();
    }

    if (dbDepartments.length === 0) {
      await loadDepartments();
    }

    setEditingEmployee(employee);
    setEmployeeForm({
      employee_code: employee.employee_code || '',
      branch_id: employee.branch_id || employee.departments?.branch_id || '',
      department_id: employee.department_id || '',
      role: employee.role || 'employee',
    });
    setShowEmployeeModal(true);
  };

  useEffect(() => {
    loadBranches();
    loadDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'departments') {
      loadBranches();
      loadDepartments();
    }
  }, [activeTab]);

  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่เพิ่มหรือแก้ไขสาขาได้');
      return;
    }
    if (!branchForm.name.trim()) return;

    setIsSavingBranch(true);
    try {
      const payload = { name: branchForm.name.trim() };
      const query = editingBranch
        ? supabase.from('branches').update(payload).eq('id', editingBranch.id)
        : supabase.from('branches').insert([payload]);
      const { error } = await query;

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      closeBranchModal();
      await loadBranches();
      await refreshAuthBranches();
      await loadDepartments();
      await refreshAuthDepartments();
      await loadEmployees();
      await refreshCurrentUser();
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่ลบสาขาได้');
      return;
    }

    const confirmMsg = 'คุณต้องการลบสาขานี้ใช่หรือไม่?\n*คำเตือน: หากมีแผนกหรือพนักงานในสาขานี้อยู่ อาจลบไม่สำเร็จ*';
    if (!window.confirm(confirmMsg)) return;

    const { error } = await supabase.from('branches').delete().eq('id', id);

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
      return;
    }

    await loadBranches();
    await refreshAuthBranches();
    await loadDepartments();
    await refreshAuthDepartments();
    await loadEmployees();
    await refreshCurrentUser();
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่เพิ่มหรือแก้ไขแผนกได้');
      return;
    }
    if (!deptForm.name.trim() || !deptForm.branch_id) {
      alert('กรุณากรอกชื่อแผนกและเลือกสาขา');
      return;
    }

    setIsSavingDept(true);
    try {
      const payload = { name: deptForm.name.trim(), branch_id: deptForm.branch_id };
      const query = editingDept
        ? supabase.from('departments').update(payload).eq('id', editingDept.id)
        : supabase.from('departments').insert([payload]);
      const { error } = await query;

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      closeDepartmentModal();
      await loadDepartments();
      await refreshAuthDepartments();
      await loadEmployees();
      await refreshCurrentUser();
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่ลบแผนกได้');
      return;
    }

    const confirmMsg = 'คุณต้องการลบแผนกนี้ใช่หรือไม่?\n*คำเตือน: หากมีพนักงานใช้แผนกนี้อยู่ อาจทำให้เกิดปัญหาข้อมูลได้*';
    if (!window.confirm(confirmMsg)) return;

    const { error } = await supabase.from('departments').delete().eq('id', id);

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
      return;
    }

    await loadDepartments();
    await refreshAuthDepartments();
    await loadEmployees();
    await refreshCurrentUser();
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่แก้ไขรหัสพนักงาน สาขา และแผนกได้');
      return;
    }
    if (!editingEmployee) return;

    const employeeCode = employeeForm.employee_code.trim().toUpperCase();
    const branchId = employeeForm.branch_id;
    const departmentId = employeeForm.department_id;
    const selectedDepartment = dbDepartments.find((dept) => dept.id === departmentId);

    if (!employeeCode || !branchId || !departmentId) {
      alert('กรุณากรอกรหัสพนักงาน เลือกสาขา และเลือกแผนก');
      return;
    }

    if (!selectedDepartment || selectedDepartment.branch_id !== branchId) {
      alert('กรุณาเลือกแผนกที่ตรงกับสาขา');
      return;
    }

    setIsSavingEmployee(true);
    try {
      const { data: duplicateEmployees, error: duplicateError } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employeeCode)
        .neq('id', editingEmployee.id)
        .limit(1);

      if (duplicateError) {
        alert('เกิดข้อผิดพลาด: ' + duplicateError.message);
        return;
      }

      if (duplicateEmployees?.length) {
        alert('รหัสพนักงานนี้มีอยู่แล้ว');
        return;
      }

      const { error } = await supabase
        .from('employees')
        .update({ 
          employee_code: employeeCode, 
          branch_id: branchId, 
          department_id: departmentId,
          role: employeeForm.role
        })
        .eq('id', editingEmployee.id);

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      closeEmployeeModal();
      await loadEmployees();
      if (currentUser?.id === editingEmployee.id) {
        await refreshCurrentUser(editingEmployee.id);
      }
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const handleCreateDepartmentFromEmployee = async () => {
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่เพิ่มแผนกใหม่ได้');
      return;
    }

    if (!employeeForm.branch_id) {
      alert('กรุณาเลือกสาขาก่อนเพิ่มแผนกใหม่');
      return;
    }

    const deptName = inlineDeptName.trim();
    if (!deptName) {
      alert('กรุณากรอกชื่อแผนกใหม่');
      return;
    }

    const existingDept = dbDepartments.find(
      (dept) => dept.branch_id === employeeForm.branch_id && dept.name.trim().toLowerCase() === deptName.toLowerCase()
    );

    if (existingDept) {
      setEmployeeForm((prev) => ({ ...prev, department_id: existingDept.id }));
      setShowInlineDeptForm(false);
      setInlineDeptName('');
      return;
    }

    setIsAddingInlineDept(true);
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert([{ name: deptName, branch_id: employeeForm.branch_id }])
        .select('*, branches(name)')
        .single();

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      await loadDepartments();
      await refreshAuthDepartments();
      setEmployeeForm((prev) => ({ ...prev, department_id: data.id }));
      setShowInlineDeptForm(false);
      setInlineDeptName('');
    } finally {
      setIsAddingInlineDept(false);
    }
  };

  const closeAddEmployeeModal = () => {
    setShowAddEmployeeModal(false);
    setAddEmployeeForm({ name: '', employee_code: '', pin_code: '', branch_id: '', department_id: '', role: 'employee' });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('เฉพาะ admin เท่านั้นที่เพิ่มพนักงานได้');
      return;
    }

    const { name, employee_code, pin_code, branch_id, department_id, role } = addEmployeeForm;
    if (!name.trim() || !employee_code.trim() || !pin_code || !branch_id || !department_id) {
      alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (pin_code.length < 4) {
      alert('PIN ต้องมีอย่างน้อย 4 หลัก');
      return;
    }

    setIsSavingNewEmployee(true);
    try {
      // Check duplicate
      const { data: dup } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employee_code.trim().toUpperCase())
        .limit(1);
      if (dup?.length) {
        alert('รหัสพนักงานนี้มีอยู่แล้ว');
        return;
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPin = bcrypt.hashSync(pin_code, salt);

      const { error } = await supabase.from('employees').insert({
        name: name.trim(),
        employee_code: employee_code.trim().toUpperCase(),
        pin_code: hashedPin,
        branch_id,
        department_id,
        role,
      });

      if (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
        return;
      }

      closeAddEmployeeModal();
      await loadEmployees();
    } finally {
      setIsSavingNewEmployee(false);
    }
  };

  const branchOptions = dbBranches.length > 0 ? dbBranches : branches;
  const departmentOptions = dbDepartments.length > 0 ? dbDepartments : authDepartments;

  const departmentsForSelectedBranch = useMemo(
    () => departmentOptions.filter((dept) => dept.branch_id === employeeForm.branch_id),
    [departmentOptions, employeeForm.branch_id]
  );

  const departmentsForFilter = useMemo(
    () => filterBranch === 'all' ? departmentOptions : departmentOptions.filter((dept) => dept.branch_id === filterBranch),
    [departmentOptions, filterBranch]
  );

  const todayCheckIns = getAllTodayCheckIns();

  const departments = useMemo(() => {
    return departmentOptions.map((dept) => ({
      id: dept.id,
      name: dept.name,
      branchName: dept.branches?.name || '',
    }));
  }, [departmentOptions]);

  const employeesWithStatus = useMemo(() => {
    return allEmployees.map((emp) => {
      const checkIn = todayCheckIns.find((c) => c.employee_id === emp.id);
      return {
        ...emp,
        checkIn,
        branchName: emp.branches?.name || emp.departments?.branches?.name || 'Unknown',
        departmentName: emp.departments?.name || 'Unknown',
        status: checkIn ? checkIn.status : 'absent',
      };
    });
  }, [allEmployees, todayCheckIns]);

  const { checkIns: allCheckInsData } = useCheckIn();

  const filtered = useMemo(() => {
    // If range is only today, show all employees (including absent) 
    // to maintain the "Daily Report" behavior.
    if (startDate === today && endDate === today) {
      return employeesWithStatus.filter((emp) => {
        const matchSearch =
          (emp.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (emp.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchBranch = filterBranch === 'all' || emp.branch_id === filterBranch;
        const matchStatus = filterStatus === 'all' || emp.status === filterStatus;
        const matchDept = filterDept === 'all' || emp.department_id === filterDept;
        return matchSearch && matchBranch && matchStatus && matchDept;
      });
    }

    // Otherwise, show only actual check-in records in the date range.
    return allCheckInsData
      .filter((ci) => ci.date >= startDate && ci.date <= endDate)
      .map((ci) => {
        const emp = allEmployees.find((e) => e.id === ci.employee_id);
        const branchName = emp?.branches?.name || emp?.departments?.branches?.name || 'Unknown';
        const departmentName = emp?.departments?.name || 'Unknown';
        return {
          ...emp,
          id: `${ci.id}-${ci.employee_id}`, // Unique ID for table rows
          checkIn: ci,
          branchName,
          departmentName,
          status: ci.status,
          date: ci.date,
        };
      })
      .filter((record) => {
        const matchSearch =
          (record.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (record.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchBranch = filterBranch === 'all' || record.branch_id === filterBranch;
        const matchStatus = filterStatus === 'all' || record.status === filterStatus;
        const matchDept = filterDept === 'all' || record.department_id === filterDept;
        return matchSearch && matchBranch && matchStatus && matchDept;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [startDate, endDate, today, employeesWithStatus, allCheckInsData, searchQuery, filterBranch, filterStatus, filterDept, allEmployees]);

  const stats = useMemo(() => {
    const dataForStats = (startDate === today && endDate === today) ? employeesWithStatus : filtered;
    
    let totalMinutes = 0;
    dataForStats.forEach(record => {
      if (record.checkIn?.check_in_time && record.checkIn?.check_out_time) {
        const [inH, inM] = record.checkIn.check_in_time.split(':').map(Number);
        const [outH, outM] = record.checkIn.check_out_time.split(':').map(Number);
        const diff = (outH * 60 + outM) - (inH * 60 + inM);
        if (diff > 0) totalMinutes += diff;
      }
    });

    return {
      wfh: dataForStats.filter((e) => e.status === 'wfh').length,
      office: dataForStats.filter((e) => e.status === 'office').length,
      leave: dataForStats.filter((e) => e.status === 'leave').length,
      absent: (startDate === today && endDate === today) ? dataForStats.filter((e) => e.status === 'absent').length : 0,
      totalHours: `${Math.floor(totalMinutes / 60)} ชม. ${totalMinutes % 60} น.`,
    };
  }, [startDate, endDate, today, employeesWithStatus, filtered]);

  const { wfh: wfhCount, office: officeCount, leave: leaveCount, absent: absentCount, totalHours } = stats;

  const statusLabels = { wfh: 'WFH', office: 'Office', leave: 'Leave', absent: 'ยังไม่เช็คอิน' };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const diff = (outH * 60 + outM) - (inH * 60 + inM);
    if (diff < 0) return '--';
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h} ชม. ${m} น.`;
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase
        .select(`
          *,
          employees (
            name,
            employee_code,
            branches (name),
            departments (name, branch_id, branches(name))
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (error) throw error;

      let csv = 'วันที่,รหัสพนักงาน,ชื่อ-นามสกุล,สาขา,แผนก,สถานะ,เวลาเช็คอิน,เวลาเช็คเอาท์,ระยะเวลา,วิธีเช็คอิน,Latitude,Longitude,หมายเหตุ\n';

      data.forEach(row => {
        const emp = row.employees || {};
        const branchName = emp.branches?.name || emp.departments?.branches?.name || '';
        const deptName = emp.departments?.name || '';
        const statusLabel = statusLabels[row.status] || row.status;
        const method = row.verified_by === 'face' ? 'Face' : 'PIN';
        const duration = calculateDuration(row.check_in_time, row.check_out_time);
        
        const escapeCSV = (str) => {
          if (str === null || str === undefined) return '';
          const s = String(str).replace(/"/g, '""');
          return `"${s}"`;
        };

        csv += [
          escapeCSV(row.date),
          escapeCSV(emp.employee_code),
          escapeCSV(emp.name),
          escapeCSV(branchName),
          escapeCSV(deptName),
          escapeCSV(statusLabel),
          escapeCSV(row.check_in_time),
          escapeCSV(row.check_out_time || ''),
          escapeCSV(duration),
          escapeCSV(method),
          escapeCSV(row.latitude || ''),
          escapeCSV(row.longitude || ''),
          escapeCSV(row.note || '')
        ].join(',') + '\n';
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `wfh_report_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูล');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="apple-dashboard-container">
      <header className="dashboard-header">
        <div className="greeting-text">
          <h1>จัดการพนักงาน</h1>
          <p>ภาพรวมสถานะการทำงานของพนักงานทั้งหมด • {format(new Date(), 'd MMMM yyyy', { locale: th })}</p>
        </div>
      </header>

      <div className="dashboard-stats" style={{ marginBottom: 32 }}>
        <div className="ios-widget"><div className="widget-value" style={{color:'var(--primary)'}}>{wfhCount}</div><div className="widget-label">🏠 WFH</div></div>
        <div className="ios-widget"><div className="widget-value" style={{color:'var(--success)'}}>{officeCount}</div><div className="widget-label">🏢 Office</div></div>
        <div className="ios-widget"><div className="widget-value" style={{color:'var(--warning)'}}>{leaveCount}</div><div className="widget-label">🌴 Leave</div></div>
        <div className="ios-widget"><div className="widget-value" style={{color:'var(--info)'}}>{totalHours}</div><div className="widget-label">⏱️ เวลารวมทั้งหมด</div></div>
        {(startDate === today && endDate === today) && (
          <div className="ios-widget"><div className="widget-value" style={{color:'var(--danger)'}}>{absentCount}</div><div className="widget-label">❌ ยังไม่เช็คอิน</div></div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, background: 'var(--bg-tertiary)', padding: 6, borderRadius: 'var(--radius-full)', maxWidth: 400, margin: '0 0 24px' }}>
        <button
          style={{ flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: 'none', background: activeTab === 'report' ? 'var(--bg-secondary)' : 'transparent', fontWeight: 600, fontSize: 14, color: activeTab === 'report' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'report' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          onClick={() => setActiveTab('report')}
        >
          รายงานประจำวัน
        </button>
        <button
          style={{ flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: 'none', background: activeTab === 'departments' ? 'var(--bg-secondary)' : 'transparent', fontWeight: 600, fontSize: 14, color: activeTab === 'departments' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: activeTab === 'departments' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
          onClick={() => setActiveTab('departments')}
        >
          จัดการสาขา/แผนก
        </button>
      </div>

      {activeTab === 'report' ? (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>
                รายงานสรุปการลงเวลา
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                * หมายเหตุ: แสดงข้อมูลการลงเวลาของพนักงานทั้งหมด สามารถส่งออกเป็นไฟล์ CSV ได้เพื่อนำไปประมวลผลต่อ
              </p>
            </div>
            {isAdmin && (
              <button 
                className="btn btn-primary" 
                onClick={() => { 
                  if (dbBranches.length === 0) loadBranches();
                  if (dbDepartments.length === 0) loadDepartments();
                  setShowAddEmployeeModal(true); 
                }}
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px' }}
              >
                <UserPlus size={16} /> เพิ่มพนักงาน
              </button>
            )}
          </div>

          <div className="admin-controls ios-widget" style={{ flexDirection: 'row', alignItems: 'center', padding: '16px 24px', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>ตั้งแต่วันที่:</span>
                <input 
                  type="date" 
                  className="form-input" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  style={{ width: 'auto', background: 'var(--bg-primary)', padding: '8px 12px' }} 
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>ถึงวันที่:</span>
                <input 
                  type="date" 
                  className="form-input" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  style={{ width: 'auto', background: 'var(--bg-primary)', padding: '8px 12px' }} 
                />
              </div>
            </div>

            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="ค้นหาชื่อพนักงาน..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 40, width: '100%', background: 'var(--bg-primary)' }} />
            </div>
            <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 'auto', background: 'var(--bg-primary)' }}>
              <option value="all">ทุกสถานะ</option>
              <option value="wfh">Work From Home</option>
              <option value="office">Office</option>
              <option value="leave">Leave</option>
              <option value="absent">ยังไม่เช็คอิน</option>
            </select>
            <select className="form-select" value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setFilterDept('all'); }} style={{ width: 'auto', background: 'var(--bg-primary)' }}>
              <option value="all">ทุกสาขา</option>
              {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <select className="form-select" value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ width: 'auto', background: 'var(--bg-primary)' }}>
              <option value="all">ทุกแผนก</option>
              {departmentsForFilter.map((d) => <option key={d.id} value={d.id}>{d.name}{d.branches?.name ? ` (${d.branches.name})` : ''}</option>)}
            </select>
            <button 
              className="btn btn-primary" 
              onClick={handleExportCSV} 
              disabled={isExporting}
              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px' }}
            >
              {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {isExporting ? 'กำลังโหลด...' : 'Export CSV'}
            </button>
          </div>

          <div className="admin-table-container ios-widget" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>พนักงาน</th>
                  <th>รหัส</th>
                  <th>วันที่</th>
                  <th>สาขา</th>
                  <th>แผนก</th>
                  <th>สถานะ</th>
                  <th>เช็คอิน</th>
                  <th>เช็คเอาท์</th>
                  <th>ระยะเวลา</th>
                  <th>วิธี</th>
                  <th>หมายเหตุ</th>
                  <th style={{ width: 140, textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td className="wrap" style={{ minWidth: 160 }}>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar" style={{ background: 'var(--primary-light-rgba)', color: 'var(--primary)' }}>
                          {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{emp.name}</div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{emp.employee_code}</td>
                    <td style={{ fontSize: 13 }}>{emp.date ? format(new Date(emp.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</td>
                    <td>{emp.branchName}</td>
                    <td>{emp.departmentName}</td>
                    <td>
                      <span className={`admin-status-badge ${emp.status}`}>
                        <span className="admin-status-dot" />{statusLabels[emp.status]}
                      </span>
                    </td>
                    <td>{emp.checkIn?.check_in_time?.substring(0, 5) || '--'}</td>
                    <td>{emp.checkIn?.check_out_time?.substring(0, 5) || '--'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{calculateDuration(emp.checkIn?.check_in_time, emp.checkIn?.check_out_time)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {emp.checkIn ? (emp.checkIn.verified_by === 'face' ? '📸' : '🔑') : '--'}
                        {emp.checkIn?.latitude && emp.checkIn?.longitude && (
                          <a 
                            href={`https://maps.google.com/?q=${emp.checkIn.latitude},${emp.checkIn.longitude}`}
                            target="_blank" 
                            rel="noreferrer"
                            title="ดูแผนที่"
                            style={{ color: 'var(--primary)', display: 'inline-flex', padding: 4, background: 'var(--primary-light-rgba)', borderRadius: 'var(--radius-sm)' }}
                          >
                            <MapPin size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="wrap" style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.3, minWidth: 200, maxWidth: 300 }}>{emp.checkIn?.note || '--'}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEmployeeModal(emp)} disabled={!isAdmin}>
                          <Edit2 size={16} /> แก้ไข
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>ไม่พบพนักงานที่ตรงกับเงื่อนไข</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="departments-view">
          <div style={{ marginBottom: 32 }}>
            {loadError && (
            <div style={{ padding: 16, marginBottom: 16, background: '#fee2e2', color: '#dc2626', borderRadius: 12, fontSize: 14, fontWeight: 500 }}>
              ⚠️ {loadError}
            </div>
          )}
          {!isAdmin && (
            <div style={{ padding: 16, marginBottom: 16, background: '#fef3c7', color: '#d97706', borderRadius: 12, fontSize: 14, fontWeight: 500 }}>
              ⚠️ คุณไม่ได้เข้าสู่ระบบในฐานะ Admin — ปุ่มเพิ่ม/แก้ไข/ลบจะถูกปิดการใช้งาน (ล็อกอินด้วย ADMIN01 / PIN 123456)
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>สาขาทั้งหมด</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>จัดการสาขาในบริษัท ({dbBranches.length} สาขา)</p>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => { setEditingBranch(null); setBranchForm({ name: '' }); setShowBranchModal(true); }}
                disabled={!isAdmin}
                style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Plus size={18} /> เพิ่มสาขา
              </button>
            </div>

            <div className="admin-table-container ios-widget" style={{ padding: 0, overflowX: 'auto', marginBottom: 24 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ชื่อสาขา</th>
                    <th style={{ width: 140, textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {dbBranches.map((branch) => (
                    <tr key={branch.id}>
                      <td style={{ fontWeight: 600 }}>{branch.name}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => { setEditingBranch(branch); setBranchForm({ name: branch.name }); setShowBranchModal(true); }}
                            disabled={!isAdmin}
                          >
                            <Edit2 size={16} /> แก้ไข
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => handleDeleteBranch(branch.id)}
                            disabled={!isAdmin}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={16} /> ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {dbBranches.length === 0 && (
                    <tr><td colSpan={2} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>ยังไม่มีสาขา</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>แผนกทั้งหมด</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>จัดการชื่อแผนกที่มีในบริษัท ({dbDepartments.length} แผนก)</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 8 }}>
                  <input 
                    type="checkbox" 
                    checked={hideUnusedDepts} 
                    onChange={(e) => setHideUnusedDepts(e.target.checked)}
                  />
                  ซ่อนแผนกที่ไม่มีพนักงาน
                </label>
              </div>
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => { setEditingDept(null); setDeptForm({ name: '', branch_id: '' }); setShowDeptModal(true); }}
              disabled={!isAdmin}
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={18} /> เพิ่มแผนก
            </button>
          </div>

          <div className="admin-table-container ios-widget" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>สาขา</th>
                  <th>ชื่อแผนก</th>
                  <th>จำนวนพนักงาน</th>
                  <th style={{ width: 140, textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {dbDepartments
                  .filter(dept => !hideUnusedDepts || allEmployees.some(e => e.department_id === dept.id))
                  .map((dept) => {
                    const empCount = allEmployees.filter(e => e.department_id === dept.id).length;
                    return (
                      <tr key={dept.id}>
                        <td>{dept.branches?.name || '--'}</td>
                        <td style={{ fontWeight: 600 }}>{dept.name}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ 
                            background: empCount > 0 ? 'var(--success-bg)' : 'var(--bg-secondary)', 
                            color: empCount > 0 ? 'var(--success)' : 'var(--text-muted)',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600
                          }}>
                            {empCount} คน
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, branch_id: dept.branch_id || '' }); setShowDeptModal(true); }}
                              disabled={!isAdmin}
                            >
                              <Edit2 size={16} /> แก้ไข
                            </button>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              onClick={() => handleDeleteDepartment(dept.id)}
                              disabled={!isAdmin}
                              style={{ color: 'var(--danger)' }}
                            >
                              <Trash2 size={16} /> ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {dbDepartments.filter(dept => !hideUnusedDepts || allEmployees.some(e => e.department_id === dept.id)).length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>ไม่พบแผนกที่ตรงกับเงื่อนไข</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showEmployeeModal && editingEmployee && (
        <div className="history-modal-overlay" onClick={closeEmployeeModal}>
          <div className="history-modal" style={{ maxWidth: 440, padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>แก้ไขข้อมูลพนักงาน</h3>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>ชื่อพนักงาน</label>
                <input type="text" className="form-input" value={editingEmployee.name || ''} disabled />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>รหัสพนักงาน</label>
                <input
                  type="text"
                  className="form-input"
                  value={employeeForm.employee_code}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, employee_code: e.target.value.toUpperCase() }))}
                  style={{ textTransform: 'uppercase' }}
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>สาขา</label>
                <select
                  className="form-select"
                  value={employeeForm.branch_id}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, branch_id: e.target.value, department_id: '' }))}
                  required
                >
                  <option value="">เลือกสาขา</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', display: 'block' }}>แผนก</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowInlineDeptForm((prev) => !prev)}
                    disabled={!isAdmin || isAddingInlineDept}
                  >
                    <Plus size={14} /> เพิ่มแผนกใหม่
                  </button>
                </div>
                <select
                  className="form-select"
                  value={employeeForm.department_id}
                  onChange={(e) => setEmployeeForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  disabled={!employeeForm.branch_id}
                  required
                >
                  <option value="">{employeeForm.branch_id ? 'เลือกแผนก' : 'เลือกสาขาก่อน'}</option>
                  {departmentsForSelectedBranch.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {showInlineDeptForm && (
                  <div className="ios-widget" style={{ padding: 16, marginTop: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      เพิ่มแผนกใหม่
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={inlineDeptName}
                        onChange={(e) => setInlineDeptName(e.target.value)}
                        placeholder="กรอกชื่อแผนกใหม่"
                        disabled={isAddingInlineDept}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleCreateDepartmentFromEmployee}
                        disabled={!isAdmin || !inlineDeptName.trim() || isAddingInlineDept}
                      >
                        {isAddingInlineDept ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ marginTop: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>สิทธิ์การใช้งาน</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="employee" 
                      checked={employeeForm.role === 'employee'} 
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                    />
                    พนักงานทั่วไป (User)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="admin" 
                      checked={employeeForm.role === 'admin'} 
                      onChange={(e) => setEmployeeForm(prev => ({ ...prev, role: e.target.value }))}
                    />
                    ผู้ดูแลระบบ (Admin)
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button type="button" className="btn btn-ghost btn-full" onClick={closeEmployeeModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={isSavingEmployee || !employeeForm.employee_code.trim() || !employeeForm.branch_id || !employeeForm.department_id || !isAdmin}>
                  {isSavingEmployee ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeptModal && (
        <div className="history-modal-overlay" onClick={closeDepartmentModal}>
          <div className="history-modal" style={{ maxWidth: 400, padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{editingDept ? 'แก้ไขแผนก' : 'เพิ่มแผนกใหม่'}</h3>
            </div>
            <form onSubmit={handleSaveDepartment}>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>สาขา</label>
                <select
                  className="form-select"
                  value={deptForm.branch_id}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, branch_id: e.target.value }))}
                  required
                >
                  <option value="">เลือกสาขา</option>
                  {branchOptions.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>ชื่อแผนก</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="เช่น ฝ่ายขาย, ฝ่ายไอที..."
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button type="button" className="btn btn-ghost btn-full" onClick={closeDepartmentModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={isSavingDept || !deptForm.name.trim() || !deptForm.branch_id || !isAdmin}>
                  {isSavingDept ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBranchModal && (
        <div className="history-modal-overlay" onClick={closeBranchModal}>
          <div className="history-modal" style={{ maxWidth: 400, padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>{editingBranch ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}</h3>
            </div>
            <form onSubmit={handleSaveBranch}>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>ชื่อสาขา</label>
                <input
                  type="text"
                  className="form-input"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ name: e.target.value })}
                  placeholder="เช่น สำนักงานใหญ่, สาขาบางนา..."
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button type="button" className="btn btn-ghost btn-full" onClick={closeBranchModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={isSavingBranch || !branchForm.name.trim() || !isAdmin}>
                  {isSavingBranch ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddEmployeeModal && (
        <div className="history-modal-overlay" onClick={closeAddEmployeeModal}>
          <div className="history-modal" style={{ maxWidth: 480, padding: 32 }} onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700 }}>เพิ่มพนักงานใหม่</h3>
            </div>
            <form onSubmit={handleAddEmployee}>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>ชื่อ-นามสกุล</label>
                <input
                  type="text"
                  className="form-input"
                  value={addEmployeeForm.name}
                  onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="กรอกชื่อ-นามสกุล"
                  autoFocus
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>รหัสพนักงาน</label>
                <input
                  type="text"
                  className="form-input"
                  value={addEmployeeForm.employee_code}
                  onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, employee_code: e.target.value.toUpperCase() }))}
                  placeholder="เช่น EMP001"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>PIN Code</label>
                <input
                  type="password"
                  className="form-input"
                  value={addEmployeeForm.pin_code}
                  onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, pin_code: e.target.value }))}
                  placeholder="กรอก PIN 4-6 หลัก"
                  maxLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>สาขา</label>
                <select
                  className="form-select"
                  value={addEmployeeForm.branch_id}
                  onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, branch_id: e.target.value, department_id: '' }))}
                  required
                >
                  <option value="">เลือกสาขา</option>
                  {branchOptions.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>แผนก</label>
                <select
                  className="form-select"
                  value={addEmployeeForm.department_id}
                  onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  disabled={!addEmployeeForm.branch_id}
                  required
                >
                  <option value="">{addEmployeeForm.branch_id ? 'เลือกแผนก' : 'เลือกสาขาก่อน'}</option>
                  {departmentOptions.filter((d) => d.branch_id === addEmployeeForm.branch_id).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>สิทธิ์การใช้งาน</label>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="radio"
                      name="addRole"
                      value="employee"
                      checked={addEmployeeForm.role === 'employee'}
                      onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, role: e.target.value }))}
                    />
                    พนักงานทั่วไป (User)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                    <input
                      type="radio"
                      name="addRole"
                      value="admin"
                      checked={addEmployeeForm.role === 'admin'}
                      onChange={(e) => setAddEmployeeForm((prev) => ({ ...prev, role: e.target.value }))}
                    />
                    ผู้ดูแลระบบ (Admin)
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <button type="button" className="btn btn-ghost btn-full" onClick={closeAddEmployeeModal}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary btn-full" disabled={isSavingNewEmployee || !addEmployeeForm.name.trim() || !addEmployeeForm.employee_code.trim() || !addEmployeeForm.pin_code || !addEmployeeForm.branch_id || !addEmployeeForm.department_id}>
                  {isSavingNewEmployee ? 'กำลังบันทึก...' : 'เพิ่มพนักงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
