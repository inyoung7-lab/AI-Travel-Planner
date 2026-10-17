export function validateExperienceSteps(steps, sessionDuration) {
  const errors = {};
  let previousEnd = 0;

  steps.forEach((step, index) => {
    const order = index + 1;
    const start = Number(step.elapsed_min);
    const duration = Number(step.duration_min);

    if (!step.title.trim()) errors[`title-${order}`] = '일정 제목을 입력해 주세요.';
    if (!Number.isInteger(start) || start < 0) errors[`start-${order}`] = '시작 경과 시간은 0분 이상이어야 합니다.';
    if (!Number.isInteger(duration) || duration <= 0) errors[`duration-${order}`] = '소요 시간은 1분 이상이어야 합니다.';

    if (Number.isInteger(start) && start >= 0 && Number.isInteger(duration) && duration > 0) {
      if (start < previousEnd) errors[`start-${order}`] = '앞 일정이 끝난 뒤에 시작하도록 시간을 조정해 주세요.';
      previousEnd = Math.max(previousEnd, start + duration);
    }
  });

  const totalEnd = steps.reduce((end, step) => {
    const start = Number(step.elapsed_min);
    const duration = Number(step.duration_min);
    return Number.isInteger(start) && start >= 0 && Number.isInteger(duration) && duration > 0
      ? Math.max(end, start + duration)
      : end;
  }, 0);
  if (totalEnd > sessionDuration) {
    errors.duration = `일정이 회차 진행 시간 ${sessionDuration}분을 넘습니다.`;
  }

  return errors;
}
