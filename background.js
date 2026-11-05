chrome.action.onClicked.addListener(tab=>{
  const url=new URL(chrome.runtime.getURL('app.html'));
  if(tab?.id && tab.url?.startsWith('https://evren.ssyz.org.tr/annotate/')) url.searchParams.set('sourceTab',String(tab.id));
  chrome.tabs.create({url:url.href});
});
