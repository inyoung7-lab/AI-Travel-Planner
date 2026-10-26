import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient.js';
import { agentInvocationErrorMessage, readPromptInjectionMessage } from '../agentInvocationError.js';
import './AiExperienceAgent.css';

const copy = {
  ko: { title: 'AI 체험 기획·진단', intro: '실제 체험 데이터와 출처가 있는 지역 자료를 조회해 상품성을 분석합니다. 결과는 AI 제안이며 운영 확정 전 HOST 검토가 필요합니다.', existing: '현재 체험 분석', idea: '새 아이디어 분석', ideaLabel: '체험 아이디어', ideaHint: '대상 고객, 장소, 활동을 가능한 한 구체적으로 적어 주세요.', analyze: 'AI 분석 실행', analyzing: '분석 중… 실제 자료 검색·평가·계산을 진행합니다.', retry: '다시 시도', score: '상품성 잠정 평가', criteria: ['참여 이유', 'HOST 고유 가치', '직접 참여', '기억할 결과물', '운영·안전'], cost: '시연 회비 시나리오', revenue: '예상 매출', directCost: '가정 직접비', unknown: '확인 전', risks: '운영 위험·확인 사항', evidence: '검색 근거', noEvidence: '확인된 지역 자료 부족. 실제 운영 전 현장 확인이 필요합니다.', alternatives: '개선 방향 비교', plan: '이 방향 상세 기획', planning: '상세 기획 생성 중…', planTitle: 'HOST 검토용 운영안', audience: '참가 대상', duration: '권장 시간', hostRole: 'HOST 역할', output: '참가자 결과물', materials: '준비물', included: '제공 사항', excluded: '불포함', meeting: '집결 고려사항', pricing: '가격·원가 검증', safety: '안전·법적 확인', preparation: '운영 준비', edit: '상세 소개 초안 편집', review: 'AI 제안을 검토했고, 직접 확인하지 않은 제공 서비스는 확정 내용으로 쓰지 않겠습니다.', handoff: '현재 체험 소개 입력란으로 복사', handoffDone: '입력란에 복사했습니다. 기존 ‘체험 소개 저장’ 버튼을 눌러야 Supabase에 반영됩니다.', ideaWarning: '새 아이디어도 현재 선택한 체험의 소개 입력란으로 복사됩니다. 대상 체험을 먼저 확인해 주세요.', notice: 'AI 생성 제안 · HOST 검토 필요', payment: { free: '무료', cost_share: '실비', paid: '유료', undetermined: '미정' }, minutes: '분', people: '명', won: '원', tool: '실행한 도구', limits: '요청이 제한되면 잠시 후 다시 시도해 주세요.' },
  en: { title: 'AI Experience Planning & Review', intro: 'The agent checks actual experiences and cited local sources. This is an AI proposal that the HOST must review before operation.', existing: 'Analyze this experience', idea: 'Analyze a new idea', ideaLabel: 'Experience idea', ideaHint: 'Describe the audience, place and activity.', analyze: 'Run AI analysis', analyzing: 'Analyzing… searching, scoring and calculating', retry: 'Retry', score: 'Provisional value score', criteria: ['Reason to join', 'Unique HOST value', 'Active participation', 'Memorable outcome', 'Operations & safety'], cost: 'Demo fee scenario', revenue: 'Potential revenue', directCost: 'Assumed direct cost', unknown: 'Unknown', risks: 'Risks and checks', evidence: 'Retrieved sources', noEvidence: 'Insufficient verified local sources. Check on site before operating.', alternatives: 'Compare improvements', plan: 'Develop this direction', planning: 'Creating plan…', planTitle: 'Plan for HOST review', audience: 'Audience', duration: 'Suggested duration', hostRole: 'HOST role', output: 'Participant outcome', materials: 'Materials', included: 'Included', excluded: 'Excluded', meeting: 'Meeting point checks', pricing: 'Price and cost checks', safety: 'Safety and legal checks', preparation: 'Preparation', edit: 'Edit description draft', review: 'I have reviewed this AI proposal and will not present unverified services as confirmed.', handoff: 'Copy to current experience editor', handoffDone: 'Copied to the editor. Use the existing Save Description button to update Supabase.', ideaWarning: 'A new idea is copied into the currently selected experience. Check the target first.', notice: 'AI-generated proposal · HOST review required', payment: { free: 'Free', cost_share: 'Cost-sharing', paid: 'Paid', undetermined: 'Undetermined' }, minutes: 'min', people: 'people', won: 'KRW', tool: 'Tools executed', limits: 'If rate-limited, try again later.' },
  ja: { title: 'AI体験企画・診断', intro: '登録済み体験と出典のある地域資料を調べます。結果はAIの提案であり、運営前にHOSTの確認が必要です。', existing: 'この体験を分析', idea: '新しいアイデアを分析', ideaLabel: '体験アイデア', ideaHint: '対象、場所、活動を具体的に入力してください。', analyze: 'AI分析を実行', analyzing: '分析中…資料検索・評価・計算', retry: '再試行', score: '暫定的な価値評価', criteria: ['参加する理由', 'HOST独自の価値', '参加者の活動', '記憶に残る成果', '運営と安全'], cost: 'デモ参加費の試算', revenue: '想定売上', directCost: '仮定の直接費', unknown: '未確認', risks: 'リスクと確認事項', evidence: '検索した根拠', noEvidence: '確認済みの地域資料が不足しています。運営前に現地確認が必要です。', alternatives: '改善案の比較', plan: 'この案の詳細を作成', planning: '詳細案を作成中…', planTitle: 'HOST確認用運営案', audience: '対象者', duration: '推奨時間', hostRole: 'HOSTの役割', output: '参加者の成果', materials: '準備物', included: '提供内容', excluded: '含まれないもの', meeting: '集合場所の確認', pricing: '価格・原価の確認', safety: '安全・法的確認', preparation: '運営準備', edit: '紹介文の下書きを編集', review: 'AI提案を確認し、未確認のサービスを確定事項として記載しません。', handoff: '現在の体験の編集欄にコピー', handoffDone: '編集欄にコピーしました。Supabaseへの反映には既存の保存ボタンを押してください。', ideaWarning: '新しいアイデアも現在選択中の体験にコピーされます。対象を確認してください。', notice: 'AI生成の提案 · HOSTの確認が必要', payment: { free: '無料', cost_share: '実費', paid: '有料', undetermined: '未定' }, minutes: '分', people: '名', won: 'ウォン', tool: '実行されたツール', limits: '利用制限の場合、しばらくしてから再試行してください。' },
};

