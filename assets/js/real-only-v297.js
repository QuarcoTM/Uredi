(()=>{'use strict';
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}};
 const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(x||''));
 try{
  if(!localStorage.getItem('marketRealOnlyV297')){
   const retired=['marketMonetizationV241','marketPromotionWalletsV241','marketPromotionHistoryV241','marketPromotionPurchasesV241','marketListingPromotionsV241','marketCurrentUserV241','marketBetaBonusGrantsV245','marketBonusTop7MigrationV252','marketListingStatusV254','marketCompletedDealsV254','marketSellerReviewsV254','marketFavoritePriceSnapshotsV254','marketListingPricesV254','marketNotificationsV254','marketMaintenanceMode','marketBlockedSellers','pendingEmailChange','signoutAllRequested'];
   Object.keys(localStorage).filter(k=>/demo/i.test(k)||k.startsWith('marketFollow:')).forEach(k=>localStorage.removeItem(k));
   retired.forEach(k=>localStorage.removeItem(k));
   for(const key of ['favorites','compare']){const ids=read(key);localStorage.setItem(key,JSON.stringify((Array.isArray(ids)?ids:[]).filter(uuid)))}
   const old=read('marketRecentViewedV23');
   const ids=(Array.isArray(old)?old:[]).map(x=>x.id).filter(uuid);
   if(ids.length&&!localStorage.getItem('marketRecentIdsV297'))localStorage.setItem('marketRecentIdsV297',JSON.stringify(ids));
   localStorage.removeItem('marketRecentViewedV23');localStorage.setItem('marketRealOnlyV297','1');
  }
 }catch{}
 const file=location.pathname.split('/').pop();
 if(['category.html','brand.html'].includes(file)){
  const params=new URLSearchParams(location.search),name=params.get('name');params.delete('name');if(name)params.set(file==='category.html'?'category':'brand',name);location.replace('listings.html?'+params.toString());
 }
})();
