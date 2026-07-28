const { getDateKey } = require("../date");
const C = require("./constants");

function ensureAttendance(data) {
  if (!Array.isArray(data.attendanceDates)) data.attendanceDates = [];
  // 오래된 기록은 14개월치만 유지
  if (data.attendanceDates.length > 450) {
    data.attendanceDates = data.attendanceDates.slice(-420);
  }
}

function shiftDateKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d) + deltaDays * 86400000;
  const dt = new Date(utc);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function computeStreak(datesSet, fromDateKey) {
  let streak = 0;
  let cursor = fromDateKey;
  while (datesSet.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

function getAttendanceView(data) {
  ensureAttendance(data);
  const today = getDateKey();
  const set = new Set(data.attendanceDates);
  const checkedToday = set.has(today);
  // 오늘 미출석이면 어제까지의 연속일 표시
  const streakBase = checkedToday ? today : shiftDateKey(today, -1);
  const streak = computeStreak(set, streakBase);
  const cyclePos = streak % C.ATTENDANCE_STREAK_DAYS;
  const progress = streak === 0 ? 0 : cyclePos === 0 ? C.ATTENDANCE_STREAK_DAYS : cyclePos;
  const nextBonusIn =
    streak === 0
      ? C.ATTENDANCE_STREAK_DAYS
      : cyclePos === 0
        ? C.ATTENDANCE_STREAK_DAYS
        : C.ATTENDANCE_STREAK_DAYS - cyclePos;

  return {
    today,
    checkedToday,
    streak,
    streakDays: C.ATTENDANCE_STREAK_DAYS,
    progress,
    nextBonusIn: checkedToday && cyclePos === 0 ? C.ATTENDANCE_STREAK_DAYS : nextBonusIn,
    dailyReward: C.ATTENDANCE_DAILY_REWARD,
    streakReward: C.ATTENDANCE_STREAK_REWARD,
    totalChecks: data.attendanceDates.length,
    dates: data.attendanceDates.slice()
  };
}

function checkAttendance(point, data) {
  ensureAttendance(data);
  const today = getDateKey();
  const set = new Set(data.attendanceDates);
  if (set.has(today)) {
    return { ok: false, error: "오늘은 이미 출석했습니다." };
  }

  data.attendanceDates.push(today);
  set.add(today);

  const streak = computeStreak(set, today);
  let gained = C.ATTENDANCE_DAILY_REWARD;
  const streakBonus = streak > 0 && streak % C.ATTENDANCE_STREAK_DAYS === 0;
  if (streakBonus) gained += C.ATTENDANCE_STREAK_REWARD;
  point += gained;

  const log = [
    `📅 출석 완료! +${C.ATTENDANCE_DAILY_REWARD}P`,
    `연속 출석 ${streak}일`
  ];
  if (streakBonus) {
    log.push(`🎉 ${C.ATTENDANCE_STREAK_DAYS}일 연속 보상! +${C.ATTENDANCE_STREAK_REWARD}P`);
  }
  log.push(`잔액 ${point}P`);

  return {
    ok: true,
    point,
    data,
    log,
    meta: {
      date: today,
      streak,
      dailyReward: C.ATTENDANCE_DAILY_REWARD,
      streakBonus,
      streakReward: streakBonus ? C.ATTENDANCE_STREAK_REWARD : 0,
      gained
    }
  };
}

module.exports = { checkAttendance, getAttendanceView, ensureAttendance };