const criteriaKeys = ['participation_reason', 'host_unique_value', 'active_participation', 'memorable_outcome', 'operational_safety'];

async function invokeAgent(body) {
  if (!supabase) throw new Error('Supabase 연결 설정을 확인해 주세요.');
  const { data, error } = await supabase.functions.invoke('local-eum-agent', { body });
  if (error) throw new Error(await readPromptInjectionMessage(error, body.locale) || agentInvocationErrorMessage(error, body.locale));
  return data;
}

function ValueList({ items }) { return <ul>{(items || []).map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>; }

export default function AiExperienceAgent({ experience, session, locale, onCopyDraft, onBusyChange, readOnly = false, initialAnalysis = null }) {
  const language = copy[locale] ? locale : 'ko';
  const t = copy[language];
  const [mode, setMode] = useState('existing');
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [planResult, setPlanResult] = useState(null);
  const [lastAlternative, setLastAlternative] = useState(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    onBusyChange?.(Boolean(busy));
    return () => onBusyChange?.(false);
  }, [busy, onBusyChange]);

  function selectMode(nextMode) {
    setMode(nextMode);
    setAnalysis(null); setPlanResult(null); setLastAlternative(null); setReviewed(false); setMessage(''); setError('');
  }

  function baseRequest(action, selectedAlternative = null) {
    return { action, mode, locale: language, ...(mode === 'existing' ? { experienceId: experience.experience_id, sessionId: session.session_id } : { idea: idea.trim() }), ...(selectedAlternative ? { selectedAlternative } : {}) };
  }

  async function analyze() {
    if (readOnly) return;
    setBusy('analyze'); setError(''); setMessage(''); setAnalysis(null); setPlanResult(null); setLastAlternative(null); setReviewed(false);
    try { setAnalysis(await invokeAgent(baseRequest('analyze'))); }
    catch (problem) { setError(problem.message); }
    finally { setBusy(''); }
  }

  async function makePlan(alternative) {
    if (readOnly) return;
    setBusy('plan'); setError(''); setMessage(''); setPlanResult(null); setLastAlternative(alternative); setReviewed(false);
    try {
      const result = await invokeAgent(baseRequest('plan', `${alternative.title}: ${alternative.concept}`.slice(0, 1500)));
      setPlanResult(result);
      setDescriptionDraft(result.report.plan?.detailDescription || '');
    } catch (problem) { setError(problem.message); }
    finally { setBusy(''); }
  }

  const report = analysis?.report;
  const plan = planResult?.report?.plan;
  return <section className="le-ai-agent" aria-labelledby="le-ai-agent-title">
    <div className="le-ai-agent-heading"><span className="le-overline">LOCAL EUM · AI AGENT</span><h2 id="le-ai-agent-title">{t.title}</h2><p>{t.intro}</p><strong>{t.notice}</strong></div>
    <div className="le-ai-agent-modes" role="group" aria-label={t.title}>
      <button type="button" className={mode === 'existing' ? 'active' : ''} aria-pressed={mode === 'existing'} disabled={readOnly || Boolean(busy)} onClick={() => selectMode('existing')}>{t.existing}: {experience.title}</button>
      <button type="button" className={mode === 'idea' ? 'active' : ''} aria-pressed={mode === 'idea'} disabled={readOnly || Boolean(busy)} onClick={() => selectMode('idea')}>{t.idea}</button>
    </div>
    {mode === 'idea' ? <label className="le-ai-agent-idea">{t.ideaLabel}<textarea rows="4" maxLength="2000" value={idea} disabled={readOnly || Boolean(busy)} placeholder={t.ideaHint} onChange={(event) => { setIdea(event.target.value); setAnalysis(null); setPlanResult(null); setLastAlternative(null); setReviewed(false); setMessage(''); }} /></label> : null}
    <button className="le-button-primary" type="button" onClick={analyze} disabled={readOnly || Boolean(busy) || (mode === 'idea' && idea.trim().length < 10)}>{busy === 'analyze' ? t.analyzing : t.analyze}</button>
    {busy ? <p className="le-ai-agent-progress" role="status" aria-live="polite">{busy === 'plan' ? t.planning : t.analyzing}</p> : null}
    {error ? <div className="le-ai-agent-error" role="alert"><p>{error}</p><p>{t.limits}</p><button type="button" disabled={readOnly || Boolean(busy)} onClick={() => (lastAlternative ? makePlan(lastAlternative) : analyze())}>{t.retry}</button></div> : null}
    {report ? <div className="le-ai-agent-report">
      <h3>{report.headline}</h3><p>{report.motivation}</p><p>{report.positioning}</p>
      <div className="le-ai-agent-columns"><div><h4>{t.score}: {analysis.evaluation.total}/{analysis.evaluation.maximum}</h4><p>{analysis.evaluation.rubric}</p><ol>{analysis.evaluation.criteria.map((item) => <li key={item.key}><strong>{t.criteria[criteriaKeys.indexOf(item.key)]}: {item.score}/4</strong> — {item.evidence}</li>)}</ol></div><div><h4>{t.cost}</h4><p>{analysis.cost.attendees} {t.people} · {t.revenue}: {analysis.cost.revenue === null ? t.unknown : `${analysis.cost.revenue.toLocaleString()} ${t.won}`}</p><p>{t.directCost}: {analysis.cost.directCost === null ? t.unknown : `${analysis.cost.directCost.toLocaleString()} ${t.won}`}</p><small>{analysis.cost.note}</small></div></div>
      <h4>{t.risks}</h4><ValueList items={report.risks} />
      <h4>{t.evidence}</h4>{analysis.citations.length ? <ul>{analysis.citations.map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a> · {item.checkedAt}<p>{item.fact}</p></li>)}</ul> : <p>{t.noEvidence}</p>}
      <h4>{t.alternatives}</h4><div className="le-ai-agent-alternatives">{report.alternatives.map((item, index) => <article key={`${index}-${item.title}`}><h5>{item.title}</h5><p>{item.concept}</p><p>{item.distinctValue}</p><p>{t.payment[item.paymentModel]}</p><p>{item.hostService}</p><ValueList items={item.prerequisites} /><button type="button" className="le-button-secondary" disabled={readOnly || Boolean(busy)} onClick={() => makePlan(item)}>{t.plan}</button></article>)}</div>
      <details><summary>{t.tool}</summary><ul>{analysis.trace.map((item) => <li key={item.tool}>{item.tool} · {item.outcome} · {item.count}</li>)}</ul></details>
    </div> : null}
    {plan ? <div className="le-ai-agent-plan"><h3>{t.planTitle}: {plan.title}</h3><p>{plan.tagline}</p><p>{plan.customerValue}</p><p><strong>{t.audience}:</strong> {plan.audience} · <strong>{t.duration}:</strong> {plan.durationMinutes} {t.minutes}</p><ol>{plan.timeline.map((step, index) => <li key={`${index}-${step.minute}`}><strong>{step.minute} {t.minutes}: {step.activity}</strong><div>{t.hostRole}: {step.hostRole}</div><div>{t.output}: {step.participantOutput}</div></li>)}</ol><div className="le-ai-agent-columns"><div><h4>{t.materials}</h4><ValueList items={plan.materials} /><h4>{t.included}</h4><ValueList items={plan.included} /><h4>{t.excluded}</h4><ValueList items={plan.excluded} /></div><div><h4>{t.meeting}</h4><p>{plan.meetingConsiderations}</p><h4>{t.pricing}</h4><p>{plan.priceValidation}</p><h4>{t.safety}</h4><ValueList items={plan.safetyLegalChecks} /><h4>{t.preparation}</h4><ValueList items={plan.preparationTasks} /></div></div><label className="le-ai-agent-idea">{t.edit}<textarea rows="8" maxLength="20000" value={descriptionDraft} onChange={(event) => { setDescriptionDraft(event.target.value); setReviewed(false); setMessage(''); }} /></label>{mode === 'idea' ? <p>{t.ideaWarning} <strong>{experience.title}</strong></p> : null}<label className="le-ai-agent-review"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />{t.review}</label><button className="le-button-primary" type="button" disabled={!reviewed || !descriptionDraft.trim()} onClick={() => { onCopyDraft(descriptionDraft.trim()); setMessage(t.handoffDone); }}>{t.handoff}</button>{message ? <p role="status">{message}</p> : null}</div> : null}
  </section>;
}
