// Isolated browser checks using an offline fixture produced by check-demo-sql.mjs.
// Arguments: Playwright module path, fixture JSON path, output directory.
// All Supabase requests are intercepted; this never changes the remote database.
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const { chromium }=await import(pathToFileURL(resolve(process.argv[2])).href);
const fixture=JSON.parse(await readFile(process.argv[3],'utf8'));
const output=resolve(process.argv[4]);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
  const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'Asia/Seoul'});
  await context.route('https://rhkaxmqdkztpbljkunxb.supabase.co/**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    if(!url.pathname.startsWith('/rest/v1/') || request.method()!=='GET') return route.abort();
    const table=url.pathname.split('/').at(-1);
    let data=[...(fixture[table]||[])];
    for(const [column,condition] of url.searchParams){
      if(['select','order','limit','offset'].includes(column)) continue;
      if(condition.startsWith('eq.')) data=data.filter(row=>String(row[column])===condition.slice(3));
      if(condition.startsWith('like.')) data=data.filter(row=>String(row[column]||'').startsWith(condition.slice(5).replace(/%$/,'')));
      if(condition.startsWith('in.(')) {const values=condition.slice(4,-1).split(',');data=data.filter(row=>values.includes(String(row[column])));}
    }
    if(url.searchParams.has('order')){
      const [column,order]=url.searchParams.get('order').split('.');
      data.sort((a,b)=>String(a[column]).localeCompare(String(b[column]))*(order==='desc'?-1:1));
    }
    const single=(request.headers().accept||'').includes('vnd.pgrst.object');
    await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(single?data[0]:data)});
  });
  const page=await context.newPage();
  await page.clock.install({time:new Date('2026-10-16T09:00:00Z')});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const watermark=async()=>page.evaluate(()=>{
    const label=document.createElement('div');label.id='offline-test-watermark';
    label.textContent='로컬 SQL 시연자료 검증 화면 · 원격 Supabase 적용 전';
    Object.assign(label.style,{position:'fixed',bottom:'10px',right:'10px',zIndex:'100000',background:'#1E3042',color:'#fff',padding:'9px 14px',borderRadius:'8px',fontSize:'12px',boxShadow:'0 4px 20px #0002'});
    document.body.append(label);
  });
  await page.goto('http://127.0.0.1:5173/local-eum');
  await page.locator('.let-experience-card').nth(9).waitFor();
  assert.equal(await page.locator('.let-experience-card').count(),10);
  await page.getByRole('button',{name:'서울',exact:true}).click();
  assert.equal(await page.locator('.let-experience-card').count(),5);
  await page.getByRole('button',{name:'부산',exact:true}).click();
  assert.equal(await page.locator('.let-experience-card').count(),2);
  await page.getByRole('button',{name:'창원',exact:true}).click();
  assert.equal(await page.locator('.let-experience-card').count(),3);
  await page.getByRole('button',{name:'전체',exact:true}).click();
  await page.getByRole('searchbox',{name:'체험명 검색'}).fill('성수동공방');
  assert.equal(await page.locator('.let-experience-card').count(),1);
  await page.getByRole('searchbox',{name:'체험명 검색'}).fill('없는체험명');
  await page.getByRole('heading',{name:'조건에 맞는 체험이 없습니다'}).waitFor();
  await page.getByRole('button',{name:'전체 체험 보기'}).click();
  await watermark();
  await page.screenshot({path:resolve(output,'catalog-desktop.offline.png'),fullPage:true});
  console.log('PASS 10 cards; Seoul 5 / Busan 2 / Changwon 3; Korean search and empty state');
  for(const experience of fixture.lc_experiences.filter(item=>item.is_demo)){
    await page.goto(`http://127.0.0.1:5173/local-eum/experiences/${experience.experience_id}`);
    await page.getByRole('heading',{name:experience.title,exact:true,level:1}).waitFor();
    assert.equal(await page.locator('.let-timeline>li').count(),4);
    assert.ok(await page.getByText('시연용 · 실제 예약 불가',{exact:true}).count()>0);
    assert.equal(await page.locator('.let-map-canvas').count(),0);
  }
  console.log('PASS all 10 detail routes show matching titles and four steps; no fake markers');
  const seongsu=fixture.lc_experiences.find(item=>item.demo_code==='DEMO-01');
  await page.goto(`http://127.0.0.1:5173/local-eum/experiences/${seongsu.experience_id}`);
  await page.getByRole('heading',{name:seongsu.title,exact:true,level:1}).waitFor();
  await watermark();
  await page.screenshot({path:resolve(output,'seongsu-detail.offline.png'),fullPage:true});
  const demoSession=fixture.lc_sessions.find(item=>item.seed_code==='LE-DEMO-01-SESSION');
  demoSession.fee_amount=21000;
  await page.reload();
  await page.getByRole('heading',{name:seongsu.title,exact:true,level:1}).waitFor();
  assert.ok((await page.locator('.let-summary-facts').innerText()).includes('21,000원'));
  await page.goto('http://127.0.0.1:5173/local-eum');
  await page.locator('.let-experience-card').nth(9).waitFor();
  assert.ok((await page.locator('.let-experience-card').filter({hasText:seongsu.title}).innerText()).includes('21,000원'));
  console.log('PASS detail and list re-fetch changed session price from data source (offline fixture only)');
  demoSession.fee_amount=18000;
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.locator('.let-experience-card').nth(9).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await watermark();
  await page.screenshot({path:resolve(output,'catalog-mobile.offline.png'),fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS mobile catalog has no horizontal overflow; no page runtime errors');
  const realContext=await browser.newContext({viewport:{width:1440,height:1000}});
  await realContext.route('https://rhkaxmqdkztpbljkunxb.supabase.co/**',route=>
    route.request().method()==='GET' ? route.continue() : route.abort());
  const actual=await realContext.newPage();
  await actual.goto('http://127.0.0.1:5173/local-eum');
  await actual.getByText('체험 정보가 아직 준비 중입니다. 잠시 후 다시 확인해 주세요.').waitFor();
  await actual.goto('http://127.0.0.1:5173/local-eum/host/sessions/1/edit');
  await actual.getByRole('heading',{name:'호스트 계정으로 로그인해 주세요'}).waitFor();
  await actual.goto('http://127.0.0.1:5173/');
  await actual.getByRole('heading',{name:'메인페이지',exact:true}).waitFor();
  console.log('PASS real read-only connection shows pending DB state; existing HOST login and team home route retained');
  await realContext.close();
  console.log(`Screenshots: ${output}`);
} finally {await browser.close();}
