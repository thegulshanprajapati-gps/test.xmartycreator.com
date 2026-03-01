'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { getQuestions } from '@/services/question-service';
import { getAttemptById } from '@/services/result-service';
import { getTestById } from '@/services/test-service';
import { Attempt, Question, Test } from '@/types';
import { formatDuration } from '@/utils/formatters';

export default function StudentResultPage() {
  const params = useParams<{ id: string }>();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    getAttemptById(params.id).then((attemptData) => {
      setAttempt(attemptData);
      if (attemptData) {
        getTestById(attemptData.testId).then(setTest);
      }
    });
    getQuestions().then(setQuestions);
  }, [params.id]);

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );

  const summary = useMemo(() => {
    if (!attempt) return { correct: 0, wrong: 0, skipped: 0 };
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    attempt.answers.forEach((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!answer.selected) {
        skipped += 1;
        return;
      }
      if (String(answer.selected).trim() === String(question?.correctAnswer ?? '').trim()) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });
    return { correct, wrong, skipped };
  }, [attempt, questionMap]);

  const sectionWise = useMemo(() => {
    if (!attempt || !test) return [];
    return test.sections.map((section) => {
      const sectionAnswers = attempt.answers.filter((answer) =>
        section.questionIds.includes(answer.questionId)
      );
      const correct = sectionAnswers.filter((answer) => {
        const question = questionMap.get(answer.questionId);
        return (
          answer.selected &&
          String(answer.selected).trim() === String(question?.correctAnswer ?? '').trim()
        );
      }).length;
      const attempted = sectionAnswers.filter((answer) => answer.selected).length;
      return {
        section: section.name,
        score: correct * test.marksPerQuestion,
        accuracy: attempted > 0 ? Number(((correct / attempted) * 100).toFixed(1)) : 0,
      };
    });
  }, [attempt, test, questionMap]);

  if (!attempt || !test) return null;

  return (
    <PageTransition>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Result: {test.name}</h1>
          <p className="text-sm text-slate-500">Attempt ID: {attempt.id}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <p className="text-xs text-slate-500">Score</p>
            <p className="text-2xl font-bold text-slate-900">{attempt.score}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Correct</p>
            <p className="text-2xl font-bold text-emerald-700">{summary.correct}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Wrong</p>
            <p className="text-2xl font-bold text-red-600">{summary.wrong}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Skipped</p>
            <p className="text-2xl font-bold text-amber-600">{summary.skipped}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Time Taken</p>
            <p className="text-2xl font-bold text-slate-900">{formatDuration(attempt.timeTakenSec)}</p>
            <p className="mt-1 text-xs text-slate-500">Estimated rank: #{Math.max(1, 15 - summary.correct)}</p>
          </Card>
        </div>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Section-wise Breakdown</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {sectionWise.map((section) => (
              <div key={section.section} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{section.section}</p>
                <p className="text-xs text-slate-500">Score: {section.score}</p>
                <p className="text-xs text-slate-500">Accuracy: {section.accuracy}%</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Solutions</h3>
          <div className="space-y-3">
            {attempt.answers.map((answer, index) => {
              const question = questionMap.get(answer.questionId);
              const isCorrect =
                answer.selected &&
                String(answer.selected).trim() === String(question?.correctAnswer ?? '').trim();
              return (
                <div key={answer.questionId} className="rounded-xl border border-slate-100 p-3">
                  <p className="font-medium text-slate-900">
                    Q{index + 1}. {question?.text ?? answer.questionId}
                  </p>
                  {question?.description ? (
                    <p className="mt-1 text-xs text-slate-600">{question.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Badge variant={isCorrect ? 'success' : 'danger'}>
                      Your Answer: {answer.selected ?? 'Skipped'}
                    </Badge>
                    <Badge variant="info">Correct: {question?.correctAnswer ?? '-'}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    Explanation: {question?.explanation ?? 'No explanation'}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
