(function (root) {
  const normalize = s => (s || '').normalize('NFC').replace(/\bAI\b/g,'ai').replace(/\s+/g,' ').trim().toLocaleLowerCase('tr-TR');
  function delayUntilNext(lastStart, rpm, now) {
    if (!Number.isFinite(rpm) || rpm < 0.1 || rpm > 60) throw new Error('Hız 0,1–60 görsel/dakika aralığında olmalı');
    return lastStart === null ? 0 : Math.max(0, lastStart + 60000 / rpm - now);
  }
  async function runOne(adapter, options = {}) {
    function guard() {
      if (options.signal?.aborted) throw new Error('Durduruldu');
    }
    guard();
    const key = adapter.key();
    if (!key) throw new Error('Görsel kimliği okunamadı');
    function sameImage() {
      guard();
      if (adapter.key() !== key) throw new Error('Görsel değişti; işlem durduruldu');
    }
    if (adapter.wasSaved(key)) {
      await adapter.nextVerified();
      return {key, skipped:true};
    }
    await adapter.prepareMeta(); sameImage();
    const suggestions = await adapter.openSuggestions(); sameImage();
    if (suggestions.newClasses > 0 && !options.allowNewClasses)
      throw new Error('Yeni sınıf önerileri var; izin seçeneği kapalı');
    await adapter.confirmSuggestions(); sameImage();
    await adapter.waitForLabels(); sameImage();
    if (adapter.saveAndNextVerified) {
      await adapter.saveAndNextVerified();
    } else {
      await adapter.saveVerified(); sameImage();
      await adapter.nextVerified();
    }
    return {key, skipped:false};
  }
  const api = {runOne,normalize,delayUntilNext};
  if (typeof module !== 'undefined') module.exports = api;
  else root.EvrenLabelFlow = api;
})(globalThis);
