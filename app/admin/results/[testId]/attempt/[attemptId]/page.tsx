'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageTransition } from '@/components/ui/page-transition';
import { getAttemptsByTest, buildTopicAccuracy } from '@/services/result-service';
import { getQuestions } from '@/services/question-service';
import { getTestById } from '@/services/test-service';
import { Attempt, Question, Test } from '@/types';
import { formatDuration } from '@/utils/formatters';
import { downloadCSV, toCSV } from '@/utils/csv';

export default function AttemptDetailPage() {
  const params = useParams<{ testId: string; attemptId: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    Promise.all([
      getTestById(params.testId),
      getAttemptsByTest(params.testId),
      getQuestions(),
    ]).then(([testData, attemptsData, questionData]) => {
      setTest(testData);
      setAttempts(attemptsData);
      setAttempt(attemptsData.find((item) => item.id === params.attemptId) ?? null);
      setQuestions(questionData);
    });
  }, [params.testId, params.attemptId]);

  const questionMap = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );

  const topicAccuracy = useMemo(
    () =>
      attempt
        ? buildTopicAccuracy({
            answers: attempt.answers,
            questionPool: questions,
          })
        : [],
    [attempt, questions]
  );

  const toughest = useMemo(() => {
    const wrongCount = new Map<string, number>();
    attempts.forEach((entry) => {
      entry.answers.forEach((answer) => {
        const question = questionMap.get(answer.questionId);
        if (!question || !answer.selected) return;
        if (String(answer.selected).trim() !== String(question.correctAnswer).trim()) {
          wrongCount.set(answer.questionId, (wrongCount.get(answer.questionId) ?? 0) + 1);
        }
      });
    });
    return Array.from(wrongCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([questionId, wrong]) => ({
        questionId,
        wrong,
        question: questionMap.get(questionId),
      }));
  }, [attempts, questionMap]);

  if (!attempt) return null;

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Attempt Detail: {attempt.id}
            </h1>
            <p className="text-sm text-slate-500">
              {test?.name ?? params.testId} | Score {attempt.score} | Accuracy {attempt.accuracy}%
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const rows = attempt.answers.map((answer) => {
                const question = questionMap.get(answer.questionId);
                return {
                  questionId: answer.questionId,
                  topic: question?.topic ?? '',
                  selected: answer.selected ?? '',
                  correct: question?.correctAnswer ?? '',
                  marked: answer.isMarked,
                  timeSpentSec: answer.timeSpentSec,
                };
              });
              downloadCSV(`attempt-${attempt.id}.csv`, toCSV(rows));
            }}
          >
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <p className="text-xs text-slate-500">Score</p>
            <p className="text-2xl font-bold text-slate-900">{attempt.score}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Accuracy</p>
            <p className="text-2xl font-bold text-slate-900">{attempt.accuracy}%</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500">Time Taken</p>
            <p className="text-2xl font-bold text-slate-900">{formatDuration(attempt.timeTakenSec)}</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Topic-wise Accuracy</h3>
            <div className="space-y-2">
              {topicAccuracy.map((entry) => (
                <div key={entry.topic} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{entry.topic}</span>
                  <span className="font-semibold">{entry.accuracy}%</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Toughest Questions</h3>
            <div className="space-y-2">
              {toughest.map((entry) => (
                <div key={entry.questionId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">
                    {entry.question?.text.slice(0, 80) ?? entry.questionId}
                  </p>
                  <p className="text-xs text-red-600">{entry.wrong} wrong attempts</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Question by Question</h3>
          <div className="space-y-2">
            {attempt.answers.map((answer, index) => {
              const question = questionMap.get(answer.questionId);
              const isCorrect =
                answer.selected &&
                String(answer.selected).trim() === String(question?.correctAnswer ?? '').trim();
              return (
                <div key={answer.questionId} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    Q{index + 1}. {question?.text ?? answer.questionId}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={isCorrect ? 'success' : 'danger'}>
                      Selected: {answer.selected ?? 'Skipped'}
                    </Badge>
                    <Badge variant="info">Correct: {question?.correctAnswer ?? '-'}</Badge>
                    <Badge variant={answer.isMarked ? 'warning' : 'default'}>
                      {answer.isMarked ? 'Marked Review' : 'Normal'}
                    </Badge>
                    <Badge>Time: {answer.timeSpentSec}s</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
