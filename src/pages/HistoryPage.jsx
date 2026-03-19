import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, X, MapPin, Home, Building2, CalendarCheck, FileText } from 'lucide-react';
import { useCheckIn } from '../contexts/CheckInContext';

export default function HistoryPage() {
  const { getUserCheckIns } = useCheckIn();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const userCheckIns = getUserCheckIns();

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const checkIn = userCheckIns.find((c) => c.date === dateStr);
      days.push({ date: day, dateStr, isCurrentMonth: isSameMonth(day, currentDate), isToday: isToday(day), checkIn });
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate, userCheckIns]);

  const selectedCheckIn = selectedDay
    ? userCheckIns.find((c) => c.date === format(selectedDay, 'yyyy-MM-dd'))
    : null;

  const dayHeaders = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

  const monthCheckIns = userCheckIns.filter((c) => c.date.startsWith(format(currentDate, 'yyyy-MM')));
  const wfhCount = monthCheckIns.filter((c) => c.status === 'wfh').length;
  const officeCount = monthCheckIns.filter((c) => c.status === 'office').length;
  const leaveCount = monthCheckIns.filter((c) => c.status === 'leave').length;

  return (
    <div className="apple-dashboard-container">
      <header className="dashboard-header">
        <div className="greeting-text">
          <h1>ประวัติการทำงาน</h1>
          <p>ดูประวัติการเช็คอินย้อนหลังแบบปฏิทิน</p>
        </div>
      </header>

      <div className="dashboard-stats">
        <div className="ios-widget"><div className="widget-icon" style={{color:'var(--primary)'}}><Home size={22}/></div><div className="widget-value">{wfhCount}</div><div className="widget-label">WFH เดือนนี้</div></div>
        <div className="ios-widget"><div className="widget-icon" style={{color:'var(--success)'}}><Building2 size={22}/></div><div className="widget-value">{officeCount}</div><div className="widget-label">ออฟฟิศ เดือนนี้</div></div>
        <div className="ios-widget"><div className="widget-icon" style={{color:'var(--warning)'}}><CalendarCheck size={22}/></div><div className="widget-value">{leaveCount}</div><div className="widget-label">ลา เดือนนี้</div></div>
        <div className="ios-widget"><div className="widget-icon" style={{color:'var(--info)'}}><FileText size={22}/></div><div className="widget-value">{monthCheckIns.length}</div><div className="widget-label">รวมทั้งหมด</div></div>
      </div>

      <div className="calendar-container ios-widget">
        <div className="calendar-header">
          <h3>{format(currentDate, 'MMMM yyyy', { locale: th })}</h3>
          <div className="calendar-nav">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} style={{ width: 'auto', padding: '0 12px', fontSize: 12 }}>วันนี้</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="calendar-grid">
          {dayHeaders.map((d) => <div key={d} className="calendar-day-header">{d}</div>)}
          {calendarDays.map((day) => (
            <div
              key={day.dateStr}
              className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}`}
              onClick={() => day.isCurrentMonth && day.checkIn ? setSelectedDay(day.date) : null}
              style={{ cursor: day.isCurrentMonth && day.checkIn ? 'pointer' : 'default' }}
            >
              <span>{format(day.date, 'd')}</span>
              {day.checkIn && day.isCurrentMonth && <div className={`day-indicator ${day.checkIn.status}`} />}
            </div>
          ))}
        </div>

        <div className="calendar-legend">
          <div className="legend-item"><div className="legend-dot wfh" />Work From Home</div>
          <div className="legend-item"><div className="legend-dot office" />Office</div>
          <div className="legend-item"><div className="legend-dot leave" />Leave</div>
        </div>
      </div>

      {selectedDay && selectedCheckIn && (
        <div className="history-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h3>{format(selectedDay, 'd MMMM yyyy', { locale: th })}</h3>
              <button className="modal-close" onClick={() => setSelectedDay(null)}><X size={16} /></button>
            </div>
            <div className="modal-detail">
              <div className="modal-detail-row"><span className="label">สถานะ</span><span className={`activity-badge ${selectedCheckIn.status}`}>{selectedCheckIn.status === 'wfh' ? '🏠 WFH' : selectedCheckIn.status === 'office' ? '🏢 Office' : '🌴 Leave'}</span></div>
              <div className="modal-detail-row"><span className="label">เช็คอิน</span><span className="value">{selectedCheckIn.check_in_time?.substring(0, 5)} น.</span></div>
              <div className="modal-detail-row"><span className="label">เช็คเอาท์</span><span className="value">{selectedCheckIn.check_out_time ? `${selectedCheckIn.check_out_time.substring(0, 5)} น.` : 'ยังไม่เช็คเอาท์'}</span></div>
              <div className="modal-detail-row"><span className="label">วิธีเช็คอิน</span><span className="value">{selectedCheckIn.verified_by === 'face' ? '📸 สแกนหน้า' : '🔑 PIN'}</span></div>
              {selectedCheckIn.latitude && selectedCheckIn.longitude && (
                <div className="modal-detail-row">
                  <span className="label">สถานที่</span>
                  <a 
                    href={`https://maps.google.com/?q=${selectedCheckIn.latitude},${selectedCheckIn.longitude}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="value"
                    style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <MapPin size={16} /> กดดูแผนที่
                  </a>
                </div>
              )}
              {selectedCheckIn.note && <div className="modal-detail-row"><span className="label">บันทึก</span><span className="value">{selectedCheckIn.note}</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
