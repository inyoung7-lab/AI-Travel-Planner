let pending;

export function loadKakaoMaps() {
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  const key = import.meta.env.VITE_KAKAO_MAP_JAVASCRIPT_KEY;
  if (!key) return Promise.reject(new Error('MAP_CONFIGURATION_MISSING'));
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => fail(), 12000);
    function fail() {
      clearTimeout(timeout);
      script.remove();
      pending = undefined;
      reject(new Error('MAP_LOAD_FAILED'));
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.kakao?.maps?.load) return fail();
      window.kakao.maps.load(() => {
        clearTimeout(timeout);
        if (!window.kakao.maps.Map) return fail();
        resolve(window.kakao.maps);
      });
    };
    document.head.appendChild(script);
  });
  return pending;
}
