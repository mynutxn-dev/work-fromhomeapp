import { createContext, useContext, useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const savedUser = localStorage.getItem('wfh_currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('wfh_currentUser');
      }
    }
    setLoading(false);

    // Load departments
    loadBranches();
    loadDepartments();
  }, []);

  const loadBranches = async () => {
    const { data, error } = await supabase.from('branches').select('*').order('name');
    if (error) console.error('[AuthContext] loadBranches error:', error);
    if (data) setBranches(data);
  };

  const loadDepartments = async () => {
    const { data, error } = await supabase.from('departments').select('*, branches(name)').order('name');
    if (error) console.error('[AuthContext] loadDepartments error:', error);
    if (data) setDepartments(data);
  };

  const buildUserSession = (data) => ({
    id: data.id,
    employee_code: data.employee_code,
    name: data.name,
    branch_id: data.branch_id,
    branchName: data.branches?.name || data.branchName || data.departments?.branches?.name || '',
    department_id: data.department_id,
    departmentName: data.departments?.name || data.departmentName || '',
    role: data.role,
    avatar: data.avatar,
    face_descriptor: data.face_descriptor,
  });

  const persistCurrentUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('wfh_currentUser', JSON.stringify(user));
  };

  const refreshCurrentUser = async (userId = currentUser?.id) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('employees')
      .select('*, branches(name), departments(name, branch_id, branches(name))')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    const user = buildUserSession(data);
    persistCurrentUser(user);
    return user;
  };

  const login = async (employeeCode, pinCode) => {
    const { data, error } = await supabase
      .from('employees')
      .select('*, branches(name), departments(name, branch_id, branches(name))')
      .eq('employee_code', employeeCode.toUpperCase())
      .single();

    if (error || !data) {
      return { success: false, error: 'รหัสพนักงานหรือ PIN ไม่ถูกต้อง' };
    }

    // fallback for existing plaintext pins during transition
    const isValidPin = data.pin_code === pinCode || bcrypt.compareSync(pinCode, data.pin_code);
    
    if (!isValidPin) {
      return { success: false, error: 'รหัสพนักงานหรือ PIN ไม่ถูกต้อง' };
    }

    const user = buildUserSession(data);

    persistCurrentUser(user);
    return { success: true };
  };

  const loginByFace = async (matchedEmployee) => {
    const user = buildUserSession(matchedEmployee);

    persistCurrentUser(user);
    return { success: true };
  };

  const register = async (userData) => {
    // Check if employee_code exists
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('employee_code', userData.employee_code.toUpperCase())
      .single();

    if (existing) {
      return { success: false, error: 'รหัสพนักงานนี้มีอยู่แล้ว' };
    }

    // Check if this is the first employee (bootstrap admin)
    const { count } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    const isFirstUser = count === 0;

    const salt = bcrypt.genSaltSync(10);
    const hashedPin = bcrypt.hashSync(userData.pin_code, salt);

    const { data, error } = await supabase
      .from('employees')
      .insert({
        employee_code: userData.employee_code.toUpperCase(),
        name: userData.name,
        pin_code: hashedPin,
        branch_id: userData.branch_id,
        department_id: userData.department_id,
        role: isFirstUser ? 'admin' : 'employee',
        avatar: null,
      })
      .select('*, branches(name), departments(name, branch_id, branches(name))')
      .single();

    if (error) {
      return { success: false, error: 'เกิดข้อผิดพลาด: ' + error.message };
    }

    const user = buildUserSession(data);

    persistCurrentUser(user);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('wfh_currentUser');
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, branches, departments, login, loginByFace, register, logout, loading, loadBranches, loadDepartments, refreshCurrentUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
