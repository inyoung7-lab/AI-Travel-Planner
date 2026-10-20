import { useState } from 'react';
import { publicSupabase } from '../../../lib/supabaseClient.js';
import { isGeneratedExperienceImage, resolveExperienceImageUrl } from '../experienceImageSource.js';
import '../Traveler.css';

export default function ExperienceImage({ src, alt = '', eager = false }) {
  const [failedSource, setFailedSource] = useState(null);
  const safeSource = resolveExperienceImageUrl(src, publicSupabase);
  const isGenerated = isGeneratedExperienceImage(src);
  if (!safeSource || failedSource === safeSource) return (
    <div className="let-image-fallback" role="img" aria-label="대표 이미지 준비 중">
      <svg viewBox="0 0 400 240" aria-hidden="true" focusable="false">
        <circle cx="320" cy="54" r="31" fill="#FBC0B4" />
        <path d="M0 184Q95 102 202 178T400 144V240H0Z" fill="#EEE8DC" />
        <path d="M122 180V94h67v86m-56-69h45m-45 19h45m-45 19h45" fill="none" stroke="#1E3042" strokeWidth="4" />
        <path d="M205 180V120h48v60m-37-45h26m-26 16h26M102 180h173" fill="none" stroke="#E8695A" strokeWidth="4" />
      </svg>
      <span>{isGenerated ? 'AI 생성 이미지 연결 대기 중' : '대표 이미지 준비 중'}</span>
    </div>
  );
  return <div className="let-image-frame">
    <img className="let-experience-image" src={safeSource} alt={alt || (isGenerated ? 'AI 생성 이미지' : '')} loading={eager ? 'eager' : 'lazy'} onError={() => setFailedSource(safeSource)} />
    {isGenerated ? <span className="let-image-origin">AI 생성 이미지</span> : null}
  </div>;
}
