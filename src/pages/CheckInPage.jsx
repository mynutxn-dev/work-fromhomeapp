import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import {
  Clock,
  CheckCircle2,
  Timer,
  FileText,
  Camera,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCheckIn } from '../contexts/CheckInContext';
import FaceScanner from '../components/FaceScanner';

export default function CheckInPage() {
  const { currentUser } = useAuth();
  const { getTodayCheckIn, checkIn, checkOut, getUserCheckIns } = useCheckIn();
  const [time, setTime] = useState(new Date());
  const [selectedType, setSelectedType] = useState('wfh');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const todayCheckIn = getTodayCheckIn();
  const userCheckIns = getUserCheckIns();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const workDuration = useMemo(() => {
    if (!todayCheckIn?.check_in_time) return null;
    const [inH, inM] = todayCheckIn.check_in_time.split(':').map(Number);
    const endTime = todayCheckIn.check_out_time
      ? todayCheckIn.check_out_time.split(':').map(Number)
      : [time.getHours(), time.getMinutes()];
    const diff = (endTime[0] * 60 + endTime[1]) - (inH * 60 + inM);
    if (diff < 0) return null;
    return { hours: Math.floor(diff / 60), mins: diff % 60, total: diff };
  }, [todayCheckIn, time]);

  const progressPercent = workDuration ? Math.min((workDuration.total / 480) * 100, 100) : 0;

  const thisWeekCheckIns = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const startStr = format(startOfWeek, 'yyyy-MM-dd');
    return userCheckIns
      .filter((c) => c.date >= startStr && c.date <= format(today, 'yyyy-MM-dd'))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [userCheckIns]);

  const handleCheckIn = async (verifiedBy = 'pin') => {
    setIsCheckingIn(true);
    
    // Allow UI to paint the loading state before geolocation starts
    await new Promise(resolve => setTimeout(resolve, 50));
    
    let lat = null;
    let lng = null;

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

    await checkIn(selectedType, note || 'ทำงานปกติ', verifiedBy, null, lat, lng);
    setNote('');
    setIsCheckingIn(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleCheckOut = async () => {
    await checkOut();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleFaceCheckIn = async () => {
    setShowFaceScan(true);
  };

  const handleFaceScanSuccess = async (matchedEmployee) => {
    // Verify that the face matches the currently logged in user
    if (matchedEmployee.id !== currentUser.id) {
      alert(`ใบหน้าไม่ตรงกับผู้ใช้งานปัจจุบัน (พบ: ${matchedEmployee.name})\nกรุณาสแกนใบหน้าของตัวเองเพื่อ ${todayCheckIn ? 'เช็คเอาท์' : 'เช็คอิน'}`);
      setShowFaceScan(false);
      return;
    }

    setShowFaceScan(false);
    if (!todayCheckIn) {
      await handleCheckIn('face');
    } else if (!todayCheckIn.check_out_time) {
      await handleCheckOut();
    }
  };

  const statusConfig = {
    wfh: { icon: '🏠', label: 'Work From Home' },
    office: { icon: '🏢', label: 'ทำงานที่ออฟฟิศ' },
    leave: { icon: '🌴', label: 'ลางาน' },
  };

  const dayNames = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.'];

  return (
    <div className="apple-dashboard-container">
      <header className="dashboard-header">
        <div className="greeting-text">
          <h1>เช็คอิน</h1>
          <p>บันทึกเวลาเข้า-ออกงานของคุณ</p>
        </div>
      </header>

      {showSuccess && (
        <div style={{
          position: 'fixed', top: 24, right: 24, padding: '16px 24px',
          background: 'linear-gradient(135deg, var(--success), #059669)',
          borderRadius: 'var(--radius-md)', color: 'white', fontWeight: 600, fontSize: 14,
          display: 'flex', alignItems: 'center', gap: 8, zIndex: 9999,
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3)', animation: 'slideUp 300ms ease',
        }}>
          <CheckCircle2 size={20} /> บันทึกสำเร็จ!
        </div>
      )}

      {showFaceScan && (
        <div className="history-modal-overlay" onClick={() => setShowFaceScan(false)}>
          <div className="history-modal" style={{ maxWidth: 480, padding: 24 }} onClick={e => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>สแกนใบหน้า</h2>
            </div>
            <FaceScanner mode="verify" onSuccess={handleFaceScanSuccess} onCancel={() => setShowFaceScan(false)} />
          </div>
        </div>
      )}

      <div className="dashboard-main-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="ios-widget" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              fontSize: 56, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-primary)',
              lineHeight: 1.1, marginBottom: 8,
            }}>{format(time, 'HH:mm:ss')}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
              {format(time, 'EEEE d MMMM yyyy', { locale: th })}
            </div>
          </div>

          <div className="ios-widget" style={{ padding: '32px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44,
                background: todayCheckIn ? todayCheckIn.check_out_time ? 'var(--info-bg)' : 'var(--success-bg)' : 'var(--bg-tertiary)',
                border: todayCheckIn ? todayCheckIn.check_out_time ? '3px solid var(--info)' : '3px solid var(--success)' : '3px dashed var(--border)',
                animation: todayCheckIn && !todayCheckIn.check_out_time ? 'pulse-ring 2s infinite' : 'none',
              }}>
                {todayCheckIn ? todayCheckIn.check_out_time ? '✅' : '🟢' : '⏳'}
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                {todayCheckIn ? todayCheckIn.check_out_time ? 'เช็คเอาท์แล้ว' : 'กำลังทำงาน' : 'พร้อมเช็คอิน'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                {todayCheckIn
                  ? todayCheckIn.check_out_time ? 'ทำงานเสร็จสิ้นเรียบร้อยวันนี้ 🎉'
                    : `${statusConfig[todayCheckIn.status]?.icon} ${statusConfig[todayCheckIn.status]?.label}`
                  : 'เลือกรูปแบบการทำงานแล้วกดเช็คอิน'}
              </p>
            </div>

            {!todayCheckIn && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[
                    { type: 'wfh', icon: '🏠', label: 'WFH', desc: 'ทำงานที่บ้าน' },
                    { type: 'office', icon: '🏢', label: 'Office', desc: 'ทำงานที่ออฟฟิศ' },
                    { type: 'leave', icon: '🌴', label: 'Leave', desc: 'ลางาน' },
                  ].map((opt) => (
                    <button key={opt.type} onClick={() => setSelectedType(opt.type)} style={{
                      padding: '16px 12px', borderRadius: 'var(--radius-md)',
                      border: selectedType === opt.type ? '2px solid var(--primary)' : '2px solid var(--border)',
                      background: selectedType === opt.type ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                      color: selectedType === opt.type ? 'var(--primary-light)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', transition: 'all var(--transition-fast)',
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{opt.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    <FileText size={14} /> หมายเหตุ (เช่น สถานที่ทำงานนอกสถานที่)
                  </label>
                  <textarea className="checkin-note" placeholder="เช่น ทำงานที่บ้านลูกค้า, สตาร์บัคส์... (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ width: '100%' }} />
                </div>
                <button className="btn btn-success btn-full btn-lg" onClick={() => handleCheckIn('pin')} disabled={isCheckingIn} style={{ fontSize: 18, padding: '18px 32px' }}>
                  {isCheckingIn ? <Loader2 size={22} className="animate-spin" /> : <Clock size={22} />} 
                  {isCheckingIn ? 'กำลังเช็คอิน...' : `เช็คอิน — ${format(time, 'HH:mm')} น.`}
                </button>
                <button className="btn btn-ghost btn-full btn-lg" onClick={handleFaceCheckIn} style={{ marginTop: 12 }}>
                  <Camera size={20} /> เช็คอินด้วยสแกนหน้า
                </button>
              </>
            )}

            {todayCheckIn && !todayCheckIn.check_out_time && (
              <>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    <span>ระยะเวลาทำงาน</span>
                    <span>{workDuration ? `${workDuration.hours} ชม. ${workDuration.mins} น.` : '--'}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${progressPercent}%`, borderRadius: 'var(--radius-full)',
                      background: progressPercent >= 100 ? 'linear-gradient(90deg, var(--success), #34d399)' : 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                    เป้าหมาย 8 ชั่วโมง ({Math.round(progressPercent)}%)
                  </div>
                </div>
                <button className="btn btn-danger btn-full btn-lg" onClick={handleCheckOut} style={{ fontSize: 18, padding: '18px 32px' }}>
                  <Clock size={22} /> เช็คเอาท์ — {format(time, 'HH:mm')} น.
                </button>
                <button className="btn btn-ghost btn-full btn-lg" onClick={handleFaceCheckIn} style={{ marginTop: 12 }}>
                  <Camera size={20} /> เช็คเอาท์ด้วยสแกนหน้า
                </button>
              </>
            )}

            {todayCheckIn && todayCheckIn.check_out_time && (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 'var(--radius-md)', padding: 20, textAlign: 'center' }}>
                <CheckCircle2 size={24} style={{ color: 'var(--success)', marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>ทำงานเสร็จแล้ววันนี้!</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {workDuration ? `ทำงานรวม ${workDuration.hours} ชั่วโมง ${workDuration.mins} นาที` : ''}
                </div>
              </div>
            )}

            {todayCheckIn && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>เช็คอิน</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>{todayCheckIn.check_in_time?.substring(0, 5)}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>เช็คเอาท์</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: todayCheckIn.check_out_time ? 'var(--danger)' : 'var(--text-muted)' }}>{todayCheckIn.check_out_time?.substring(0, 5) || '--:--'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>วิธีเช็คอิน</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{todayCheckIn.verified_by === 'face' ? '📸' : '🔑'} {todayCheckIn.verified_by === 'face' ? 'Face' : 'PIN'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="ios-widget" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Timer size={18} /> ข้อมูลวันนี้
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'สถานะ', value: todayCheckIn ? todayCheckIn.check_out_time ? 'เสร็จสิ้น' : 'กำลังทำงาน' : 'ยังไม่เช็คอิน', color: todayCheckIn ? todayCheckIn.check_out_time ? 'var(--info)' : 'var(--success)' : 'var(--text-muted)' },
                { label: 'เวลาเข้า', value: todayCheckIn?.check_in_time ? `${todayCheckIn.check_in_time.substring(0, 5)} น.` : '--' },
                { label: 'เวลาออก', value: todayCheckIn?.check_out_time ? `${todayCheckIn.check_out_time.substring(0, 5)} น.` : '--' },
                { label: 'ระยะเวลา', value: workDuration ? `${workDuration.hours} ชม. ${workDuration.mins} น.` : '--' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13, color: item.color || 'var(--text-primary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ios-widget" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📅 สรุปสัปดาห์นี้
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayNames.map((dayName, i) => {
                const weekCheckIn = thisWeekCheckIns[i];
                return (
                  <div key={dayName} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: weekCheckIn ? 'var(--bg-tertiary)' : 'transparent', border: weekCheckIn ? 'none' : '1px dashed var(--border)',
                  }}>
                    <span style={{ width: 32, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{dayName}</span>
                    {weekCheckIn ? (
                      <>
                        <span className={`activity-badge ${weekCheckIn.status}`}>
                          {weekCheckIn.status === 'wfh' ? 'WFH' : weekCheckIn.status === 'office' ? 'OFFICE' : 'LEAVE'}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                          {weekCheckIn.check_in_time?.substring(0, 5)}{weekCheckIn.check_out_time ? ` - ${weekCheckIn.check_out_time.substring(0, 5)}` : ''}
                        </span>
                      </>
                    ) : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
