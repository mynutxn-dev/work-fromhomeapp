import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Home,
  Building2,
  Clock,
  CalendarCheck,
  Timer,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCheckIn } from '../contexts/CheckInContext';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const { getTodayCheckIn, checkIn, checkOut, getUserCheckIns } = useCheckIn();
  const [time, setTime] = useState(new Date());
  const [selectedType, setSelectedType] = useState('wfh');
  const [note, setNote] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const todayCheckIn = getTodayCheckIn();
  const userCheckIns = getUserCheckIns();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = time.getHours();
    if (hour < 12) return 'สวัสดีตอนเช้า';
    if (hour < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  }, [time]);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthCheckIns = userCheckIns.filter((c) => c.date.startsWith(currentMonth));
  const wfhDays = monthCheckIns.filter((c) => c.status === 'wfh').length;
  const officeDays = monthCheckIns.filter((c) => c.status === 'office').length;
  const leaveDays = monthCheckIns.filter((c) => c.status === 'leave').length;

  const todayHours = useMemo(() => {
    if (!todayCheckIn?.check_in_time) return '--';
    const [inH, inM] = todayCheckIn.check_in_time.split(':').map(Number);
    if (todayCheckIn.check_out_time) {
      const [outH, outM] = todayCheckIn.check_out_time.split(':').map(Number);
      const diff = (outH * 60 + outM) - (inH * 60 + inM);
      return `${Math.floor(diff / 60)} ชม. ${diff % 60} น.`;
    }
    const now = new Date();
    const diff = (now.getHours() * 60 + now.getMinutes()) - (inH * 60 + inM);
    if (diff < 0) return '--';
    return `${Math.floor(diff / 60)} ชม. ${diff % 60} น.`;
  }, [todayCheckIn, time]);

  const recentActivity = userCheckIns
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const handleCheckIn = () => {
    setIsLocating(true);
    setLocationError('');

    // Use setTimeout to allow the browser to paint the "loading" state before blocking
    // the main thread with geolocation initialization, fixing the INP issue.
    setTimeout(() => {
      const performCheckIn = (lat = null, lng = null) => {
        checkIn(selectedType, note || 'ทำงานปกติ', 'pin', null, lat, lng);
        setNote('');
        setIsLocating(false);
      };

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            performCheckIn(position.coords.latitude, position.coords.longitude);
          },
          (error) => {
            console.error('Error fetching location:', error);
            let errorMsg = 'ไม่สามารถดึงตำแหน่งได้';
            if (error.code === 1) errorMsg = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง';
            setLocationError(errorMsg);
            // Still allow check-in but without GPS
            performCheckIn();
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        performCheckIn();
      }
    }, 50);
  };

  const statusLabels = { wfh: 'Work From Home', office: 'ออฟฟิศ', leave: 'ลา' };

  return (
    <div className="apple-dashboard-container">
      <header className="dashboard-header">
        <div className="greeting-text">
          <h1>{greeting}, {currentUser?.name?.split(' ')[0]}</h1>
          <p>{format(time, 'EEEE d MMMM yyyy', { locale: th })}</p>
        </div>
        <div className="current-time desktop-only">
          {format(time, 'HH:mm')}
        </div>
      </header>

      <div className="dashboard-stats">
        <div className="ios-widget">
          <div className="widget-icon" style={{ color: 'var(--primary)' }}><Home size={22} /></div>
          <div className="widget-value">{wfhDays}</div>
          <div className="widget-label">WFH เดือนนี้</div>
        </div>
        <div className="ios-widget">
          <div className="widget-icon" style={{ color: 'var(--success)' }}><Building2 size={22} /></div>
          <div className="widget-value">{officeDays}</div>
          <div className="widget-label">ออฟฟิศ เดือนนี้</div>
        </div>
        <div className="ios-widget">
          <div className="widget-icon" style={{ color: 'var(--warning)' }}><CalendarCheck size={22} /></div>
          <div className="widget-value">{leaveDays}</div>
          <div className="widget-label">ลา เดือนนี้</div>
        </div>
        <div className="ios-widget">
          <div className="widget-icon" style={{ color: 'var(--info)' }}><Timer size={22} /></div>
          <div className="widget-value" style={{ fontSize: 24, paddingBottom: 8 }}>{todayHours}</div>
          <div className="widget-label">ทำงานวันนี้</div>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <div className="ios-widget checkin-widget">
          <div className="widget-header">
            <h3>ตรวจสอบเวลา</h3>
            <span className={`status-dot ${todayCheckIn ? todayCheckIn.check_out_time ? 'out' : 'in' : 'none'}`} />
          </div>

          <div className="checkin-hero">
            <h2 className="checkin-title">
              {todayCheckIn
                ? todayCheckIn.check_out_time ? 'เสร็จสิ้นการทำงาน' : `กำลังทำงาน • ${statusLabels[todayCheckIn.status]}`
                : 'พร้อมเริ่มงานหรือยัง?'}
            </h2>
            <p className="checkin-subtitle">
              {todayCheckIn
                ? todayCheckIn.check_out_time ? 'พักผ่อนให้เต็มที่ เจอกันพรุ่งนี้' : `เข้างานเวลา ${todayCheckIn.check_in_time?.substring(0, 5)} น.`
                : 'เลือกรูปแบบการทำงานและกดเช็คอินได้เลย'}
            </p>
          </div>

          {!todayCheckIn ? (
            <div className="checkin-actions-clean">
              <div className="checkin-type-selector">
                {[
                  { type: 'wfh', label: '🏡 WFH' },
                  { type: 'office', label: '🏢 Office' },
                  { type: 'leave', label: '🌴 Leave' },
                ].map((opt) => (
                  <button key={opt.type} className={`checkin-type-btn ${selectedType === opt.type ? 'active' : ''}`} onClick={() => setSelectedType(opt.type)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <input 
                type="text" 
                className="form-input" 
                placeholder="บันทึกสิ่งที่จะทำวันนี้... (ไม่บังคับ)" 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                style={{ marginBottom: 24, background: 'var(--bg-primary)', border: 'none' }}
              />
              {locationError && (
                <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                  ⚠️ {locationError} (กำลังดึงข้อมูลเช็คอินโดยไม่มี GPS)
                </div>
              )}
              <button className="btn btn-primary btn-full btn-lg" onClick={handleCheckIn} disabled={isLocating}>
                {isLocating ? 'กำลังดึงตำแหน่ง...' : 'เช็คอินเริ่มงาน'}
              </button>
            </div>
          ) : !todayCheckIn.check_out_time ? (
            <div className="checkin-actions-clean" style={{ marginTop: 32 }}>
              <button className="btn btn-danger btn-full btn-lg" onClick={checkOut}>
                เช็คเอาท์เลิกงาน
              </button>
            </div>
          ) : (
            <div className="checkin-completed-stamp" style={{ marginTop: 32, padding: 24, background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontWeight: 600 }}>เยี่ยมมาก!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>คุณได้บันทึกเวลาเลิกงานแล้ว</div>
            </div>
          )}
        </div>

        <div className="ios-widget activity-widget">
          <div className="widget-header">
            <h3>กิจกรรมล่าสุด</h3>
            <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>ดูทั้งหมด <ChevronRight size={14}/></button>
          </div>
          
          <div className="clean-activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="clean-activity-item">
                  <div className="activity-icon-wrap" style={{ background: activity.status === 'wfh' ? 'var(--primary-light-rgba)' : activity.status === 'office' ? 'var(--success-bg)' : 'var(--warning-bg)', color: activity.status === 'wfh' ? 'var(--primary)' : activity.status === 'office' ? 'var(--success)' : 'var(--warning)' }}>
                    {activity.status === 'wfh' ? <Home size={16}/> : activity.status === 'office' ? <Building2 size={16}/> : <CalendarCheck size={16}/>}
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">{activity.status === 'wfh' ? 'Work From Home' : activity.status === 'office' ? 'ทำงานที่ออฟฟิศ' : 'ลา'}</div>
                    <div className="activity-time-str">{format(new Date(activity.date), 'd MMM', { locale: th })} • {activity.check_in_time?.substring(0, 5)} {activity.check_out_time ? `- ${activity.check_out_time.substring(0, 5)}` : ''}</div>
                    {activity.note && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                        📝 {activity.note}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                ยังไม่มีประวัติการเช็คอิน
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
