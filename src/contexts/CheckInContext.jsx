import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const CheckInContext = createContext(null);

export function CheckInProvider({ children }) {
  const { currentUser } = useAuth();
  const [checkIns, setCheckIns] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);

  // Load check-ins on mount
  useEffect(() => {
    if (currentUser) {
      loadCheckIns();
      loadEmployees();
    }
  }, [currentUser]);

  const loadCheckIns = async () => {
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .order('date', { ascending: false });
    if (data) setCheckIns(data);
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('*, branches(name), departments(name, branch_id, branches(name))')
      .order('employee_code');
    if (data) setAllEmployees(data);
  };

  const getTodayCheckIn = useCallback(() => {
    if (!currentUser) return null;
    const today = format(new Date(), 'yyyy-MM-dd');
    return checkIns.find(
      (c) => c.employee_id === currentUser.id && c.date === today
    );
  }, [checkIns, currentUser]);

  const checkIn = useCallback(
    async (status = 'wfh', note = '', verifiedBy = 'pin', overrideEmployeeId = null, lat = null, lng = null) => {
      const empId = overrideEmployeeId || currentUser?.id;
      if (!empId) return;
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = format(new Date(), 'HH:mm:ss');

      const existing = checkIns.find(
        (c) => c.employee_id === empId && c.date === today
      );

      if (existing) {
        const { data } = await supabase
          .from('checkins')
          .update({

            status,
            note,
            verified_by: verifiedBy,
            ...(lat !== null && { latitude: lat }),
            ...(lng !== null && { longitude: lng })
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (data) {
          setCheckIns((prev) =>
            prev.map((c) => (c.id === existing.id ? data : c))
          );
        }
      } else {
        const { data } = await supabase
          .from('checkins')
          .insert({
            employee_id: empId,
            date: today,
            check_in_time: now,
            status,
            note,
            verified_by: verifiedBy,
            latitude: lat,
            longitude: lng
          })
          .select()
          .single();

        if (data) {
          setCheckIns((prev) => [data, ...prev]);
        }
      }
    },
    [checkIns, currentUser]
  );

  const checkOut = useCallback(async (overrideEmployeeId = null) => {
    const empId = overrideEmployeeId || currentUser?.id;
    if (!empId) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm:ss');

    const todayEntry = checkIns.find(
      (c) => c.employee_id === empId && c.date === today
    );

    if (todayEntry) {
      const { data } = await supabase
        .from('checkins')
        .update({ check_out_time: now })
        .eq('id', todayEntry.id)
        .select()
        .single();

      if (data) {
        setCheckIns((prev) =>
          prev.map((c) => (c.id === todayEntry.id ? data : c))
        );
      }
    }
  }, [checkIns, currentUser]);

  const getUserCheckIns = useCallback(
    (userId) => {
      const uid = userId || currentUser?.id;
      return checkIns.filter((c) => c.employee_id === uid);
    },
    [checkIns, currentUser]
  );

  const getAllTodayCheckIns = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return checkIns.filter((c) => c.date === today);
  }, [checkIns]);

  return (
    <CheckInContext.Provider
      value={{
        checkIns,
        allEmployees,
        getTodayCheckIn,
        checkIn,
        checkOut,
        getUserCheckIns,
        getAllTodayCheckIns,
        loadCheckIns,
        loadEmployees,
      }}
    >
      {children}
    </CheckInContext.Provider>
  );
}

export function useCheckIn() {
  const context = useContext(CheckInContext);
  if (!context) throw new Error('useCheckIn must be used within CheckInProvider');
  return context;
}
