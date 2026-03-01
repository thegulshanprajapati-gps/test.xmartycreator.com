import { getQuestions } from './question-service';
import { getStudents } from './student-service';
import { getTests } from './test-service';

export async function globalAdminSearch(query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const [testsData, studentsData, questionsData] = await Promise.all([
    getTests({ query: q }),
    getStudents(),
    getQuestions(),
  ]);

  const tests = testsData
    .filter((item) => item.name.toLowerCase().includes(q))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      label: item.name,
      type: 'Test',
      href: `/admin/tests/${item.id}/edit`,
    }));

  const students = studentsData
    .filter((item) => item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      label: item.name,
      type: 'Student',
      href: '/admin/enrollments',
    }));

  const questions = questionsData
    .filter((item) => item.text.toLowerCase().includes(q))
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      label: item.text.slice(0, 64),
      type: 'Question',
      href: '/admin/questions',
    }));

  return [...tests, ...students, ...questions].slice(0, 8);
}

