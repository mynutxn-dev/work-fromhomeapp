import { format, subDays, setHours, setMinutes } from 'date-fns';

const DEPARTMENTS = [
  { id: 'dept-1', name: 'Engineering' },
  { id: 'dept-2', name: 'Marketing' },
  { id: 'dept-3', name: 'HR' },
  { id: 'dept-4', name: 'Finance' },
  { id: 'dept-5', name: 'Design' },
];

const USERS = [
  {
    id: 'user-admin',
    name: 'Admin WFH',
    email: 'admin@demo.com',
    password: 'password123',
    department: 'dept-1',
    role: 'admin',
    avatar: '👨‍💻',
  },
  {
    id: 'user-1',
    name: 'สมชาย ใจดี',
    email: 'somchai@demo.com',
    password: 'password123',
    department: 'dept-1',
    role: 'employee',
    avatar: '👨‍💼',
  },
  {
    id: 'user-2',
    name: 'สมหญิง สุขใจ',
    email: 'somying@demo.com',
    password: 'password123',
    department: 'dept-2',
    role: 'employee',
    avatar: '👩‍💼',
  },
  {
    id: 'user-3',
    name: 'วิชัย เก่งดี',
    email: 'wichai@demo.com',
    password: 'password123',
    department: 'dept-3',
    role: 'employee',
    avatar: '🧑‍💼',
  },
  {
    id: 'user-4',
    name: 'นภา สวยงาม',
    email: 'napa@demo.com',
    password: 'password123',
    department: 'dept-4',
    role: 'employee',
    avatar: '👩‍🔬',
  },
  {
    id: 'user-5',
    name: 'ธนา รวยดี',
    email: 'thana@demo.com',
    password: 'password123',
    department: 'dept-5',
    role: 'employee',
    avatar: '🧑‍🎨',
  },
];

function generateCheckIns() {
  const checkIns = [];
  const statuses = ['wfh', 'office', 'wfh', 'wfh', 'office', 'leave'];
  const notes = [
    'ทำงานปกติ',
    'ประชุมทีม',
    'พัฒนาฟีเจอร์ใหม่',
    'แก้ไขบัค',
    'เตรียมรายงาน',
    'ลาป่วย',
  ];

  USERS.forEach((user) => {
    for (let i = 0; i < 30; i++) {
      const date = subDays(new Date(), i);
      const dayOfWeek = date.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      const statusIndex = Math.floor(Math.random() * statuses.length);
      const status = statuses[statusIndex];
      const noteIndex = Math.floor(Math.random() * notes.length);

      const checkInHour = 8 + Math.floor(Math.random() * 2);
      const checkInMin = Math.floor(Math.random() * 60);
      const checkOutHour = 17 + Math.floor(Math.random() * 2);
      const checkOutMin = Math.floor(Math.random() * 60);

      const checkInTime = format(
        setMinutes(setHours(date, checkInHour), checkInMin),
        'HH:mm'
      );
      const checkOutTime =
        i === 0 && status !== 'leave'
          ? null
          : format(
              setMinutes(setHours(date, checkOutHour), checkOutMin),
              'HH:mm'
            );

      checkIns.push({
        id: `checkin-${user.id}-${format(date, 'yyyy-MM-dd')}`,
        userId: user.id,
        date: format(date, 'yyyy-MM-dd'),
        checkInTime,
        checkOutTime,
        status: status === 'leave' ? 'leave' : status,
        note: notes[noteIndex],
      });
    }
  });

  return checkIns;
}

export function initSeedData() {
  if (!localStorage.getItem('wfh_initialized')) {
    localStorage.setItem('wfh_departments', JSON.stringify(DEPARTMENTS));
    localStorage.setItem('wfh_users', JSON.stringify(USERS));
    localStorage.setItem('wfh_checkins', JSON.stringify(generateCheckIns()));
    localStorage.setItem('wfh_initialized', 'true');
  }
}

export function getFromStorage(key) {
  try {
    const data = localStorage.getItem(`wfh_${key}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToStorage(key, data) {
  localStorage.setItem(`wfh_${key}`, JSON.stringify(data));
}

export { DEPARTMENTS, USERS };
