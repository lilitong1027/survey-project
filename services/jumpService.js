
function isAnswered(value) {
  return !(
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function matchesRule(rule, answer) {
  const answered = isAnswered(answer);
  const target = rule.value;

  switch (rule.operator) {
    case 'answered':
      return answered;

    case 'not_answered':
      return !answered;

    case 'equals':
      return answered && answer === target;

    case 'not_equals':
      return answered && answer !== target;

    case 'includes':
      return Array.isArray(answer) && answer.includes(target);

    case 'not_includes':
      return Array.isArray(answer) && !answer.includes(target);

    case 'gt':
      return typeof answer === 'number' && answer > target;

    case 'gte':
      return typeof answer === 'number' && answer >= target;

    case 'lt':
      return typeof answer === 'number' && answer < target;

    case 'lte':
      return typeof answer === 'number' && answer <= target;

    default:
      return false;
  }
}

/**
 * 计算当前题目之后应该去哪。
 *
 * @returns {{ ended: boolean, nextQuestionId: string|null }}
 */
function getNextQuestion(survey, question, answer) {
  const questions = survey.questions || [];
  const currentIndex = questions.findIndex(
    (item) => item.question_id === question.question_id
  );

  if (currentIndex === -1) {
    throw new Error('当前题目不存在于问卷中');
  }

  for (const rule of question.jump_rules || []) {
    if (!matchesRule(rule, answer)) {
      continue;
    }

    if (rule.action === 'end') {
      return {
        ended: true,
        nextQuestionId: null,
      };
    }

    if (rule.action === 'jump') {
      const targetExists = questions.some(
        (item) =>
          item.question_id === rule.target_question_id
      );

      if (!targetExists) {
        throw new Error(
          `跳转目标不存在：${rule.target_question_id}`
        );
      }

      return {
        ended: false,
        nextQuestionId: rule.target_question_id,
      };
    }
  }

  // 没有匹配规则，按正常顺序前进
  const nextQuestion = questions[currentIndex + 1];

  if (!nextQuestion) {
    return {
      ended: true,
      nextQuestionId: null,
    };
  }

  return {
    ended: false,
    nextQuestionId: nextQuestion.question_id,
  };
}

/**
 * 从第一题开始计算实际答题路径。
 * 检测循环，并拒绝用户提交不可达题目的答案。
 */
function calculateJumpPath(survey, answersByQuestion) {
  const questions = survey.questions || [];
  const questionMap = new Map(
    questions.map((question) => [
      question.question_id,
      question,
    ])
  );

  if (new Set(questionMap.keys()).size !== questions.length) {
    throw new Error('问卷中存在重复的 question_id');
  }

  const path = [];
  const visited = new Set();

  if (questions.length === 0) {
    if (answersByQuestion.size > 0) {
      throw new Error('空问卷不能提交题目答案');
    }

    return path;
  }

  let currentQuestionId = questions[0].question_id;
  const maxSteps = questions.length;

  while (currentQuestionId !== null) {
    if (visited.has(currentQuestionId)) {
      throw new Error(
        `检测到跳转循环，涉及题目：${currentQuestionId}`
      );
    }

    // 防御性限制，避免异常规则导致无限循环
    if (path.length >= maxSteps) {
      throw new Error('答题路径超过题目数量，已停止执行');
    }

    const question = questionMap.get(currentQuestionId);

    if (!question) {
      throw new Error(
        `跳转目标不存在：${currentQuestionId}`
      );
    }

    visited.add(currentQuestionId);
    path.push(currentQuestionId);

    const answer = answersByQuestion.get(currentQuestionId);

    const result = getNextQuestion(
      survey,
      question,
      answer
    );

    currentQuestionId = result.ended
      ? null
      : result.nextQuestionId;
  }

  // 不能提交实际答题路径之外的隐藏题目答案
  for (const questionId of answersByQuestion.keys()) {
    if (!visited.has(questionId)) {
      throw new Error(
        `题目 ${questionId} 不在本次答题路径中`
      );
    }
  }

  return path;
}

module.exports = {
  matchesRule,
  getNextQuestion,
  calculateJumpPath,
};
