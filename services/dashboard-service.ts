import { getAttempts } from './result-service';
import { getStudents } from './student-service';
import { getTests } from './test-service';

function toDayKey(value: string) {
  return value.slice(0, 10);
}

export async function getAdminDashboardData() {
  const [students, tests, attemptsRaw] = await Promise.all([
    getStudents(),
    getTests(),
    getAttempts(),
  ]);

  const attempts = attemptsRaw.filter((attempt) => attempt.status !== 'in_progress');

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayAttempts = attempts.filter((attempt) =>
    attempt.submittedAt ? toDayKey(attempt.submittedAt) === todayKey : false
  ).length;

  const last7Days = [...Array(7)].map((_, idx) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - idx));
    return date.toISOString().slice(0, 10);
  });

  const attemptTrend = last7Days.map((day) => ({
    day: day.slice(5),
    attempts: attempts.filter((attempt) =>
      attempt.submittedAt ? toDayKey(attempt.submittedAt) === day : false
    ).length,
  }));

  const attemptsByTest = tests
    .map((test) => ({
      name: test.name,
      attempts: attempts.filter((attempt) => attempt.testId === test.id).length,
    }))
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5);

  const passFail = attempts.reduce(
    (acc, attempt) => {
      if (attempt.accuracy >= 50) acc.pass += 1;
      else acc.fail += 1;
      return acc;
    },
    { pass: 0, fail: 0 }
  );

  const recentActivity = [...attempts]
    .sort((a, b) => {
      const ad = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bd = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bd - ad;
    })
    .slice(0, 8)
    .map((attempt) => {
      const student = students.find((item) => item.id === attempt.studentId);
      const test = tests.find((item) => item.id === attempt.testId);
      return {
        id: attempt.id,
        studentName: student?.name ?? attempt.studentId,
        testName: test?.name ?? attempt.testId,
        score: attempt.score,
        accuracy: attempt.accuracy,
        submittedAt: attempt.submittedAt,
      };
    });

  return {
    kpis: {
      totalStudents: students.length,
      totalTests: tests.length,
      activeTests: tests.filter((test) => test.status === 'Published').length,
      todayAttempts,
    },
    attemptTrend,
    attemptsByTest,
    passFail: [
      { name: 'Pass', value: passFail.pass },
      { name: 'Fail', value: passFail.fail },
    ],
    recentActivity,
  };
}

