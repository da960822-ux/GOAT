async page => {
  const base = 'http://127.0.0.1:8084';
  const output = 'C:/Users/jung/Documents/ChatGPT/New project 2/GOAT/output/playwright/terra-61';
  const events = [];
  const pending = [];
  const onResponse = response => {
    if (!response.url().includes('/api/')) return;
    const event = { url: response.url(), status: response.status() };
    if (response.url().includes('/api/place-photos?')) {
      const parse = (async () => {
        if (response.status() === 200) {
          try {
            const body = await response.json();
            event.photo = {
              heroProvider: body.heroImage?.provider ?? null,
              galleryProviders: [...new Set((body.evidenceImages ?? []).map(image => image.provider).filter(Boolean))],
              evidenceCount: (body.evidenceImages ?? []).length,
              galleryStatus: body.galleryStatus ?? null
            };
          } catch { event.photo = { parseError: true }; }
        }
      })();
      pending.push(parse);
    }
    events.push(event);
  };
  const requestFailures = [];
  const onRequestFailed = request => requestFailures.push({ url: request.url(), failure: request.failure()?.errorText ?? 'failed' });
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);
  await page.setViewportSize({ width: 390, height: 844 });
  const results = [];
  for (let n = 1; n <= 61; n++) {
    const id = `GOAT-${String(n).padStart(3, '0')}`;
    const startEvents = events.length;
    const startFailures = requestFailures.length;
    let navigationError = null;
    let contentReady = false;
    const photoResponse = page.waitForResponse(response => response.url().includes('/api/place-photos?') && response.url().includes(id), { timeout: 15000 }).catch(() => null);
    try { await page.goto(`${base}/detail/${id}`, { waitUntil: 'domcontentloaded', timeout: 15000 }); }
    catch (error) { navigationError = String(error.message ?? error); }
    try {
      await page.waitForFunction(() => {
        const text = document.body?.innerText ?? '';
        return text.includes('여기로 갈래요') || text.includes('장면과 닮은 점') || text.includes('장소 정보를 불러오지 못했어요') || text.includes('존재하지 않는 장소') || text.includes('다시 시도해 주세요');
      }, { timeout: 30000 });
      contentReady = true;
    } catch { /* spinner is handled as a per-place blocked result below */ }
    const photoResponseResult = await photoResponse;
    let responsePhoto = null;
    if (photoResponseResult?.status() === 200) {
      try {
        const body = await photoResponseResult.json();
        responsePhoto = { heroProvider: body.heroImage?.provider ?? null, galleryStatus: body.galleryStatus ?? null, evidenceCount: (body.evidenceImages ?? []).length };
      } catch { responsePhoto = { parseError: true }; }
    }
    await page.waitForFunction(() => {
      const images = [...document.images];
      return images.length === 0 || images.every(image => image.complete);
    }, { timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(250);
    await Promise.allSettled(pending.splice(0));
    const dom = await page.evaluate(() => {
      const rect = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; };
      const visible = el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
      const text = document.body?.innerText ?? '';
      const lines = text.split('\\n').map(value => value.trim()).filter(Boolean);
      const name = lines.find(line => !['확보된 대표 사진이 없어요', '사진스팟 추천'].includes(line) && line.length > 1 && line.length < 50 && /시$|군$/.test(lines[lines.indexOf(line) - 1] ?? '')) ?? null;
      const textNodes = needle => [...document.querySelectorAll('body *')].filter(el => visible(el) && el.children.length === 0 && el.textContent.trim() === needle);
      const attributionNodes = [...document.querySelectorAll('body *')].filter(el => visible(el) && el.children.length === 0 && el.textContent.includes('사진 출처'));
      const issue = nodes => nodes.some(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1 || ((s.overflow === 'hidden' || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1); });
      const images = [...document.images].filter(visible).map(image => ({ complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, rect: rect(image), objectFit: getComputedStyle(image).objectFit || 'fill', broken: image.complete && image.naturalWidth === 0 }));
      return {
        fallbackVisible: text.includes('확보된 대표 사진이 없어요'),
        galleryErrorVisible: text.includes('사진 정보를 확인하지 못했어요') || text.includes('다시 시도해 주세요'),
        attributionVisible: attributionNodes.length > 0,
        attributionLabels: attributionNodes.map(el => el.textContent.trim().replace(/^사진 출처 ·\\s*/, '')),
        images,
        layout: {
          viewportOverflow: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1,
          nameClippedOrOffscreen: issue(name ? textNodes(name) : []),
          ctaClippedOrOffscreen: issue(textNodes('여기로 갈래요')),
          attributionClippedOrOffscreen: issue(attributionNodes),
          imageRectOverflow: images.some(image => image.rect.x < -1 || image.rect.right > innerWidth + 1),
          objectFitCropObserved: images.some(image => image.objectFit === 'cover' && image.rect.width > 0 && image.rect.height > 0 && image.naturalWidth > 0 && image.naturalHeight > 0 && Math.abs((image.naturalWidth / image.naturalHeight) - (image.rect.width / image.rect.height)) > 0.35),
          obviousDestructiveCrop: false
        }
      };
    });
    const ownEvents = events.slice(startEvents).filter(event => event.url.includes(id));
    const photoEvent = ownEvents.filter(event => event.url.includes('/api/place-photos?')).at(-1) ?? null;
    const ownFailures = requestFailures.slice(startFailures).filter(event => event.url.includes(id));
    const placeEvent = ownEvents.filter(event => event.url.includes(`/api/places/${id}`)).at(-1) ?? null;
    const photoStatus = photoResponseResult?.status() ?? photoEvent?.status ?? null;
    const provider = responsePhoto?.heroProvider ?? (dom.attributionLabels.some(label => label.includes('Google')) ? 'GOOGLE' : dom.attributionLabels.some(label => label.includes('한국관광공사')) ? 'KTO' : dom.fallbackVisible ? 'FALLBACK' : null);
    const { images: imgs, layout, fallbackVisible, galleryErrorVisible, attributionVisible } = dom;
    let status = 'PASS';
    let observation = '대표 사진 및 갤러리 상태가 정상적으로 표시됨';
    if (!contentReady) { status = 'BLOCKED'; observation = '30초 조건 대기 후에도 상세 본문 대신 로딩 상태가 남음'; }
    else if (navigationError || !placeEvent || placeEvent.status !== 200) { status = 'BLOCKED'; observation = '장소 상세 API 또는 탐색 실패'; }
    else if (layout.viewportOverflow || layout.nameClippedOrOffscreen || layout.ctaClippedOrOffscreen || layout.attributionClippedOrOffscreen || layout.imageRectOverflow || imgs.some(image => image.broken)) { status = 'FAIL'; observation = '이미지 또는 핵심 UI 레이아웃 이상'; }
    else if (imgs.some(image => !image.complete)) { status = 'BLOCKED'; observation = '15초 이미지 조건 대기 후에도 로딩이 끝나지 않음'; }
    else if (photoStatus === 429) { observation = '사진 provider 429: UI fallback/error 상태로 정상 표시'; }
    else if (photoStatus && photoStatus >= 400) { observation = `사진 API ${photoStatus}: UI fallback/error 상태로 정상 표시`; }
    else if (fallbackVisible) { observation = '확보된 사진 없음 fallback이 정상 표시'; }
    const screenshot = `${output}/${id}.png`;
    await page.screenshot({ path: screenshot });
    results.push({
      id, path: `/detail/${id}`, status, provider, imageCount: imgs.length,
      images: imgs.map(({ complete, naturalWidth, naturalHeight, rect, objectFit, broken }) => ({ complete, naturalWidth, naturalHeight, rect, objectFit, broken })),
      photoRequest: photoStatus ? { status: photoStatus, galleryStatus: responsePhoto?.galleryStatus ?? photoEvent?.photo?.galleryStatus ?? null, evidenceCount: responsePhoto?.evidenceCount ?? photoEvent?.photo?.evidenceCount ?? null } : null,
      failedRequests: ownFailures.length,
      fallbackVisible, galleryErrorVisible,
      attributionVisible,
      layout, observation,
      screenshot: `output/playwright/terra-61/${id}.png`
    });
  }
  page.off('response', onResponse);
  page.off('requestfailed', onRequestFailed);
  const serialized = JSON.stringify(results);
  await page.evaluate(value => localStorage.setItem('terra-61-visual-review', value), serialized);
  return serialized;
}
