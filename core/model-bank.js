(function(root){
  const domains=['biodiversity','plants','blood','malaria','general'];
  function route(models,domain){
    if(!domains.includes(domain))throw new Error('Geçerli bir model alanı seç');
    const result=models.filter(m=>m.domain===domain && m.enabled!==false);
    if(!result.length)throw new Error('Bu alanda etkin bir yerel model yok');
    return result;
  }
  function summarize(votes,threshold=.75,margin=.15){
    if(!Array.isArray(votes)||!votes.length)throw new Error('Model sonucu yok');
    for(const v of votes)if(!v.results?.length||v.results.some(p=>typeof p.label!=='string'||!p.label.trim()||!Number.isFinite(p.score)||p.score<0||p.score>1))throw new Error('Geçersiz model sonucu');
    const top=votes.map(v=>v.results[0]);
    if(new Set(top.map(p=>p.label)).size>1)return {state:'disagreement',label:null,votes};
    if(votes.some(v=>v.results[0].score<threshold||v.results[0].score-(v.results[1]?.score||0)<margin))return {state:'uncertain',label:null,votes};
    return {state:votes.length>1?'agreement':'single',label:top[0].label,votes};
  }
  const api={domains,route,summarize};if(typeof module!=='undefined')module.exports=api;else root.EvrenModelBank=api;
})(globalThis);
