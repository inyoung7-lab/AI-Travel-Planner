import './ExperienceTimelineEditor.css';
import { validateExperienceSteps } from '../experienceStepValidation.js';

function clockLabel(date, minuteOffset) {
  if (!date) return '시작 시간을 선택해 주세요';
  const start = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(start.getTime())) return '시작 시간을 선택해 주세요';
  const minutes = Math.floor(start.getTime() / 60000) + minuteOffset;
  const at = new Date(minutes * 60000);
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(at);
}

function scheduleEnd(steps) {
  return steps.reduce((end, step) => Math.max(end, Number(step.elapsed_min) + Number(step.duration_min)), 0);
}

export default function ExperienceTimelineEditor({
  date,
  startTime,
  sessionDuration,
  steps,
  onChange,
  onSave,
  changed,
  saving,
  loading,
  loadError,
  message,
}) {
  const errors = validateExperienceSteps(steps, sessionDuration);

  function update(index, key, value) {
    onChange(steps.map((step, current) => current === index ? { ...step, [key]: value } : step));
  }

  function addStep() {
    const offset = scheduleEnd(steps);
    onChange([...steps, {
      elapsed_min: offset,
      duration_min: 15,
      title: '',
      description: '',
    }]);
  }

  function removeStep(index) {
    onChange(steps.filter((_, current) => current !== index));
  }

  function moveStep(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    let elapsed = 0;
    onChange(next.map((step) => {
      const moved = { ...step, elapsed_min: elapsed };
      elapsed += Number(step.duration_min) || 0;
      return moved;
    }));
  }

  return (
    <section id="le-experience-timeline" className="le-timeline-card" aria-labelledby="le-timeline-title">
      <div className="le-card-heading">
        <div><span className="le-overline">03 · EXPERIENCE FLOW</span><h2 id="le-timeline-title">프로그램 상세 일정</h2></div>
        <span className="le-session-id">체험 공통 일정 · {steps.length}단계</span>
      </div>
      <p className="le-timeline-intro">이 일정은 선택한 체험에 연결되어 다른 운영 회차에서도 함께 사용합니다. 시작 시간은 운영 회차가 바뀌면 자동으로 다시 계산됩니다.</p>

      {loading ? <p className="le-timeline-state">Supabase에서 상세 일정을 불러오는 중입니다…</p> : null}
      {!loading && loadError ? <p className="le-timeline-state le-timeline-error" role="alert">{loadError}</p> : null}
      {!loading && !loadError && steps.length === 0 ? (
        <div className="le-timeline-empty"><p>아직 등록한 상세 일정이 없습니다.</p><button className="le-button-secondary" type="button" onClick={addStep}>첫 일정 추가</button></div>
      ) : null}

      {!loading && !loadError && steps.length > 0 ? (
        <div className="le-timeline-table-wrap">
          <table className="le-timeline-table">
            <thead><tr><th scope="col">순서</th><th scope="col">시작 시간</th><th scope="col">소요</th><th scope="col">활동 제목</th><th scope="col">상세 내용</th><th scope="col">관리</th></tr></thead>
            <tbody>
              {steps.map((step, index) => {
                const order = index + 1;
                return (
                  <tr key={step.step_id || `new-${order}`}>
                    <td data-label="순서"><span className="le-step-order">{String(order).padStart(2, '0')}</span></td>
                    <td data-label="시작 시간">
                      <strong className="le-step-time">{clockLabel(date, startTime ? Number(startTime.split(':')[0]) * 60 + Number(startTime.split(':')[1]) + Number(step.elapsed_min) : 0)}</strong>
                      <label className="le-step-offset-input">시작 후
                        <input aria-label={`${order}번 일정 시작 경과 시간(분)`} type="number" min="0" max="1439" step="1" value={step.elapsed_min} onChange={(event) => update(index, 'elapsed_min', event.target.value)} />
                        분
                      </label>
                      {errors[`start-${order}`] ? <span className="le-step-error">{errors[`start-${order}`]}</span> : null}
                    </td>
                    <td data-label="소요"><label className="le-step-duration"><input aria-label={`${order}번 일정 소요 시간(분)`} type="number" min="1" max="1440" step="1" value={step.duration_min} onChange={(event) => update(index, 'duration_min', event.target.value)} /><span>분</span></label>{errors[`duration-${order}`] ? <span className="le-step-error">{errors[`duration-${order}`]}</span> : null}</td>
                    <td data-label="활동 제목"><input className="le-step-title" aria-label={`${order}번 일정 제목`} maxLength="200" value={step.title} onChange={(event) => update(index, 'title', event.target.value)} placeholder="예: 호스트와 만남" />{errors[`title-${order}`] ? <span className="le-step-error">{errors[`title-${order}`]}</span> : null}</td>
                    <td data-label="상세 내용"><textarea aria-label={`${order}번 일정 상세 내용`} maxLength="4000" rows="2" value={step.description || ''} onChange={(event) => update(index, 'description', event.target.value)} placeholder="참가자가 알아야 할 내용을 적어 주세요." /></td>
                    <td data-label="관리"><div className="le-step-actions"><button type="button" aria-label={`${order}번 일정 위로`} onClick={() => moveStep(index, -1)} disabled={index === 0}>↑</button><button type="button" aria-label={`${order}번 일정 아래로`} onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1}>↓</button><button type="button" aria-label={`${order}번 일정 삭제`} onClick={() => removeStep(index)}>삭제</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {errors.duration ? <p className="le-timeline-error le-timeline-summary-error" role="alert">{errors.duration}</p> : null}
      {steps.length > 0 && <p className="le-timeline-total">상세 일정 총 {scheduleEnd(steps)}분 · 운영 회차 {sessionDuration}분</p>}

      <div className="le-timeline-footer">
        {steps.length > 0 && <button className="le-button-secondary" type="button" onClick={addStep} disabled={loading || saving}>+ 일정 행 추가</button>}
        <button className="le-button-primary" type="button" onClick={onSave} disabled={!changed || saving || loading || Boolean(loadError) || Object.keys(errors).length > 0}>
          {saving ? '일정 저장 중…' : '상세 일정 저장'}
        </button>
      </div>
      {message ? <p className="le-message" role="status">{message}</p> : null}
    </section>
  );
}
