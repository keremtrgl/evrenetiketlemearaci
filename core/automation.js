(function(root){
  const A=typeof module!=='undefined'?require('./annotations.js'):root.EvrenAnnotations;
  function approve(annotations,policy){
    if(!annotations.length||annotations.length>20)return {ok:false,reason:'Nesne bulunamadı veya 20 kutu sınırı aşıldı'};
    const accepted=[];
    for(const a of annotations){
      const votes=a.ensemble?.votes||[],label=votes[0]?.results?.[0]?.label;
      const ids=votes.map(v=>v.modelId),identified=ids.some(Boolean);
      if(a.type!=='box'||votes.length<2||!label||(identified&&(ids.some(id=>!id)||new Set(ids).size!==ids.length))||votes.some(v=>{
        const first=v.results?.[0],second=v.results?.[1]?.score??0;
        return first?.label!==label||!Number.isFinite(first.score)||first.score<.90||first.score>1||!Number.isFinite(second)||second<0||second>1||first.score-second<.20;
      }))return {ok:false,reason:'İki uzmanın güçlü uzlaşması yok'};
      const siteClass=Object.hasOwn(policy.mappings||{},label)?policy.mappings[label]:label;
      if(policy.classes.filter(n=>n===siteClass).length!==1)return {ok:false,reason:'Tür mevcut bir sınıfa tekil eşlenmedi'};
      const result={...a,label,siteClass,reviewed:true,reviewMethod:'automatic-policy'};
      try{A.validate(result);}catch{return {ok:false,reason:'Kutu koordinatları geçersiz'};}
      accepted.push(result);
    }
    return {ok:true,annotations:accepted};
  }
  function wait(ms,signal){return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new Error('Durduruldu'));return;}
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(new Error('Durduruldu'));};
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});
  });}
  class Runner{
    constructor(deps){this.deps={wait,now:()=>performance.now(),...deps};this.running=false;this.controller=null;}
    stop(){this.controller?.abort();}
    async start({limit,perMinute}){
      if(this.running)throw new Error('Bir çalışma zaten sürüyor');
      if(!Number.isInteger(limit)||limit<1||limit>1000||!Number.isFinite(perMinute)||perMinute<1||perMinute>60)throw new Error('Çalışma sınırı 1–1000; hız 1–60 görsel/dakika olmalı');
      this.running=true;this.controller=new AbortController();const signal=this.controller.signal;
      const state={phase:'running',visited:0,completed:0,skipped:0,review:0,error:null};
      const emit=()=>this.deps.onUpdate?.({...state});emit();
      try{
        while(state.visited<limit&&!signal.aborted){
          const started=this.deps.now(),context=await this.deps.context(signal);if(signal.aborted)break;
          const result=await this.deps.process(context,signal);
          if(!['completed','skipped','review'].includes(result?.state))throw new Error('Görselin sonucu doğrulanamadı');
          state.visited++;state[result.state]++;emit();
          if(signal.aborted||state.visited>=limit)break;
          const pause=Math.max(0,60000/perMinute-(this.deps.now()-started));
          if(pause)await this.deps.wait(pause,signal);if(signal.aborted)break;
          const next=await this.deps.next(context,signal);if(next?.end)break;
        }
        state.phase=signal.aborted?'stopped':'finished';
      }catch(error){state.phase=signal.aborted?'stopped':'error';if(!signal.aborted)state.error=error.message;}
      finally{this.running=false;emit();}
      return {...state};
    }
  }
  const api={Runner,approve};if(typeof module!=='undefined')module.exports=api;else root.EvrenAutomation=api;
})(globalThis);
