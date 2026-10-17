import { useEffect, useRef, useState } from 'react';
import { confirmedCoordinates, placeLinks } from '../experiencePresentation.js';
import { loadKakaoMaps } from './kakaoMapLoader.js';

export default function PlaceMap({ place }) {
  const container = useRef(null);
  const [mapState, setMapState] = useState({ key: '', status: 'loading' });
  const coordinates = confirmedCoordinates(place);
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;
  const address = place?.road_address || place?.address || '';
  const mapKey = `${place?.place_id}:${address}:${latitude}:${longitude}`;
  const links = placeLinks(place);

  useEffect(() => {
    if (!container.current) return undefined;
    let active = true;
    let marker;
    let observer;
    setMapState({ key: mapKey, status: 'loading' });

    function drawMap(maps, point) {
      if (!active || !container.current) return;
      const position = new maps.LatLng(point.latitude, point.longitude);
      const map = new maps.Map(container.current, { center: position, level: 3 });
      marker = new maps.Marker({ map, position });
      observer = new ResizeObserver(() => { map.relayout(); map.setCenter(position); });
      observer.observe(container.current);
      // Kakao Local API geocoding output is used only for this live map render.
      // It is never written to the database or browser storage.
      setMapState({ key: mapKey, status: 'ready' });
    }

    loadKakaoMaps().then(maps => {
      if (latitude != null && longitude != null) {
        drawMap(maps, { latitude, longitude });
        return;
      }
      if (!address || !maps.services?.Geocoder) {
        setMapState({ key: mapKey, status: address ? 'unavailable' : 'no-address' });
        return;
      }
      const geocoder = new maps.services.Geocoder();
      geocoder.addressSearch(address, (results, status) => {
        if (!active) return;
        if (status !== maps.services.Status.OK || !results?.[0]) {
          setMapState({ key: mapKey, status: 'not-found' });
          return;
        }
        const longitudeFromLookup = Number(results[0].x);
        const latitudeFromLookup = Number(results[0].y);
        if (!Number.isFinite(latitudeFromLookup) || !Number.isFinite(longitudeFromLookup)) {
          setMapState({ key: mapKey, status: 'not-found' });
          return;
        }
        drawMap(maps, { latitude: latitudeFromLookup, longitude: longitudeFromLookup });
      });
    }).catch(error => {
      if (active) setMapState({ key: mapKey, status: error.message === 'MAP_CONFIGURATION_MISSING' ? 'configuration' : 'unavailable' });
    });
    return () => { active = false; marker?.setMap(null); observer?.disconnect(); };
  }, [address, latitude, longitude, mapKey]);

  const currentMapState = mapState.key === mapKey ? mapState.status : 'loading';
  const mapMessage = {
    loading: '지도를 불러오는 중입니다.',
    configuration: '지도를 표시하려면 카카오 지도 JavaScript 키와 허용 도메인 설정이 필요합니다.',
    unavailable: '지도를 불러올 수 없습니다. 아래 지도 링크나 주소를 확인해 주세요.',
    'no-address': '확인된 주소가 아직 등록되지 않았습니다.',
    'not-found': '주소에서 지도 위치를 찾지 못했습니다. 주소를 확인해 주세요.',
  }[currentMapState];

  return (
    <div className="let-place-map">
      <div className="let-map-shell">
        <div className="let-map-canvas" ref={container} role="region" aria-label={`${place?.place_name || '체험 장소'} 위치 지도`} />
        {currentMapState !== 'ready' ? <div className="let-map-placeholder">{mapMessage || '지도를 표시할 수 없습니다.'}</div> : null}
      </div>
      <div className="let-map-links">
        {links.map ? <a href={links.map} target="_blank" rel="noopener noreferrer">지도에서 보기 ↗</a> : null}
        {links.directions ? <a href={links.directions} target="_blank" rel="noopener noreferrer">길찾기 ↗</a> : null}
        {links.search ? <a href={links.search} target="_blank" rel="noopener noreferrer">주소로 지도 검색 ↗</a> : null}
      </div>
    </div>
  );
}
