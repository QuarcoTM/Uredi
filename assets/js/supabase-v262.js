(()=>{
  'use strict';

  const cfg=window.SITE_CONFIG||{};
  if(!cfg.supabaseEnabled)return;

  const toast=(msg)=>window.marketToast?window.marketToast(msg):alert(msg);
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const file=()=>((location.pathname.split('/').pop()||'index.html').toLowerCase());
  const abs=(path)=>new URL(path,cfg.supabaseRedirectBase||location.href).href;
  const emailOk=(v)=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v||'').trim());
  const passOk=(v)=>String(v||'').length>=8&&/[A-Za-zА-Яа-яЁё]/.test(String(v||''))&&/\d/.test(String(v||''));
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const busy=(btn,on,label)=>{if(!btn)return;if(on){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=label||'Моля, изчакай…'}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent;delete btn.dataset.oldText}};

  if(!window.supabase?.createClient){
    console.error('Supabase JS library is unavailable.');
    document.documentElement.dataset.supabaseUnavailable='1';
    return;
  }

  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
    global:{headers:{'X-Client-Info':'uredi-web/2.60'}}
  });
  window.UrediSupabase=client;

  const authPages=new Set(['login.html','register.html','forgot-password.html','verify-email.html']);
  const protectedPages=new Set([
    'profile.html','profile-edit.html','profile-settings.html','account-security.html','data-rights.html',
    'my-ads.html','messages.html','notifications.html','saved-searches.html','profile-promotions.html',
    'post-ad.html','edit-ad.html','promote.html','checkout.html','report.html'
  ]);

  const humanizeError=(error)=>{
    const m=String(error?.message||error||'').toLowerCase();
    if(m.includes('invalid login credentials'))return 'Невалиден email или парола.';
    if(m.includes('email not confirmed'))return 'Потвърди email адреса си преди вход.';
    if(m.includes('user already registered')||m.includes('already been registered'))return 'Вече има профил с този email адрес.';
    if(m.includes('password should be')||m.includes('weak password'))return 'Паролата трябва да е минимум 8 символа и да съдържа буква и цифра.';
    if(m.includes('rate limit'))return 'Има твърде много опити. Изчакай малко и опитай отново.';
    if(m.includes('otp')||m.includes('verification code'))return 'Кодът не е валиден или е изтекъл.';
    return error?.message||'Възникна грешка. Опитай отново.';
  };

  async function getSession(){
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    return data.session||null;
  }

  async function loadAccount(userId){
    if(!userId)return null;
    const [{data:profile,error:pErr},{data:priv,error:prErr},{data:dealer,error:dErr}]=await Promise.all([
      client.from('profiles').select('id,display_name,profile_type,account_status,avatar_path,city').eq('id',userId).maybeSingle(),
      client.from('profile_private').select('phone,show_phone').eq('user_id',userId).maybeSingle(),
      client.from('dealer_profiles').select('company_name,eik,company_city,vat_number,business_address,business_phone,business_email,verification_status').eq('user_id',userId).maybeSingle()
    ]);
    if(pErr)throw pErr;
    if(prErr)console.warn(prErr);
    if(dErr)console.warn(dErr);
    return {profile,private:priv,dealer};
  }

  async function syncLegacyUser(session){
    const user=session?.user;
    if(!user)return null;
    try{
      const account=await loadAccount(user.id);
      const p=account?.profile||{};
      const d=account?.dealer||{};
      window.MarketMonetization?.setCurrentUser?.({
        id:user.id,
        name:p.display_name||user.user_metadata?.display_name||user.email?.split('@')[0]||'Потребител',
        type:p.profile_type==='dealer'?'dealer':'private',
        email:user.email||'',
        companyName:d.company_name||null,
        eik:d.eik||null,
        companyCity:d.company_city||null
      });
      localStorage.setItem('marketEmailVerified','1');
      return account;
    }catch(err){
      console.warn('Profile sync failed',err);
      return null;
    }
  }

  function getNext(){
    const u=new URL(location.href);
    const n=u.searchParams.get('next');
    if(!n)return 'profile.html';
    try{
      const decoded=decodeURIComponent(n);
      if(/^https?:/i.test(decoded))return 'profile.html';
      return decoded.replace(/^\/+/, '')||'profile.html';
    }catch{return 'profile.html'}
  }

  function showMfaDialog(factorId,{title='Двуфакторна защита',text='Въведи 6-цифрения код от приложението за удостоверяване.'}={}){
    return new Promise((resolve,reject)=>{
      const old=qs('.uredi-mfa-overlay');if(old)old.remove();
      const overlay=document.createElement('div');
      overlay.className='uredi-mfa-overlay';
      overlay.innerHTML=`<div class="uredi-mfa-dialog" role="dialog" aria-modal="true" aria-labelledby="uredi-mfa-title">
        <button class="uredi-mfa-close" type="button" aria-label="Затвори">×</button>
        <h2 id="uredi-mfa-title">${esc(title)}</h2>
        <p>${esc(text)}</p>
        <label class="field"><span class="required-label">Код</span><input class="uredi-mfa-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"/></label>
        <button class="primary-btn uredi-mfa-submit" type="button">Потвърди</button>
        <div class="uredi-mfa-error" aria-live="polite"></div>
      </div>`;
      document.body.appendChild(overlay);
      const input=qs('.uredi-mfa-code',overlay), submit=qs('.uredi-mfa-submit',overlay), errBox=qs('.uredi-mfa-error',overlay);
      const close=()=>{overlay.remove();reject(new Error('MFA_CANCELLED'))};
      qs('.uredi-mfa-close',overlay)?.addEventListener('click',close);
      overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
      submit.addEventListener('click',async()=>{
        const code=(input.value||'').replace(/\D/g,'');
        if(code.length<6){errBox.textContent='Въведи кода от приложението.';input.focus();return}
        busy(submit,true,'Проверка…');
        const {error}=await client.auth.mfa.challengeAndVerify({factorId,code});
        if(error){busy(submit,false);errBox.textContent=humanizeError(error);input.select();return}
        overlay.remove();resolve(true);
      });
      input.addEventListener('keydown',e=>{if(e.key==='Enter')submit.click()});
      setTimeout(()=>input.focus(),50);
    });
  }

  async function ensureMfaIfEnrolled(){
    const {data:aal,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(error)throw error;
    if(!(aal?.currentLevel==='aal1'&&aal?.nextLevel==='aal2'))return true;
    const {data:factors,error:fErr}=await client.auth.mfa.listFactors();
    if(fErr)throw fErr;
    const verified=(factors?.totp||[]).find(x=>x.status==='verified') || (factors?.all||[]).find(x=>x.factor_type==='totp'&&x.status==='verified');
    if(!verified)throw new Error('Няма активен TOTP фактор.');
    await showMfaDialog(verified.id);
    return true;
  }

  async function initRegistration(){
    const btn=qs('[data-register-submit]');if(!btn)return;
    const phone=qs('#field-3');if(phone&&!phone.hasAttribute('data-register-phone'))phone.setAttribute('data-register-phone','');
    btn.addEventListener('click',async()=>{
      const name=qs('[data-register-name]')?.value.trim()||'';
      const email=qs('[data-register-email]')?.value.trim()||'';
      const password=qs('[data-register-password]')?.value||'';
      const confirm=qs('[data-register-password-confirm]')?.value||'';
      const type=qs('[data-register-type]')?.value==='dealer'?'dealer':'private';
      const phoneValue=qs('[data-register-phone]')?.value.trim()||'';
      const terms=!!qs('[data-register-terms]')?.checked;
      if(name.length<2){toast('Попълни име и фамилия.');return}
      if(!emailOk(email)){toast('Въведи валиден email адрес.');return}
      if(!passOk(password)){toast('Паролата трябва да е минимум 8 символа и да съдържа поне 1 буква и 1 цифра.');return}
      if(password!==confirm){toast('Паролите не съвпадат.');return}
      if(!terms){toast('Потвърди Общите условия и Политиката за поверителност.');return}
      let companyName=null,eik=null,companyCity=null;
      if(type==='dealer'){
        companyName=qs('[data-register-company]')?.value.trim()||'';
        eik=(qs('[data-register-eik]')?.value||'').replace(/\D/g,'');
        companyCity=qs('[data-register-company-city]')?.value.trim()||'';
        if(companyName.length<2||companyCity.length<2||!/^(?:\d{9}|\d{13})$/.test(eik)){toast('За търговец попълни фирма, валиден ЕИК / Булстат и седалище.');return}
      }
      busy(btn,true,'Създаване…');
      const {data,error}=await client.auth.signUp({
        email,password,
        options:{
          emailRedirectTo:abs('verify-email.html'),
          data:{
            display_name:name,
            profile_type:type,
            phone:phoneValue||null,
            company_name:companyName,
            eik,
            company_city:companyCity,
            terms_accepted_at:new Date().toISOString(),
            terms_version:'2026-09-10'
          }
        }
      });
      busy(btn,false);
      if(error){toast(humanizeError(error));return}
      localStorage.setItem('marketPendingVerifyEmailV257',email);
      localStorage.setItem('marketEmailVerified','0');
      if(data?.session){await syncLegacyUser(data.session);location.href='profile.html';return}
      location.href='verify-email.html';
    });
  }

  async function initLogin(){
    const btn=qs('[data-login-submit]');if(!btn)return;
    btn.addEventListener('click',async()=>{
      const email=qs('[data-auth-email]')?.value.trim()||'';
      const password=qs('[data-auth-password]')?.value||'';
      if(!emailOk(email)){toast('Въведи валиден email адрес.');return}
      if(!password){toast('Въведи паролата.');return}
      busy(btn,true,'Влизане…');
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error){busy(btn,false);toast(humanizeError(error));return}
      try{
        await ensureMfaIfEnrolled();
      }catch(err){
        busy(btn,false);
        if(err?.message!=='MFA_CANCELLED')toast(humanizeError(err));
        return;
      }
      const {data:refreshed}=await client.auth.getSession();
      await syncLegacyUser(refreshed.session||data.session);
      busy(btn,false);
      location.href=getNext();
    });
    [qs('[data-auth-email]'),qs('[data-auth-password]')].filter(Boolean).forEach(input=>input.addEventListener('keydown',e=>{if(e.key==='Enter')btn.click()}));
  }

  async function initVerifyEmail(){
    if(file()!=='verify-email.html')return;
    const btn=qs('[data-email-verified]'), resend=qs('[data-resend-email]');
    const refresh=async()=>{
      const session=await getSession();
      if(session?.user?.email_confirmed_at){
        await syncLegacyUser(session);
        localStorage.removeItem('marketPendingVerifyEmailV257');
        if(btn){btn.textContent='Продължи към профила';btn.disabled=false;btn.onclick=()=>location.href='profile.html'}
        const callout=qs('.success-callout');if(callout)callout.textContent='Email адресът е потвърден успешно.';
        return true;
      }
      return false;
    };
    await refresh();
    btn?.addEventListener('click',async e=>{
      if(e.currentTarget.textContent.includes('Продължи'))return;
      if(await refresh())return;
      toast('Потвърждението става от линка в email-а. Отвори го и тази страница ще се активира автоматично.');
    });
    resend?.addEventListener('click',async()=>{
      const email=localStorage.getItem('marketPendingVerifyEmailV257')||'';
      if(!emailOk(email)){toast('Върни се към регистрацията и въведи email адреса отново.');return}
      busy(resend,true,'Изпращане…');
      const {error}=await client.auth.resend({type:'signup',email,options:{emailRedirectTo:abs('verify-email.html')}});
      busy(resend,false);
      toast(error?humanizeError(error):'Изпратихме нов линк за потвърждение.');
    });
    client.auth.onAuthStateChange(async(event,session)=>{
      if(event==='SIGNED_IN'&&session){await syncLegacyUser(session);await refresh()}
    });
  }

  function renderResetPasswordForm(){
    const card=qs('.auth-card');if(!card)return;
    card.innerHTML=`<div class="auth-logo"><a aria-label="Начало" class="logo-link" href="index.html"><img alt="" src="assets/img/logo.png"/></a></div>
      <h1>Нова парола</h1><p>Въведи новата парола за профила си.</p>
      <div class="auth-form">
        <div class="field"><label class="required-label" for="reset-pass-1">Нова парола</label><input id="reset-pass-1" data-reset-password type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="Минимум 8 символа"/></div>
        <div class="field"><label class="required-label" for="reset-pass-2">Потвърди паролата</label><input id="reset-pass-2" data-reset-password-confirm type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="Въведи паролата отново"/></div>
        <span class="hint">Минимум 8 символа, поне 1 буква и 1 цифра.</span>
        <button class="primary-btn" data-reset-password-submit style="width:100%" type="button">Запази новата парола</button>
      </div>`;
    qs('[data-reset-password-submit]')?.addEventListener('click',async e=>{
      const pass=qs('[data-reset-password]')?.value||'', confirm=qs('[data-reset-password-confirm]')?.value||'';
      if(!passOk(pass)){toast('Паролата трябва да е минимум 8 символа и да съдържа поне 1 буква и 1 цифра.');return}
      if(pass!==confirm){toast('Паролите не съвпадат.');return}
      busy(e.currentTarget,true,'Запазване…');
      const {error}=await client.auth.updateUser({password:pass});
      busy(e.currentTarget,false);
      if(error){toast(humanizeError(error));return}
      toast('Паролата е сменена.');
      await sleep(450);location.href='profile.html';
    });
  }

  async function initForgotPassword(){
    if(file()!=='forgot-password.html')return;
    const mode=new URL(location.href).searchParams.get('mode');
    if(mode==='update'){
      const session=await getSession();
      if(session)renderResetPasswordForm();
      client.auth.onAuthStateChange((event,s)=>{if((event==='PASSWORD_RECOVERY'||event==='SIGNED_IN')&&s)renderResetPasswordForm()});
      return;
    }
    const btn=qs('[data-forgot-submit]');if(!btn)return;
    btn.addEventListener('click',async()=>{
      const email=qs('[data-forgot-email]')?.value.trim()||'';
      const status=qs('[data-forgot-status]');
      if(!emailOk(email)){if(status){status.style.display='block';status.textContent='Въведи валиден email адрес.'}return}
      busy(btn,true,'Изпращане…');
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:abs('forgot-password.html?mode=update')});
      busy(btn,false);
      if(status){status.style.display='block';status.textContent=error?humanizeError(error):'Ако има профил с този email, ще получиш защитен линк за нова парола.'}
    });
  }

  async function initProfilePage(session,account){
    if(!session||file()!=='profile.html')return;
    const name=account?.profile?.display_name||session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Потребител';
    const h1=qs('.profile-summary-copy h1');if(h1)h1.textContent=name;
    const avatar=qs('.profile-avatar-large');if(avatar){const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();avatar.textContent=initials||'П'}
    qs('[data-profile-logout]')?.addEventListener('click',async()=>{await client.auth.signOut({scope:'local'});window.MarketMonetization?.setCurrentUser?.({id:'',name:'',type:'private'});localStorage.setItem('marketEmailVerified','0');location.href='login.html'});
  }

  async function initProfileEdit(session,account){
    if(!session||file()!=='profile-edit.html')return;
    const p=account?.profile||{}, pr=account?.private||{};
    const name=qs('[data-profile-name]'), phone=qs('[data-profile-phone]'), city=qs('[data-profile-city]'), email=qs('#email');
    if(name)name.value=p.display_name||'';
    if(phone)phone.value=pr.phone||'';
    if(email)email.value=session.user.email||'';
    if(city&&p.city){if(![...city.options].some(o=>o.value===p.city)){const o=document.createElement('option');o.value=p.city;o.textContent=p.city;city.appendChild(o)}city.value=p.city}
    const showPhone=qs('.profile-toggle-input');if(showPhone)showPhone.checked=!!pr.show_phone;
    qs('[data-profile-save]')?.addEventListener('click',async e=>{
      const displayName=name?.value.trim()||'';if(displayName.length<2){toast('Попълни името.');return}
      busy(e.currentTarget,true,'Запазване…');
      const [a,b]=await Promise.all([
        client.from('profiles').update({display_name:displayName,city:city?.value||null}).eq('id',session.user.id),
        client.from('profile_private').update({phone:phone?.value.trim()||null,show_phone:!!showPhone?.checked}).eq('user_id',session.user.id)
      ]);
      busy(e.currentTarget,false);
      if(a.error||b.error){toast(humanizeError(a.error||b.error));return}
      await syncLegacyUser(await getSession());toast('Промените са запазени.');
    });
  }

  async function reauthWithCurrentPassword(password){
    const session=await getSession();
    const email=session?.user?.email;
    if(!email||!password)throw new Error('Въведи текущата парола.');
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error)throw new Error('Текущата парола не е правилна.');
  }

  async function drawMfaStatus(){
    if(file()!=='account-security.html')return;
    const pill=qs('[data-two-factor-status]'), btn=qs('[data-toggle-two-factor]'), box=qs('[data-backup-codes]');
    const {data,error}=await client.auth.mfa.listFactors();
    if(error){console.warn(error);return}
    const verified=(data?.totp||[]).filter(x=>x.status==='verified');
    const on=verified.length>0;
    if(pill){pill.textContent=on?'Включена':'Изключена';pill.classList.toggle('is-on',on)}
    if(btn){btn.textContent=on?'Изключи 2FA':'Настрой 2FA';btn.dataset.factorId=on?verified[0].id:''}
    if(box&&!on){box.hidden=true;box.innerHTML=''}
  }

  async function startMfaEnrollment(){
    const box=qs('[data-backup-codes]');if(!box)return;
    const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Uredi Authenticator'});
    if(error){toast(humanizeError(error));return}
    const qr=data?.totp?.qr_code||'', secret=data?.totp?.secret||'', factorId=data?.id;
    const qrSrc=qr.startsWith('data:')?qr:(qr.trim().startsWith('<svg')?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr):qr);
    box.innerHTML=`<strong>Сканирай QR кода с приложение за удостоверяване</strong>
      <div class="uredi-mfa-enroll"><img class="uredi-mfa-qr" alt="QR код за 2FA" src="${esc(qrSrc)}"/><div><small class="muted">Ако не можеш да сканираш QR кода, въведи този secret ръчно:</small><code class="uredi-mfa-secret">${esc(secret)}</code></div></div>
      <label class="field"><span class="required-label">Код от приложението</span><input data-mfa-enroll-code inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"/></label>
      <div class="uredi-mfa-enroll-actions"><button class="primary-btn" data-mfa-enroll-verify type="button">Включи 2FA</button><button class="ghost-btn" data-mfa-enroll-cancel type="button">Отказ</button></div>
      <small class="muted">Supabase TOTP не използва резервни кодове. Можеш по-късно да добавиш втори фактор за резервен достъп.</small>`;
    box.hidden=false;
    qs('[data-mfa-enroll-cancel]',box)?.addEventListener('click',async()=>{await client.auth.mfa.unenroll({factorId}).catch?.(()=>{});box.hidden=true;box.innerHTML=''});
    qs('[data-mfa-enroll-verify]',box)?.addEventListener('click',async e=>{
      const code=(qs('[data-mfa-enroll-code]',box)?.value||'').replace(/\D/g,'');if(code.length<6){toast('Въведи кода от приложението.');return}
      busy(e.currentTarget,true,'Проверка…');
      const {error:vErr}=await client.auth.mfa.challengeAndVerify({factorId,code});
      busy(e.currentTarget,false);
      if(vErr){toast(humanizeError(vErr));return}
      toast('2FA е включена.');box.hidden=true;box.innerHTML='';await drawMfaStatus();
    });
  }

  async function initAccountSecurity(session){
    if(!session||file()!=='account-security.html')return;
    await drawMfaStatus();
    qs('[data-security-action="change-email"]')?.addEventListener('click',async e=>{
      const current=qs('[data-email-current-password]')?.value||'', next=qs('[data-new-email]')?.value.trim()||'';
      if(!emailOk(next)){toast('Въведи валиден нов email адрес.');return}
      busy(e.currentTarget,true,'Изпращане…');
      try{await reauthWithCurrentPassword(current);const {error}=await client.auth.updateUser({email:next});if(error)throw error;qs('[data-email-change-status]')?.removeAttribute('hidden');toast('Изпратихме потвърждение за смяната на email.')}catch(err){toast(humanizeError(err))}finally{busy(e.currentTarget,false)}
    });
    qs('[data-security-action="change-password"]')?.addEventListener('click',async e=>{
      const current=qs('[data-current-password]')?.value||'', next=qs('[data-new-password]')?.value||'', confirm=qs('[data-confirm-password]')?.value||'';
      if(!passOk(next)){toast('Новата парола трябва да е минимум 8 символа и да съдържа буква и цифра.');return}
      if(next!==confirm){toast('Новата парола и потвърждението не съвпадат.');return}
      busy(e.currentTarget,true,'Запазване…');
      try{await reauthWithCurrentPassword(current);const {error}=await client.auth.updateUser({password:next});if(error)throw error;['[data-current-password]','[data-new-password]','[data-confirm-password]'].forEach(s=>{const x=qs(s);if(x)x.value=''});toast('Паролата е сменена.')}catch(err){toast(humanizeError(err))}finally{busy(e.currentTarget,false)}
    });
    qs('[data-security-action="signout-all"]')?.addEventListener('click',async e=>{busy(e.currentTarget,true,'Излизане…');const {error}=await client.auth.signOut({scope:'others'});busy(e.currentTarget,false);toast(error?humanizeError(error):'Другите активни сесии са прекратени.');});
    qs('[data-toggle-two-factor]')?.addEventListener('click',async e=>{
      const factorId=e.currentTarget.dataset.factorId;
      if(!factorId){await startMfaEnrollment();return}
      if(!confirm('Да изключим ли двуфакторната защита за този профил?'))return;
      try{
        const {data:aal}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if(aal?.currentLevel==='aal1'&&aal?.nextLevel==='aal2')await showMfaDialog(factorId,{title:'Потвърди изключването на 2FA'});
        const {error}=await client.auth.mfa.unenroll({factorId});if(error)throw error;toast('2FA е изключена.');await drawMfaStatus();
      }catch(err){if(err?.message!=='MFA_CANCELLED')toast(humanizeError(err))}
    });
  }


  // v2.57: real Supabase-backed promotion inventory/account UI.
  const fmtBgDate=(value,withTime=false)=>{
    if(!value)return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    return withTime
      ? d.toLocaleString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
      : d.toLocaleDateString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric'});
  };

  const promoKindLabel=(kind)=>({vip:'VIP',top:'TOP',bump:'Изкачи'}[kind]||'Промотиране');

  async function loadPromotionData(userId){
    if(!userId)return null;
    const now=Date.now();
    const [lotsRes,productsRes,listingsRes,eventsRes,settingsRes]=await Promise.all([
      client.from('promotion_credit_lots')
        .select('id,product_id,original_quantity,remaining_quantity,source,source_ref,expires_at,created_at')
        .eq('user_id',userId)
        .order('created_at',{ascending:false}),
      client.from('promotion_products')
        .select('id,name,short_name,kind,duration_days,enabled,sort_order')
        .eq('enabled',true)
        .order('sort_order',{ascending:true}),
      client.from('listings')
        .select('id,title,status,price,created_at')
        .eq('seller_id',userId)
        .order('created_at',{ascending:false}),
      client.from('promotion_credit_events')
        .select('id,product_id,listing_id,quantity_delta,event_type,description,created_at')
        .eq('user_id',userId)
        .order('created_at',{ascending:false})
        .limit(30),
      client.from('monetization_settings')
        .select('free_beta,paid_services_enabled,payment_mode,live_payments_ready,currency')
        .eq('singleton',true)
        .maybeSingle()
    ]);

    for(const r of [lotsRes,productsRes,listingsRes,eventsRes]){
      if(r.error)throw r.error;
    }
    if(settingsRes.error)console.warn('Monetization settings:',settingsRes.error);

    const listings=listingsRes.data||[];
    let states=[];
    if(listings.length){
      const ids=listings.map(x=>x.id);
      const st=await client.from('listing_promotion_state')
        .select('listing_id,product_id,kind,started_at,expires_at,bumped_at,updated_at')
        .in('listing_id',ids);
      if(st.error)throw st.error;
      states=st.data||[];
    }

    const lots=(lotsRes.data||[]).filter(l=>
      Number(l.remaining_quantity||0)>0 && (!l.expires_at || new Date(l.expires_at).getTime()>now)
    );
    const products=productsRes.data||[];
    const productById=new Map(products.map(p=>[p.id,p]));
    const listingById=new Map(listings.map(l=>[l.id,l]));
    const activeStates=states.filter(st=>
      (st.kind==='top'||st.kind==='vip') && st.expires_at && new Date(st.expires_at).getTime()>now
    );

    return {
      lots,products,productById,listings,listingById,states,activeStates,
      events:eventsRes.data||[],settings:settingsRes.data||null
    };
  }

  function groupAvailablePromotionLots(data){
    const grouped=new Map();
    for(const lot of data.lots){
      const product=data.productById.get(lot.product_id);
      if(!product)continue;
      const key=lot.product_id;
      if(!grouped.has(key))grouped.set(key,{
        product,
        quantity:0,
        hasBonus:false,
        bonusExpiry:null,
        earliestExpiry:null
      });
      const g=grouped.get(key);
      g.quantity+=Number(lot.remaining_quantity||0);
      if(lot.source==='beta_bonus'){
        g.hasBonus=true;
        if(lot.expires_at){
          const t=new Date(lot.expires_at).getTime();
          if(!g.bonusExpiry||t<new Date(g.bonusExpiry).getTime())g.bonusExpiry=lot.expires_at;
        }
      }
      if(lot.expires_at){
        const t=new Date(lot.expires_at).getTime();
        if(!g.earliestExpiry||t<new Date(g.earliestExpiry).getTime())g.earliestExpiry=lot.expires_at;
      }
    }
    return [...grouped.values()].sort((a,b)=>(a.product.sort_order||0)-(b.product.sort_order||0));
  }

  function renderPromotionProfilePage(data){
    const root=qs('[data-promotions-profile-root]');
    if(!root)return;
    const availableBox=qs('[data-available-promotions]',root);
    const activeBox=qs('[data-active-promotions]',root);
    const historyBox=qs('[data-promotion-account-history]',root);
    const summaryAvailable=qs('[data-promotion-summary-available]',root);
    const summaryActive=qs('[data-promotion-summary-active]',root);
    const buyCta=qs('[data-promotion-buy-cta]',root);

    const grouped=groupAvailablePromotionLots(data);
    const totalAvailable=grouped.reduce((sum,g)=>sum+g.quantity,0);
    const totalActive=data.activeStates.length;
    if(summaryAvailable)summaryAvailable.textContent=String(totalAvailable);
    if(summaryActive)summaryActive.textContent=String(totalActive);

    const paidEnabled=!!data.settings?.paid_services_enabled && !data.settings?.free_beta;
    if(buyCta)buyCta.hidden=!paidEnabled;

    if(availableBox){
      if(grouped.length){
        availableBox.innerHTML=grouped.map(g=>{
          const p=g.product;
          const activeCount=data.activeStates.filter(st=>st.product_id===p.id).length;
          let note=p.kind==='bump'?'Еднократно изкачване':'Активация за промотиране';
          if(g.hasBonus)note=g.bonusExpiry?'FREE BETA бонус · използвай до '+fmtBgDate(g.bonusExpiry):'FREE BETA бонус';
          else if(g.earliestExpiry)note+=' · валидна до '+fmtBgDate(g.earliestExpiry);
          return `<div class="promotion-inventory-row${g.hasBonus?' bonus-inventory-row':''}">
            <div class="promotion-inventory-copy">${g.hasBonus?'<span class="beta-chip">БОНУС</span>':''}<strong>${esc(p.name||promoKindLabel(p.kind))}</strong><small>${esc(note)}</small></div>
            <div class="promotion-inventory-stats"><div><strong>${g.quantity}</strong><span>налични</span></div>${activeCount?`<div><strong>${activeCount}</strong><span>активни</span></div>`:''}</div>
            <a class="mini-btn" href="my-ads.html?promote=${encodeURIComponent(p.id)}">Използвай</a>
          </div>`;
        }).join('');
      }else{
        availableBox.innerHTML='<div class="promotion-empty-state promotion-empty-box"><strong>Нямаш налични активации</strong><span>Когато получиш бонус или закупиш активации, те ще се показват тук.</span></div>';
      }
    }

    if(activeBox){
      if(data.activeStates.length){
        activeBox.innerHTML=data.activeStates.map(st=>{
          const listing=data.listingById.get(st.listing_id);
          const p=data.productById.get(st.product_id);
          const kind=st.kind==='vip'?'VIP':'TOP';
          return `<a class="promotion-account-row promotion-active-row" href="my-ads.html"><div><strong>${esc(listing?.title||'Обява')}</strong><span><b class="${st.kind==='vip'?'text-vip':'text-top'}">${kind}</b>${st.expires_at?' · до '+esc(fmtBgDate(st.expires_at)):''}${p?.name&&p.name!==kind?' · '+esc(p.name):''}</span></div><span class="profile-menu-chevron">›</span></a>`;
        }).join('');
      }else{
        activeBox.innerHTML='<div class="promotion-empty-state promotion-empty-box compact"><strong>Нямаш активни промотирания</strong><span>Нито една твоя обява в момента няма активен TOP или VIP.</span></div>';
      }
    }

    if(historyBox){
      const rows=data.events.slice(0,12);
      if(rows.length){
        historyBox.innerHTML=rows.map(ev=>{
          const p=data.productById.get(ev.product_id);
          const listing=ev.listing_id?data.listingById.get(ev.listing_id):null;
          let action=ev.description||'Операция';
          if(ev.event_type==='grant')action=ev.description||'Получена активация';
          if(ev.event_type==='use')action=ev.description||'Използвана активация';
          if(ev.event_type==='refund')action=ev.description||'Възстановена активация';
          const qty=Number(ev.quantity_delta||0);
          const qtyText=qty>0?`+${qty}`:String(qty);
          return `<div class="promotion-history-row"><div><strong>${esc(p?.name||promoKindLabel(p?.kind))}</strong><span>${esc(action)}${listing?' · '+esc(listing.title):''}</span></div><small>${esc(qtyText)} · ${esc(fmtBgDate(ev.created_at,true))}</small></div>`;
        }).join('');
      }else{
        historyBox.innerHTML='<div class="promotion-empty-state promotion-empty-box compact"><strong>Нямаш история на промотиране</strong><span>Получените и използваните активации ще се записват тук.</span></div>';
      }
    }

    root.dataset.supabasePromotionsReady='1';
  }


  // v2.59: real Supabase "Моите обяви" + real promotion activation.
  const realListingStatusLabel=(status)=>({
    active:'Активна', reserved:'Запазена', sold:'Продадена', removed:'Свалена', draft:'Чернова', expired:'Изтекла'
  }[status]||String(status||'Обява'));

  const publicListingImageUrl=(img)=>{
    if(!img?.storage_path)return 'assets/img/products/washer-blue.svg';
    try{
      const bucket=img.storage_bucket||'listing-images';
      return client.storage.from(bucket).getPublicUrl(img.storage_path).data.publicUrl||'assets/img/products/washer-blue.svg';
    }catch{return 'assets/img/products/washer-blue.svg'}
  };

  async function loadMyAdsImages(listingIds){
    if(!listingIds?.length)return [];
    const {data,error}=await client.from('listing_images')
      .select('*')
      .in('listing_id',listingIds);
    if(error){console.warn('Listing images:',error);return []}
    return (data||[]).sort(v260ImageSort);
  }

  function activePromotionForListing(data,listingId){
    const now=Date.now();
    const st=(data.states||[]).find(x=>x.listing_id===listingId);
    if(!st)return null;
    if((st.kind==='top'||st.kind==='vip')&&st.expires_at&&new Date(st.expires_at).getTime()>now)return st;
    if(st.kind==='bump'&&st.bumped_at)return st;
    return null;
  }

  function promotionMenuHTML(data,listing,selectedProductId=''){
    if(listing.status!=='active')return '<span class="overflow-menu-item is-disabled">Активирай обявата, за да я промотираш</span>';
    const state=activePromotionForListing(data,listing.id);
    if(state&&(state.kind==='top'||state.kind==='vip')){
      return `<span class="overflow-menu-item is-disabled">Активен ${state.kind==='vip'?'VIP':'TOP'}${state.expires_at?' до '+esc(fmtBgDate(state.expires_at)):''}</span>`;
    }
    const groups=groupAvailablePromotionLots(data).filter(g=>g.quantity>0);
    if(!groups.length)return '<a class="overflow-menu-item" href="profile-promotions.html">Промотиране на обяви</a>';
    return groups.map(g=>{
      const p=g.product;
      const label=p.kind==='bump'?'Изкачи':(p.name||promoKindLabel(p.kind));
      const chosen=selectedProductId&&selectedProductId===p.id?' · избрано':'';
      return `<button class="overflow-menu-item promo-action" type="button" data-supa-use-promo="${esc(p.id)}">Промотирай с ${esc(label)}${esc(chosen)}</button>`;
    }).join('');
  }

  function realAdRowHTML(data,listing,image,selectedProductId=''){
    const price=Number(listing.price||0);
    const state=activePromotionForListing(data,listing.id);
    const selectedGroup=selectedProductId?groupAvailablePromotionLots(data).find(g=>g.product.id===selectedProductId&&g.quantity>0):null;
    const canDirect=!!selectedGroup&&listing.status==='active'&&!(state&&(state.kind==='top'||state.kind==='vip'));
    let promoState='';
    if(state?.kind==='top'||state?.kind==='vip'){
      promoState=`<div class="real-ad-promo-status"><span class="badge ${state.kind==='vip'?'badge-vip':'badge-top'}">${state.kind==='vip'?'VIP':'TOP'}</span><span>${state.expires_at?'Активен до '+esc(fmtBgDate(state.expires_at)):'Активен'}</span></div>`;
    }else if(state?.kind==='bump'&&state.bumped_at){
      promoState=`<div class="real-ad-promo-status"><span>Изкачена · ${esc(fmtBgDate(state.bumped_at,true))}</span></div>`;
    }
    const direct=canDirect?`<button class="mini-btn ad-promo-direct" type="button" data-supa-use-promo="${esc(selectedGroup.product.id)}">Използвай ${esc(selectedGroup.product.name||promoKindLabel(selectedGroup.product.kind))}</button>`:'';
    let statusActions='';
    if(listing.status==='active')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="reserved">Запази за купувач</button><button class="overflow-menu-item" type="button" data-supa-listing-status="sold">Продадена</button>';
    else if(listing.status==='reserved')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="active">Върни като активна</button><button class="overflow-menu-item" type="button" data-supa-listing-status="sold">Продадена</button>';
    else if(listing.status==='sold')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="active">Активирай отново</button>';
    const menu=promotionMenuHTML(data,listing,selectedProductId)+statusActions;
    return `<div class="ad-manage" data-listing-id="${esc(listing.id)}">
      <img alt="" loading="lazy" decoding="async" src="${esc(publicListingImageUrl(image))}"/>
      <div class="ad-manage-main"><a class="real-ad-title-link" href="listing.html?id=${encodeURIComponent(listing.id)}"><strong>${esc(listing.title||'Обява')}</strong></a><div class="muted small real-ad-meta">${price>0?esc(price.toFixed(0))+' € · ':''}${esc(realListingStatusLabel(listing.status))}</div>${promoState}${direct}</div>
      <div class="ad-actions overflow-actions"><button aria-expanded="false" aria-haspopup="menu" aria-label="Действия за обявата" class="overflow-trigger" data-overflow-trigger type="button">•••</button><div class="overflow-menu" data-overflow-menu hidden role="menu">${menu}</div></div>
    </div>`;
  }

  function myAdsEmptyHTML(title,text,showPost=true){
    return `<div class="empty-state myads-empty-real"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>${showPost?'<a class="primary-btn" href="post-ad.html">Публикувай обява</a>':''}</div>`;
  }

  async function renderSupabaseMyAds(session){
    if(!session?.user?.id||file()!=='my-ads.html')return;
    const userId=session.user.id;
    const data=await loadPromotionData(userId);
    const images=await loadMyAdsImages(data.listings.map(x=>x.id));
    const firstImage=new Map();
    for(const img of images){if(!firstImage.has(img.listing_id))firstImage.set(img.listing_id,img)}
    const params=new URLSearchParams(location.search);
    const selectedProductId=params.get('promote')||'';
    const selectedGroup=selectedProductId?groupAvailablePromotionLots(data).find(g=>g.product.id===selectedProductId&&g.quantity>0):null;

    const activePanel=qs('[data-tab-panel="active"]');
    const soldPanel=qs('[data-tab-panel="sold"]');
    const expiredPanel=qs('[data-tab-panel="expired"]');
    const removedPanel=qs('[data-tab-panel="removed"]');
    const activeListings=data.listings.filter(x=>x.status==='active'||x.status==='reserved');
    const soldListings=data.listings.filter(x=>x.status==='sold');
    const expiredListings=data.listings.filter(x=>x.status==='expired'||x.status==='draft');
    const removedListings=data.listings.filter(x=>x.status==='removed');

    if(activePanel)activePanel.innerHTML=activeListings.length
      ? activeListings.map(l=>realAdRowHTML(data,l,firstImage.get(l.id),selectedProductId)).join('')
      : myAdsEmptyHTML(selectedGroup?'Нямаш активна обява за този бонус':'Нямаш активни обяви',selectedGroup?'Публикувай реална обява и после можеш да активираш '+(selectedGroup.product.name||'бонуса')+'.':'Публикуваните ти реални обяви ще се показват тук.');
    if(soldPanel)soldPanel.innerHTML=soldListings.length?soldListings.map(l=>realAdRowHTML(data,l,firstImage.get(l.id),'')).join(''):myAdsEmptyHTML('Няма маркирани продадени обяви','Когато продадеш уред, маркирай обявата като продадена.',false);
    if(expiredPanel)expiredPanel.innerHTML=expiredListings.length?expiredListings.map(l=>realAdRowHTML(data,l,firstImage.get(l.id),'')).join(''):myAdsEmptyHTML('Няма изтекли или чернови обяви','Тук ще виждаш обяви, които не са активни.',false);
    if(removedPanel)removedPanel.innerHTML=removedListings.length?removedListings.map(l=>realAdRowHTML(data,l,firstImage.get(l.id),'')).join(''):myAdsEmptyHTML('Няма свалени обяви','Нямаш обяви със статус „Свалена“.',false);

    let banner=qs('[data-real-promo-select-banner]');
    if(banner)banner.remove();
    if(selectedProductId){
      banner=document.createElement('div');banner.dataset.realPromoSelectBanner='';banner.className='myads-promo-select-banner';
      if(selectedGroup){
        banner.innerHTML=`<div><strong>Избери обява за ${esc(selectedGroup.product.name||promoKindLabel(selectedGroup.product.kind))}</strong><span>Налични: ${selectedGroup.quantity}. Натисни бутона под желаната активна обява или използвай менюто •••.</span></div><a class="secondary-btn" href="profile-promotions.html">Отказ</a>`;
      }else{
        banner.innerHTML='<div><strong>Тази активация вече не е налична</strong><span>Върни се в „Промотиране на обяви“ и провери текущия баланс.</span></div><a class="secondary-btn" href="profile-promotions.html">Към активациите</a>';
      }
      const tabs=qs('.tabs');tabs?.parentNode?.insertBefore(banner,tabs);
    }

    const callout=qs('[data-published-callout]');
    if(callout){
      if(params.get('promo_failed')){
        callout.style.display='block';callout.classList.add('warning-callout');
        callout.innerHTML='<strong>Обявата е публикувана успешно.</strong> Промотирането не се активира и активацията не е използвана. Можеш да опиташ от менюто •••.';
      }else if(params.get('promoted')){
        callout.style.display='block';
        callout.innerHTML='<strong>Обявата е публикувана и промотирането е активирано.</strong> Всичко е записано в Supabase.';
      }else if(params.get('published')){
        callout.style.display='block';
        callout.innerHTML='<strong>Обявата е публикувана успешно.</strong> Вече е активна и видима в публичните обяви.';
      }
    }

    const root=activePanel?.closest('section')||document;
    if(!root.dataset.supabaseMyAdsBound){
      root.dataset.supabaseMyAdsBound='1';
      root.addEventListener('click',async e=>{
        const promoBtn=e.target.closest('[data-supa-use-promo]');
        if(promoBtn){
          e.preventDefault();e.stopPropagation();
          const row=promoBtn.closest('[data-listing-id]');
          const listingId=row?.dataset.listingId,productId=promoBtn.dataset.supaUsePromo;
          if(!listingId||!productId)return;
          const product=data.productById.get(productId);
          if(!confirm(`Да активираме ли ${product?.name||'промотирането'} за тази обява?`))return;
          busy(promoBtn,true,'Активиране…');
          const {error}=await client.rpc('activate_promotion',{p_listing_id:listingId,p_product_id:productId});
          busy(promoBtn,false);
          if(error){toast(humanizeError(error));return}
          toast('Промотирането е активирано.');
          location.href='my-ads.html?promoted=1';
          return;
        }
        const statusBtn=e.target.closest('[data-supa-listing-status]');
        if(statusBtn){
          e.preventDefault();e.stopPropagation();
          const row=statusBtn.closest('[data-listing-id]');
          const listingId=row?.dataset.listingId,status=statusBtn.dataset.supaListingStatus;
          if(!listingId||!status)return;
          busy(statusBtn,true,'Запазване…');
          const {error}=await client.rpc('set_listing_status',{p_listing_id:listingId,p_status:status});
          busy(statusBtn,false);
          if(error){toast(humanizeError(error));return}
          toast('Статусът е обновен.');
          await renderSupabaseMyAds(session);
        }
      });
    }
    document.documentElement.dataset.supabaseMyAdsReady='1';
  }

  async function initSupabasePromotions(session){
    if(!session?.user?.id)return;
    const current=file();
    if(current!=='profile-promotions.html'&&current!=='profile.html')return;
    try{
      const data=await loadPromotionData(session.user.id);
      if(current==='profile-promotions.html')renderPromotionProfilePage(data);
      const sub=qs('[data-profile-promotions-sub]');
      if(sub){
        const available=groupAvailablePromotionLots(data).reduce((sum,g)=>sum+g.quantity,0);
        const active=data.activeStates.length;
        const parts=[];
        if(available)parts.push(`${available} ${available===1?'налична активация':'налични активации'}`);
        if(active)parts.push(`${active} ${active===1?'активно промотиране':'активни промотирания'}`);
        sub.textContent=parts.length?parts.join(' · '):'VIP, TOP, Изкачи и бонуси';
      }
    }catch(err){
      console.error('Promotion account load failed',err);
      const root=qs('[data-promotions-profile-root]');
      if(root){
        const availableBox=qs('[data-available-promotions]',root);
        if(availableBox)availableBox.innerHTML='<div class="promotion-empty-state promotion-empty-box"><strong>Не успяхме да заредим активациите</strong><span>Обнови страницата. Ако проблемът остане, провери връзката със Supabase.</span></div>';
      }
    }
  }


  // v2.60: real listings, Storage image uploads, public catalogue and real detail page.
  const v260SchemaCache=new Map();

  const v260Val=(obj,...names)=>{
    for(const name of names){
      const v=obj?.[name];
      if(v!==undefined&&v!==null&&v!=='')return v;
    }
    return '';
  };

  const v260SelectedText=(el)=>el?.selectedOptions?.[0]?.textContent?.trim()||'';
  const v260Clean=(value)=>String(value??'').trim();
  const v260NowIso=()=>new Date().toISOString();
  const v260ExpiryIso=()=>new Date(Date.now()+Number(cfg.adLifetimeDays||60)*86400000).toISOString();
  const v260Uuid=()=>crypto?.randomUUID?.()||('u'+Date.now().toString(36)+Math.random().toString(36).slice(2));
  const v260Money=(value)=>{
    const n=Number(value||0);
    return Number.isFinite(n)?new Intl.NumberFormat('bg-BG',{maximumFractionDigits:2}).format(n)+' €':'— €';
  };

  function v260UnknownColumn(error){
    const m=String(error?.message||'');
    let x=m.match(/Could not find the ['"]([^'"]+)['"] column/i);
    if(x)return x[1];
    x=m.match(/column ['"]([^'"]+)['"] of relation ['"][^'"]+['"] does not exist/i);
    if(x)return x[1];
    x=m.match(/column ([a-zA-Z0-9_]+) does not exist/i);
    return x?.[1]||'';
  }

  function v260NullColumn(error){
    const m=String(error?.message||'');
    const x=m.match(/null value in column ['"]([^'"]+)['"]/i);
    return x?.[1]||'';
  }

  function v260TypeErrorColumn(error){
    const m=String(error?.message||'');
    const x=m.match(/column ['"]([^'"]+)['"] is of type/i);
    return x?.[1]||'';
  }

  const v262ConditionMap={
    'Ново':['new','brand_new','unused'],
    'Разопаковано/мострено':['open_box','unpacked','opened','display','demo'],
    'Реновирано':['refurbished','reconditioned','renewed'],
    'Като ново':['like_new','as_new'],
    'Много добро':['very_good','excellent','used_very_good'],
    'Добро':['good','used_good'],
    'С дефект':['defective','damaged','with_defect'],
    'За ремонт/части':['for_parts','needs_repair','repair_or_parts','parts']
  };
  const v262ConditionLabels={
    new:'Ново',brand_new:'Ново',unused:'Ново',
    open_box:'Разопаковано/мострено',unpacked:'Разопаковано/мострено',opened:'Разопаковано/мострено',display:'Разопаковано/мострено',demo:'Разопаковано/мострено',
    refurbished:'Реновирано',reconditioned:'Реновирано',renewed:'Реновирано',
    like_new:'Като ново',as_new:'Като ново',
    very_good:'Много добро',excellent:'Много добро',used_very_good:'Много добро',
    good:'Добро',used_good:'Добро',
    defective:'С дефект',damaged:'С дефект',with_defect:'С дефект',
    for_parts:'За ремонт/части',needs_repair:'За ремонт/части',repair_or_parts:'За ремонт/части',parts:'За ремонт/части'
  };
  let v262ConditionEnumPromise=null;
  const v262Norm=x=>String(x||'').trim().toLowerCase().replace(/[\s\-/]+/g,'_').replace(/[^a-z0-9_а-я]+/gi,'');
  async function v262ConditionEnumValues(){
    if(v262ConditionEnumPromise)return v262ConditionEnumPromise;
    v262ConditionEnumPromise=(async()=>{
      try{
        const cfg=window.SITE_CONFIG||{};
        if(!cfg.supabaseUrl||!cfg.supabasePublishableKey)return [];
        const res=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/',{headers:{apikey:cfg.supabasePublishableKey,Authorization:'Bearer '+cfg.supabasePublishableKey,Accept:'application/openapi+json'}});
        if(!res.ok)return [];
        const spec=await res.json();
        const found=[];
        const walk=(node,key='')=>{
          if(!node||typeof node!=='object')return;
          if(Array.isArray(node.enum)&&(node.format==='item_condition'||key==='condition'||node.title==='item_condition'))found.push(...node.enum);
          Object.entries(node).forEach(([k,v])=>walk(v,k));
        };
        walk(spec);
        return [...new Set(found.map(String))];
      }catch{return []}
    })();
    return v262ConditionEnumPromise;
  }
  async function v262ResolveConditionValue(label){
    const candidates=[...(v262ConditionMap[label]||[]),label];
    const allowed=await v262ConditionEnumValues();
    if(allowed.length){
      const byNorm=new Map(allowed.map(x=>[v262Norm(x),x]));
      for(const c of candidates){const hit=byNorm.get(v262Norm(c));if(hit)return hit}
    }
    return candidates[0]||label;
  }
  function v262ConditionLabel(value){return v262ConditionLabels[String(value||'').toLowerCase()]||String(value||'')}
  function v262InvalidConditionEnum(error){return /invalid input value for enum\s+item_condition/i.test(String(error?.message||''))}

  function v260ListingContext(session,account){
    const category=v260SelectedText(qs('[data-ad-category]'))||v260Clean(qs('[data-ad-category]')?.value);
    let brand=v260SelectedText(qs('[data-ad-brand]'))||v260Clean(qs('[data-ad-brand]')?.value);
    if(brand==='Друга марка'||v260Clean(qs('[data-ad-brand]')?.value)==='Друга')brand=v260Clean(qs('[data-other-brand-input]')?.value);
    const model=v260Clean(qs('[data-ad-model]')?.value);
    const condition=v260SelectedText(qs('[data-ad-condition]'))||v260Clean(qs('[data-ad-condition]')?.value);
    const price=Number(qs('[data-ad-price]')?.value||0);
    const warranty=v260SelectedText(qs('[data-ad-warranty]'))||v260Clean(qs('[data-ad-warranty]')?.value);
    const yearRaw=v260Clean(qs('[data-ad-year]')?.value);
    const year=yearRaw&&/^\d{4}$/.test(yearRaw)?Number(yearRaw):null;
    const defects=v260Clean(qs('[data-ad-defects]')?.value);
    const description=v260Clean(qs('[data-ad-description]')?.value);
    const city=v260Clean(qs('[data-ad-city]')?.value);
    const delivery=v260SelectedText(qs('[data-ad-delivery]'))||v260Clean(qs('[data-ad-delivery]')?.value);
    const showPhone=!!qs('[data-ad-phone-visible]')?.checked;
    const phone=showPhone?v260Clean(qs('[data-ad-phone]')?.value):'';
    const specs={};
    const characteristics=qsa('.form-section',qs('.post-layout')).find(s=>s.querySelector('h1')?.textContent?.trim()==='Характеристики');
    if(characteristics){
      qsa('.field',characteristics).forEach(field=>{
        const label=v260Clean(field.querySelector('label')?.textContent).replace(/\s+/g,' ');
        const ctrl=field.querySelector('input,select,textarea');
        const value=ctrl?.tagName==='SELECT'?v260SelectedText(ctrl):v260Clean(ctrl?.value);
        if(label&&value)specs[label]=value;
      });
    }
    const title=(brand+' '+(model||category)).replace(/\s+/g,' ').trim()||category||'Обява';
    return {
      session,account,category,brand,model,condition,price,warranty,year,defects,description,city,delivery,
      phone,showPhone,specs,title,
      sellerType:account?.profile?.profile_type||'private',
      sellerId:session?.user?.id||''
    };
  }

  function v260PayloadForListing(ctx,status='draft'){
    const now=v260NowIso(),expires=v260ExpiryIso();
    const body={
      seller_id:ctx.sellerId,title:ctx.title,status,price:ctx.price,currency:'EUR',
      category:ctx.category,brand:ctx.brand,model:ctx.model||null,condition:ctx.condition,
      warranty:ctx.warranty||null,year:ctx.year,defects:ctx.defects,description:ctx.description,
      city:ctx.city,delivery:ctx.delivery||null,phone:ctx.phone||null,show_phone:!!ctx.showPhone,
      specs:ctx.specs||{},seller_type:ctx.sellerType,listing_type:'sale'
    };
    if(status==='active'){body.published_at=now;body.expires_at=expires}
    Object.keys(body).forEach(k=>{if(body[k]===null||body[k]===undefined)delete body[k]});
    return body;
  }

  async function v260ResolveCatalogId(kind,name){
    if(!name)return null;
    const candidates=kind==='category'?['categories','listing_categories']:(kind==='brand'?['brands','listing_brands']:['models','listing_models']);
    for(const table of candidates){
      try{
        let res=await client.from(table).select('id,name').ilike('name',name).limit(1).maybeSingle();
        if(!res.error&&res.data?.id)return res.data.id;
      }catch{}
    }
    return null;
  }

  async function v260RequiredValue(column,ctx){
    const key=String(column||'').toLowerCase();
    if(key==='condition'||key==='state')return await v262ResolveConditionValue(ctx.condition);
    const map={
      seller_id:ctx.sellerId,user_id:ctx.sellerId,owner_id:ctx.sellerId,created_by:ctx.sellerId,
      title:ctx.title,status:'draft',price:ctx.price,currency:'EUR',
      category:ctx.category,category_name:ctx.category,category_text:ctx.category,
      brand:ctx.brand,brand_name:ctx.brand,brand_text:ctx.brand,
      model:ctx.model||'',model_name:ctx.model||'',model_text:ctx.model||'',
      condition_name:ctx.condition,condition_text:ctx.condition,
      warranty:ctx.warranty||'Без гаранция',warranty_text:ctx.warranty||'Без гаранция',
      year:ctx.year,year_value:ctx.year,production_year:ctx.year,
      defects:ctx.defects||'Няма',description:ctx.description,
      city:ctx.city,city_name:ctx.city,city_text:ctx.city,
      delivery:ctx.delivery||'Лично предаване',delivery_method:ctx.delivery||'Лично предаване',delivery_text:ctx.delivery||'Лично предаване',
      phone:ctx.phone||null,contact_phone:ctx.phone||null,phone_contact:ctx.phone||null,
      show_phone:!!ctx.showPhone,phone_visible:!!ctx.showPhone,
      specs:ctx.specs||{},attributes:ctx.specs||{},details:ctx.specs||{},
      seller_type:ctx.sellerType,listing_type:'sale',
      published_at:v260NowIso(),expires_at:v260ExpiryIso(),created_at:v260NowIso(),updated_at:v260NowIso()
    };
    if(Object.prototype.hasOwnProperty.call(map,key))return map[key];
    if(key==='category_id')return await v260ResolveCatalogId('category',ctx.category);
    if(key==='brand_id')return await v260ResolveCatalogId('brand',ctx.brand);
    if(key==='model_id')return await v260ResolveCatalogId('model',ctx.model);
    return undefined;
  }

  async function v260AdaptiveInsertListing(ctx){
    const payload=v260PayloadForListing(ctx,'draft');
    const resolvedCondition=await v262ResolveConditionValue(ctx.condition);
    if(Object.prototype.hasOwnProperty.call(payload,'condition'))payload.condition=resolvedCondition;
    const conditionCandidates=[resolvedCondition,...(v262ConditionMap[ctx.condition]||[]),ctx.condition].filter((v,i,a)=>v&&a.indexOf(v)===i);
    let conditionCandidateIndex=Math.max(0,conditionCandidates.indexOf(resolvedCondition));
    const aliases={
      category_name:ctx.category,category_text:ctx.category,
      brand_name:ctx.brand,brand_text:ctx.brand,
      model_name:ctx.model||null,model_text:ctx.model||null,
      condition_name:ctx.condition,condition_text:ctx.condition,state:resolvedCondition,
      warranty_text:ctx.warranty||null,year_value:ctx.year,production_year:ctx.year,
      city_name:ctx.city,city_text:ctx.city,delivery_method:ctx.delivery||null,delivery_text:ctx.delivery||null,
      contact_phone:ctx.phone||null,phone_contact:ctx.phone||null,phone_visible:!!ctx.showPhone,
      attributes:ctx.specs||{},details:ctx.specs||{}
    };
    // Keep aliases out of the first request. They are added only when the live schema explicitly requires them.
    let body={...payload};
    const removed=new Set();
    for(let attempt=0;attempt<40;attempt++){
      const {data,error}=await client.from('listings').insert(body).select('id,title,status,price,created_at').single();
      if(!error&&data?.id)return data;
      const unknown=v260UnknownColumn(error);
      if(unknown&&Object.prototype.hasOwnProperty.call(body,unknown)){
        delete body[unknown];removed.add(unknown);
        const fallback={
          category:['category_name','category_text'],brand:['brand_name','brand_text'],model:['model_name','model_text'],
          condition:['condition_name','condition_text','state'],warranty:['warranty_text'],year:['year_value','production_year'],
          city:['city_name','city_text'],delivery:['delivery_method','delivery_text'],phone:['contact_phone','phone_contact'],
          show_phone:['phone_visible'],specs:['attributes','details']
        }[unknown]||[];
        fallback.forEach(k=>{if(!removed.has(k)&&Object.prototype.hasOwnProperty.call(aliases,k)&&aliases[k]!==null&&aliases[k]!==undefined)body[k]=aliases[k]});
        continue;
      }
      const nullCol=v260NullColumn(error);
      if(nullCol&&!Object.prototype.hasOwnProperty.call(body,nullCol)){
        let value=Object.prototype.hasOwnProperty.call(aliases,nullCol)?aliases[nullCol]:await v260RequiredValue(nullCol,ctx);
        if(value!==undefined&&value!==null){body[nullCol]=value;continue}
      }
      const typeCol=v260TypeErrorColumn(error);
      if(typeCol&&Object.prototype.hasOwnProperty.call(body,typeCol)){
        // Optional metadata fields must never block publishing because a legacy schema used another type.
        if(!['seller_id','title','status','price'].includes(typeCol)){delete body[typeCol];removed.add(typeCol);continue}
      }
      if(v262InvalidConditionEnum(error)&&Object.prototype.hasOwnProperty.call(body,'condition')){
        conditionCandidateIndex+=1;
        if(conditionCandidateIndex<conditionCandidates.length){body.condition=conditionCandidates[conditionCandidateIndex];continue}
      }
      const e=new Error(humanizeError(error));e.cause=error;e.technical=error?.message||'';throw e;
    }
    throw new Error('Не успяхме да създадем обявата. Обнови страницата и опитай отново.');
  }

  async function v260AdaptiveUpdateListing(listingId,patch){
    let body={...patch};
    for(let attempt=0;attempt<20;attempt++){
      const {error}=await client.from('listings').update(body).eq('id',listingId);
      if(!error)return true;
      const unknown=v260UnknownColumn(error);
      if(unknown&&Object.prototype.hasOwnProperty.call(body,unknown)){delete body[unknown];if(!Object.keys(body).length)return true;continue}
      if(Object.keys(body).length===1&&body.status){
        const rpc=await client.rpc('set_listing_status',{p_listing_id:listingId,p_status:body.status});
        if(!rpc.error)return true;
      }
      throw error;
    }
    return false;
  }

  function v260ImagePayload(listingId,path,index,userId,file,isLabel=false){
    return {
      listing_id:listingId,
      storage_bucket:'listing-images',
      storage_path:path,
      sort_order:index,
      is_primary:index===0&&!isLabel,
      uploader_id:userId
    };
  }


  async function v260InsertImageMeta(listingId,path,index,userId,file,isLabel=false){
    let body=v260ImagePayload(listingId,path,index,userId,file,isLabel);
    const cached=v260SchemaCache.get('listing_images:insert');
    if(cached)body=Object.fromEntries(Object.entries(body).filter(([k])=>cached.has(k)));
    for(let attempt=0;attempt<25;attempt++){
      const {error}=await client.from('listing_images').insert(body);
      if(!error){v260SchemaCache.set('listing_images:insert',new Set(Object.keys(body)));return true}
      const unknown=v260UnknownColumn(error);
      if(unknown&&Object.prototype.hasOwnProperty.call(body,unknown)){delete body[unknown];continue}
      const nullCol=v260NullColumn(error);
      if(nullCol&&!Object.prototype.hasOwnProperty.call(body,nullCol)){
        const values={listing_id:listingId,storage_bucket:'listing-images',storage_path:path,sort_order:index,position:index,
          uploader_id:userId,user_id:userId,owner_id:userId,created_by:userId,is_primary:index===0&&!isLabel,is_cover:index===0&&!isLabel,
          image_type:isLabel?'label':'gallery',kind:isLabel?'label':'gallery',mime_type:file?.type||'image/webp',file_size:file?.size||0};
        if(Object.prototype.hasOwnProperty.call(values,nullCol)){body[nullCol]=values[nullCol];continue}
      }
      throw error;
    }
    return false;
  }

  function v260FileExt(file){
    const type=String(file?.type||'').toLowerCase();
    if(type.includes('png'))return 'png';
    if(type.includes('jpeg')||type.includes('jpg'))return 'jpg';
    if(type.includes('heic'))return 'heic';
    if(type.includes('heif'))return 'heif';
    return 'webp';
  }

  async function v260UploadListingImages(listingId,userId,photos,labelPhoto){
    const uploaded=[];
    const all=[...(photos||[]).map(x=>({file:x.file,isLabel:false}))];
    if(labelPhoto)all.push({file:labelPhoto,isLabel:true});
    try{
      for(let i=0;i<all.length;i++){
        const {file,isLabel}=all[i];
        if(!file)continue;
        const path=`${userId}/${listingId}/${String(i).padStart(2,'0')}-${v260Uuid()}.${v260FileExt(file)}`;
        const up=await client.storage.from('listing-images').upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type||undefined});
        if(up.error)throw up.error;
        uploaded.push(path);
        await v260InsertImageMeta(listingId,path,i,userId,file,isLabel);
      }
      return uploaded;
    }catch(error){
      if(uploaded.length){try{await client.storage.from('listing-images').remove(uploaded)}catch{}}
      try{await client.from('listing_images').delete().eq('listing_id',listingId)}catch{}
      throw error;
    }
  }

  function v260GoPostStep(index){
    const post=qs('.post-layout');if(!post)return;
    const sections=qsa('.form-section',post),dots=qsa('.step',post),prev=qs('[data-prev]',post),next=qs('[data-next]',post),publish=qs('[data-publish]',post);
    const i=Math.max(0,Math.min(sections.length-1,index));
    sections.forEach((s,n)=>s.classList.toggle('active',n===i));
    dots.forEach((d,n)=>d.classList.toggle('active',n<=i));
    if(prev)prev.style.visibility=i===0?'hidden':'visible';
    if(next)next.style.display=i===sections.length-1?'none':'inline-flex';
    if(publish)publish.style.display=i===sections.length-1?'inline-flex':'none';
    sections[i]?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function v260PostFeedback(kind,html){
    const box=qs('[data-moderation-feedback]');
    if(!box)return;
    box.className='moderation-feedback '+kind;
    box.innerHTML=html;
    box.style.display='block';
  }

  function v260ValidatePost(ctx){
    const errors=[];
    let step=0;
    if(!ctx.category){errors.push('Избери категория.');step=Math.max(step,0)}
    if(!ctx.brand){errors.push('Избери или въведи марка.');step=Math.max(step,0)}
    if(!ctx.condition){errors.push('Избери състояние.');step=Math.max(step,2)}
    if(!(ctx.price>0)){errors.push('Въведи валидна цена.');step=Math.max(step,2)}
    if(!ctx.defects){errors.push('Опиши дефектите или напиши „Няма“.');step=Math.max(step,2)}
    if(!ctx.description){errors.push('Добави описание.');step=Math.max(step,3)}
    if(!ctx.city){errors.push('Въведи град.');step=Math.max(step,4)}
    const photos=window.marketPreparedPhotos||[];
    if(photos.length<Number(cfg.moderation?.minPhotos||2)){errors.push('Добави поне 2 готови снимки.');step=Math.max(step,3)}
    if(photos.length>Number(cfg.moderation?.maxPhotos||15)){errors.push('Можеш да качиш максимум 15 снимки.');step=Math.max(step,3)}
    const combined=(ctx.description+' '+ctx.defects).toLowerCase();
    const blocked=['порнография','наркотици','фалшив документ'];
    if(blocked.some(w=>combined.includes(w)))errors.push('Текстът съдържа съдържание, което не е разрешено.');
    const contactPattern=/(https?:\/\/|www\.|t\.me\/|telegram|whatsapp|viber|(?:\+359|0)8[7-9]\d[\s.-]?\d{3}[\s.-]?\d{3})/i;
    if(contactPattern.test(ctx.description))errors.push('Не поставяй телефон или външни контакти в описанието.');
    return {ok:!errors.length,errors,step};
  }

  async function v260RenderPostPromotionChoices(session){
    if(file()!=='post-ad.html'||!session?.user?.id)return '';
    const post=qs('.post-layout');if(!post)return '';
    const sections=qsa('.form-section',post),last=sections[sections.length-1],panel=last?.querySelector('.panel-body');
    if(!panel)return '';
    let box=qs('[data-supa-post-promotion]',panel);
    if(box)box.remove();
    box=document.createElement('div');box.className='post-promotion-box supa-post-promotion';box.dataset.supaPostPromotion='';
    box.innerHTML='<div class="post-promo-title"><strong>Промотирай веднага</strong><span>Зареждаме наличните ти активации…</span></div>';
    const callout=panel.querySelector('.success-callout');panel.insertBefore(box,callout||panel.firstChild);

    // For publishing we only need the user's unused lots + enabled products.
    // Do not make the selector depend on My Ads/history/state RLS, otherwise one unrelated policy can hide a valid TOP/VIP credit.
    const [lotsRes,productsRes]=await Promise.all([
      client.from('promotion_credit_lots')
        .select('id,product_id,original_quantity,remaining_quantity,source,source_ref,expires_at,created_at')
        .eq('user_id',session.user.id)
        .order('created_at',{ascending:false}),
      client.from('promotion_products')
        .select('id,name,short_name,kind,duration_days,enabled,sort_order')
        .eq('enabled',true)
        .order('sort_order',{ascending:true})
    ]);
    if(lotsRes.error)throw lotsRes.error;
    if(productsRes.error)throw productsRes.error;
    const now=Date.now();
    const products=productsRes.data||[];
    const data={
      lots:(lotsRes.data||[]).filter(l=>Number(l.remaining_quantity||0)>0&&(!l.expires_at||new Date(l.expires_at).getTime()>now)),
      products,
      productById:new Map(products.map(p=>[p.id,p]))
    };
    const groups=groupAvailablePromotionLots(data).filter(g=>g.quantity>0);
    const options=groups.map(g=>{
      const p=g.product,label=p?.name||promoKindLabel(p?.kind);
      const expiry=g.earliestExpiry?`<small>Налични: ${g.quantity} · използвай до ${esc(fmtBgDate(g.earliestExpiry))}</small>`:`<small>Налични: ${g.quantity}</small>`;
      return `<label class="post-promo-option"><input type="radio" name="supa-post-promotion" value="${esc(p.id)}"><span><b>Използвай 1 × ${esc(label)}</b>${expiry}</span>${g.hasBonus?'<em>ПОДАРЪК</em>':''}</label>`;
    }).join('');
    box.innerHTML=`<div class="post-promo-title"><strong>Промотирай веднага</strong><span>По желание. Избраната активация се използва едва след успешно публикуване.</span></div><label class="post-promo-option is-selected"><input type="radio" name="supa-post-promotion" value="" checked><span><b>Публикувай без промотиране</b><small>Можеш да промотираш и по-късно.</small></span></label>${options}${groups.length?'':'<div class="post-promo-none">Нямаш налична активация в момента.</div>'}<a class="post-promo-packages" href="profile-promotions.html">Промотиране на обяви</a>`;
    const publish=qs('[data-publish]');
    const sync=()=>{
      qsa('.post-promo-option',box).forEach(x=>x.classList.toggle('is-selected',!!x.querySelector('input')?.checked));
      const id=box.querySelector('input[name="supa-post-promotion"]:checked')?.value||'';
      const group=groups.find(g=>g.product.id===id);
      if(publish)publish.textContent=group?`Публикувай + ${group.product.short_name||group.product.name||promoKindLabel(group.product.kind)}`:'Публикувай безплатно';
    };
    box.addEventListener('change',sync);sync();
    window.UrediPostAdPromotion={getSelected:()=>box.querySelector('input[name="supa-post-promotion"]:checked')?.value||'',data};
    return box;
  }

  async function initSupabasePostAd(session,account){
    if(file()!=='post-ad.html'||!session?.user?.id)return;
    const post=qs('.post-layout'),publish=qs('[data-publish]');if(!post||!publish)return;
    // Prefill only when the user has not already typed something.
    const city=qs('[data-ad-city]'),phone=qs('[data-ad-phone]');
    if(city&&!v260Clean(city.value))city.value=account?.profile?.city||account?.dealer?.company_city||'';
    if(phone&&(phone.value==='0888 123 456'||!v260Clean(phone.value)))phone.value=account?.private?.phone||account?.dealer?.business_phone||'';
    try{await v260RenderPostPromotionChoices(session)}catch(err){console.warn('Post promotion choices:',err)}
    if(publish.dataset.supaPostBound)return;publish.dataset.supaPostBound='1';
    publish.addEventListener('click',async e=>{
      e.preventDefault();e.stopPropagation();
      if(publish.dataset.actionBusy==='1')return;
      const ctx=v260ListingContext(session,account);
      const validation=v260ValidatePost(ctx);
      if(!validation.ok){
        v260GoPostStep(validation.step);
        v260PostFeedback('error','<strong>Обявата още не може да бъде публикувана.</strong><br>'+validation.errors.map(esc).join('<br>'));
        toast('Провери данните на обявата.');return;
      }
      if(!session.user.email_confirmed_at){toast('Потвърди email адреса си преди публикуване.');location.href='verify-email.html?next=post-ad.html';return}
      const selectedPromotion=window.UrediPostAdPromotion?.getSelected?.()||'';
      const photos=window.marketPreparedPhotos||[],label=window.marketPreparedLabelPhoto||null;
      publish.dataset.actionBusy='1';publish.classList.add('is-publishing');publish.dataset.oldText=publish.textContent;publish.disabled=true;publish.textContent='Създаване на обявата…';
      v260PostFeedback('ok','<strong>Публикуваме обявата.</strong><br>Не затваряй страницата, докато снимките се качват.');
      let listing=null;const uploaded=[];
      try{
        listing=await v260AdaptiveInsertListing(ctx);
        publish.textContent=`Качване на снимки 0/${photos.length+(label?1:0)}…`;
        const all=[...photos.map(x=>({file:x.file,isLabel:false}))];if(label)all.push({file:label,isLabel:true});
        for(let i=0;i<all.length;i++){
          const {file:imgFile,isLabel}=all[i];
          const path=`${session.user.id}/${listing.id}/${String(i).padStart(2,'0')}-${v260Uuid()}.${v260FileExt(imgFile)}`;
          const up=await client.storage.from('listing-images').upload(path,imgFile,{cacheControl:'31536000',upsert:false,contentType:imgFile.type||undefined});
          if(up.error)throw up.error;
          uploaded.push(path);
          try{await v260InsertImageMeta(listing.id,path,i,session.user.id,imgFile,isLabel)}catch(metaErr){
            try{await client.storage.from('listing-images').remove([path])}catch{}
            throw metaErr;
          }
          publish.textContent=`Качване на снимки ${i+1}/${all.length}…`;
        }
        publish.textContent='Активиране на обявата…';
        const rpc=await client.rpc('set_listing_status',{p_listing_id:listing.id,p_status:'active'});
        if(rpc.error){
          await v260AdaptiveUpdateListing(listing.id,{status:'active'});
        }
        try{await v260AdaptiveUpdateListing(listing.id,{published_at:v260NowIso(),expires_at:v260ExpiryIso(),updated_at:v260NowIso()})}catch(err){console.warn('Listing timestamps:',err)}
        let promoted=false,promoFailed=false;
        if(selectedPromotion){
          publish.textContent='Активиране на промотирането…';
          const promo=await client.rpc('activate_promotion',{p_listing_id:listing.id,p_product_id:selectedPromotion});
          if(promo.error){promoFailed=true;console.warn('Promotion after publish:',promo.error)}else promoted=true;
        }
        post.dataset.supabaseSafeLeave='1';document.documentElement.dataset.supabasePublishing='1';
        const q=new URLSearchParams({published:'1',id:listing.id});
        if(promoted)q.set('promoted','1');if(promoFailed)q.set('promo_failed','1');
        location.href='my-ads.html?'+q.toString();
      }catch(err){
        console.error('Real publish failed',err);
        if(listing?.id){
          try{if(uploaded.length)await client.storage.from('listing-images').remove(uploaded)}catch{}
          try{await client.from('listing_images').delete().eq('listing_id',listing.id)}catch{}
          try{await client.from('listings').delete().eq('id',listing.id).eq('seller_id',session.user.id)}catch{}
        }
        publish.dataset.actionBusy='0';publish.classList.remove('is-publishing');publish.disabled=false;publish.textContent=publish.dataset.oldText||'Публикувай безплатно';
        const technical=String(err?.technical||err?.message||'');
        let msg=humanizeError(err);
        if(/row-level security|permission denied/i.test(technical))msg='Supabase не позволи записването на обявата. Ще трябва да коригираме RLS правилото за listings.';
        else if(/storage|bucket|object/i.test(technical)&&/policy|permission|denied|row-level/i.test(technical))msg='Supabase не позволи качването на снимките. Ще коригираме Storage правилото за listing-images.';
        if(listing?.id)msg+=' Обявата е оставена като чернова и не е публична.';
        v260PostFeedback('error','<strong>Не успяхме да завършим публикуването.</strong><br>'+esc(msg));
        toast(msg);
      }
    });
  }

  function v260ImageSort(a,b){
    const av=Number(v260Val(a,'sort_order','position')||9999),bv=Number(v260Val(b,'sort_order','position')||9999);
    if(av!==bv)return av-bv;
    return String(a.storage_path||'').localeCompare(String(b.storage_path||''));
  }

  async function v260LoadImagesForListings(ids){
    if(!ids?.length)return [];
    const {data,error}=await client.from('listing_images').select('*').in('listing_id',ids);
    if(error){console.warn('Public listing images:',error);return []}
    return (data||[]).sort(v260ImageSort);
  }

  function v260ListingFields(row){
    let specs=v260Val(row,'specs','attributes','details')||{};
    if(typeof specs==='string'){try{specs=JSON.parse(specs)}catch{specs={}}}
    return {
      category:v260Clean(v260Val(row,'category','category_name','category_text'))||'Бяла техника',
      brand:v260Clean(v260Val(row,'brand','brand_name','brand_text')),
      model:v260Clean(v260Val(row,'model','model_name','model_text')),
      condition:v262ConditionLabel(v260Clean(v260Val(row,'condition_name','condition_text','condition','state'))),
      warranty:v260Clean(v260Val(row,'warranty','warranty_text')),
      year:v260Val(row,'year','year_value','production_year'),
      description:v260Clean(v260Val(row,'description')),
      defects:v260Clean(v260Val(row,'defects')),
      city:v260Clean(v260Val(row,'city','city_name','city_text')),
      delivery:v260Clean(v260Val(row,'delivery','delivery_method','delivery_text')),
      phone:v260Clean(v260Val(row,'phone','contact_phone','phone_contact')),
      showPhone:!!v260Val(row,'show_phone','phone_visible'),
      specs:specs&&typeof specs==='object'?specs:{},
      currency:v260Clean(v260Val(row,'currency'))||'EUR'
    };
  }

  function v260PublicImageUrl(img){
    if(!img?.storage_path)return 'assets/img/products/washer-blue.svg';
    try{return client.storage.from(img.storage_bucket||'listing-images').getPublicUrl(img.storage_path).data.publicUrl||'assets/img/products/washer-blue.svg'}catch{return 'assets/img/products/washer-blue.svg'}
  }

  function v260ActivePromo(state){
    if(!state)return null;const now=Date.now();
    if((state.kind==='vip'||state.kind==='top')&&(!state.expires_at||new Date(state.expires_at).getTime()>now))return state;
    if(state.kind==='bump'&&state.bumped_at)return state;
    return null;
  }

  function v260PromoRank(state){
    const s=v260ActivePromo(state);if(!s)return 0;
    return s.kind==='vip'?3:s.kind==='top'?2:s.kind==='bump'?1:0;
  }

  function v260SpecSummary(fields){
    const values=Object.values(fields.specs||{}).filter(Boolean).slice(0,3);
    return values.join(' · ');
  }

  function v260ListingRowHTML(row,img,profile,promo){
    const f=v260ListingFields(row),dealer=profile?.profile_type==='dealer';
    const seller=profile?.display_name||'Продавач';
    const promoState=v260ActivePromo(promo),badge=promoState&&(promoState.kind==='vip'||promoState.kind==='top')?`<span class="badge ${promoState.kind==='vip'?'badge-vip':'badge-top'}">${promoState.kind==='vip'?'VIP':'TOP'}</span>`:'';
    const meta=[f.year||'',f.warranty||''].filter(Boolean).join(' · ');
    const spec=v260SpecSummary(f);
    const created=new Date(row.created_at||0).getTime()||0;
    const bumped=promoState?.kind==='bump'?new Date(promoState.bumped_at||0).getTime()||0:0;
    const search=[row.title,f.category,f.brand,f.model,f.city,f.condition].join(' ').toLowerCase();
    return `<article class="listing-row real-listing-row${promoState?.kind==='vip'?' vip':promoState?.kind==='top'?' top':''}" data-real-listing="1" data-listing-id="${esc(row.id)}" data-brand="${esc(f.brand)}" data-category="${esc(f.category)}" data-city="${esc(f.city)}" data-code="${esc(f.model)}" data-created="${created}" data-bumped="${bumped}" data-model="${esc(f.model)}" data-price="${Number(row.price||0)}" data-promo-rank="${v260PromoRank(promo)}" data-search="${esc(search)}" data-seller-type="${dealer?'trader':'private'}" data-state="${esc(f.condition)}" data-warranty="${f.warranty&&f.warranty!=='Без гаранция'?'1':'0'}">
      <a href="listing.html?id=${encodeURIComponent(row.id)}"><img alt="${esc(row.title||'Обява')}" decoding="async" loading="lazy" src="${esc(v260PublicImageUrl(img))}"/></a>
      <div class="listing-info"><div class="real-listing-kicker"><span class="muted small">${esc(f.category)}</span>${badge}</div><a href="listing.html?id=${encodeURIComponent(row.id)}"><h2 class="listing-title">${esc(row.title||'Обява')}</h2></a>${meta?`<div class="muted small">${esc(meta)}</div>`:''}<div class="listing-features">${spec?`<span>${esc(spec)}</span>`:''}${f.condition?`<span>${esc(f.condition)}</span>`:''}<span class="seller-name">${esc(seller)} ${dealer?'<span class="badge badge-seller-type">Търговец</span>':''}</span></div></div>
      <div class="listing-right"><div class="price-with-trend listing-price-with-trend"><div class="price">${esc(v260Money(row.price))}</div></div><button aria-label="Добави в любими" class="fav-float" data-favorite="${esc(row.id)}" style="position:static;margin-top:9px"><span class="ico"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></span></button><div class="listing-location">${esc(f.city||'България')}</div></div>
    </article>`;
  }

  function v260Norm(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
  function v260CategoryAlias(value){const v=v260Norm(value);return ['печка','печки','готварска печка','готварски печки'].includes(v)?'готварски печки':v}
  function v260QueryTokens(value){
    const map={'печка':['готварски','печки'],'печки':['готварски','печка'],'пералня':['перални'],'перални':['пералня'],'сушилня':['сушилни'],'сушилни':['сушилня'],'хладилник':['хладилници'],'хладилници':['хладилник'],'съдомиялна':['съдомиялни'],'съдомиялни':['съдомиялна'],'фризер':['фризери'],'фризери':['фризер'],'фурна':['фурни'],'фурни':['фурна'],'котлон':['котлони'],'котлони':['котлон'],'климатик':['климатици'],'климатици':['климатик'],'бойлер':['бойлери'],'бойлери':['бойлер'],'уред':['уреди'],'уреди':['уред']};
    const base=v260Norm(value).split(/\s+/).filter(Boolean),all=[...base];base.forEach(x=>(map[x]||[]).forEach(y=>all.push(y)));return [...new Set(all)];
  }

  function v260BindPublicFilters(){
    const list=qs('.listing-list');if(!list||list.dataset.supaFiltersBound)return;list.dataset.supaFiltersBound='1';
    const controls={category:qs('#categoryFilter'),brand:qs('#brandFilter'),state:qs('#stateFilter'),city:qs('#cityFilter'),seller:qs('#sellerTypeFilter'),minPrice:qs('#minPrice'),maxPrice:qs('#maxPrice'),q:qs('[data-listing-search]')};
    const sort=qs('[data-sort-listings]'),count=qs('[data-result-count]'),zero=qs('[data-zero-results]'),loadMore=qs('[data-load-more]'),chips=qs('[data-active-filters]'),chipWrap=qs('[data-active-filters-wrap]');
    let limit=Number(cfg.resultPagination?.initial||5);
    const params=new URLSearchParams(location.search);
    const set=(key,value)=>{const c=controls[key];if(!c||!value)return;if(c.tagName==='SELECT'){const opt=[...c.options].find(o=>v260Norm(o.value||o.textContent)===v260Norm(value));if(opt)c.value=opt.value}else c.value=value};
    set('category',params.get('category'));set('brand',params.get('brand'));set('state',params.get('state'));set('city',params.get('city'));set('seller',params.get('seller'));set('minPrice',params.get('minPrice'));set('maxPrice',params.get('maxPrice')||params.get('max'));set('q',params.get('q'));
    const value=k=>v260Clean(controls[k]?.value);
    const matches=row=>{
      const q=value('q'),tokens=v260QueryTokens(q),hay=v260Norm([row.dataset.search,row.dataset.brand,row.dataset.model,row.dataset.city,row.dataset.state,row.dataset.category].join(' '));
      const white=['бяла техника','електроуреди','уреди','уред'].includes(v260Norm(q));
      const qOk=!q||white||tokens.every(t=>hay.includes(t))||tokens.some(t=>hay.includes(t));
      const min=Number(value('minPrice')||0),max=Number(value('maxPrice')||999999999);
      return qOk&&(!value('category')||v260CategoryAlias(row.dataset.category)===v260CategoryAlias(value('category')))&&(!value('brand')||v260Norm(row.dataset.brand)===v260Norm(value('brand')))&&(!value('state')||v260Norm(row.dataset.state)===v260Norm(value('state')))&&(!value('city')||v260Norm(row.dataset.city)===v260Norm(value('city')))&&(!value('seller')||row.dataset.sellerType===value('seller'))&&Number(row.dataset.price||0)>=min&&Number(row.dataset.price||0)<=max;
    };
    const drawChips=()=>{
      if(!chips||!chipWrap)return;const active=[];Object.entries(controls).forEach(([k,c])=>{const v=v260Clean(c?.value);if(v)active.push([k,v])});
      const labels={q:'Търсене',category:'Категория',brand:'Марка',state:'Състояние',city:'Град',seller:'Продавач',minPrice:'Цена от',maxPrice:'Цена до'};
      chips.innerHTML=active.map(([k,v])=>`<span class="filter-chip">${esc((labels[k]||k)+': '+(k==='seller'?(v==='trader'?'Търговец':'Частно лице'):v))} <button type="button" data-supa-remove-filter="${esc(k)}" aria-label="Премахни">×</button></span>`).join('');chipWrap.style.display=active.length?'flex':'none';
    };
    const apply=()=>{
      const all=qsa('.listing-row[data-real-listing="1"]',list),mode=sort?.value||'Най-нови';let rows=all.filter(matches);
      rows.sort((a,b)=>{
        const pr=Number(b.dataset.promoRank||0)-Number(a.dataset.promoRank||0);if(pr)return pr;
        if(mode.includes('ниска'))return Number(a.dataset.price)-Number(b.dataset.price);
        if(mode.includes('висока'))return Number(b.dataset.price)-Number(a.dataset.price);
        const ac=Math.max(Number(a.dataset.created||0),Number(a.dataset.bumped||0)),bc=Math.max(Number(b.dataset.created||0),Number(b.dataset.bumped||0));return bc-ac;
      });
      all.forEach(r=>r.style.display='none');rows.forEach(r=>list.appendChild(r));rows.slice(0,limit).forEach(r=>r.style.display='grid');
      if(count)count.textContent=rows.length===1?'1 обява':rows.length+' обяви';if(zero)zero.style.display=rows.length?'none':'block';if(loadMore){loadMore.style.display=rows.length>limit?'flex':'none';loadMore.textContent=`Покажи още (${Math.min(Number(cfg.resultPagination?.step||5),Math.max(0,rows.length-limit))})`;}drawChips();
    };
    Object.values(controls).filter(Boolean).forEach(c=>['input','change'].forEach(ev=>c.addEventListener(ev,()=>{limit=Number(cfg.resultPagination?.initial||5);apply()})));
    sort?.addEventListener('change',apply);loadMore?.addEventListener('click',()=>{limit+=Number(cfg.resultPagination?.step||5);apply()});
    document.addEventListener('click',e=>{
      const rm=e.target.closest('[data-supa-remove-filter]');if(rm){const c=controls[rm.dataset.supaRemoveFilter];if(c){c.value='';limit=Number(cfg.resultPagination?.initial||5);apply()}return}
      if(e.target.closest('[data-clear-filters]')){Object.values(controls).filter(Boolean).forEach(c=>c.value='');limit=Number(cfg.resultPagination?.initial||5);apply()}
    });
    apply();
  }

  async function initPublicListings(){
    if(file()!=='listings.html')return;
    const list=qs('.listing-list');if(!list)return;
    list.dataset.supabaseLoading='1';
    const skeleton=qs('[data-results-skeleton]');if(skeleton)skeleton.classList.remove('is-hidden');
    const {data:listings,error}=await client.from('listings').select('*').eq('status','active').order('created_at',{ascending:false}).limit(200);
    if(error){console.error('Public listings:',error);list.innerHTML='<div class="real-listings-error"><strong>Не успяхме да заредим обявите.</strong><span>Обнови страницата след малко.</span></div>';if(skeleton)skeleton.classList.add('is-hidden');return}
    const rows=listings||[],ids=rows.map(x=>x.id),sellerIds=[...new Set(rows.map(x=>x.seller_id).filter(Boolean))];
    const [imagesRes,promosRes,profilesRes]=await Promise.all([
      ids.length?client.from('listing_images').select('*').in('listing_id',ids):Promise.resolve({data:[],error:null}),
      ids.length?client.from('listing_promotion_state').select('listing_id,product_id,kind,started_at,expires_at,bumped_at,updated_at').in('listing_id',ids):Promise.resolve({data:[],error:null}),
      sellerIds.length?client.from('profiles').select('id,display_name,profile_type,city').in('id',sellerIds):Promise.resolve({data:[],error:null})
    ]);
    if(imagesRes.error)console.warn(imagesRes.error);if(promosRes.error)console.warn(promosRes.error);if(profilesRes.error)console.warn(profilesRes.error);
    const images=(imagesRes.data||[]).sort(v260ImageSort),firstImage=new Map();images.forEach(img=>{if(!firstImage.has(img.listing_id))firstImage.set(img.listing_id,img)});
    const promoMap=new Map((promosRes.data||[]).map(x=>[x.listing_id,x])),profileMap=new Map((profilesRes.data||[]).map(x=>[x.id,x]));
    list.innerHTML=rows.map(row=>v260ListingRowHTML(row,firstImage.get(row.id),profileMap.get(row.seller_id),promoMap.get(row.id))).join('');
    // Add real brands to the filter without removing the curated defaults.
    const brandSelect=qs('#brandFilter');if(brandSelect){const existing=new Set([...brandSelect.options].map(o=>v260Norm(o.value||o.textContent)));rows.forEach(r=>{const b=v260ListingFields(r).brand;if(b&&!existing.has(v260Norm(b))){const o=document.createElement('option');o.value=b;o.textContent=b;brandSelect.appendChild(o);existing.add(v260Norm(b))}})}
    if(skeleton)skeleton.classList.add('is-hidden');list.dataset.supabaseLoading='0';v260BindPublicFilters();
    // Re-bind favorite buttons that were added after app-v260 initialized.
    const stored=(()=>{try{return JSON.parse(localStorage.getItem('favorites')||'[]')}catch{return []}})();
    qsa('[data-favorite]',list).forEach(btn=>{const id=btn.dataset.favorite;if(stored.includes(id))btn.classList.add('active');if(btn.dataset.supaFavBound)return;btn.dataset.supaFavBound='1';btn.addEventListener('click',e=>{e.preventDefault();let arr;try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{arr=[]}arr.includes(id)?arr=arr.filter(x=>x!==id):arr.push(id);localStorage.setItem('favorites',JSON.stringify(arr));btn.classList.toggle('active')})});
  }

  function v260SpecRows(fields){
    const rows=[];
    if(fields.condition)rows.push(['Състояние',fields.condition]);
    if(fields.brand)rows.push(['Марка',fields.brand]);
    if(fields.model)rows.push(['Модел',fields.model]);
    Object.entries(fields.specs||{}).forEach(([k,v])=>{if(v&&!rows.some(x=>v260Norm(x[0])===v260Norm(k)))rows.push([k,v])});
    if(fields.year)rows.push(['Година',String(fields.year)]);if(fields.warranty)rows.push(['Гаранция',fields.warranty]);if(fields.delivery)rows.push(['Доставка',fields.delivery]);
    return rows.map(([k,v])=>`<div class="spec-row"><span class="spec-key">${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
  }

  function v260Initials(name){return String(name||'П').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'П'}
  function v260RelativeDate(value){
    if(!value)return '';const ms=Date.now()-new Date(value).getTime();if(!Number.isFinite(ms))return '';
    const d=Math.max(0,Math.floor(ms/86400000)),h=Math.max(0,Math.floor(ms/3600000));if(d>0)return `преди ${d} ${d===1?'ден':'дни'}`;if(h>0)return `преди ${h} ч.`;return 'преди малко';
  }

  async function initRealListingDetail(session){
    if(file()!=='listing.html')return;
    const id=new URLSearchParams(location.search).get('id');if(!id)return;
    const main=qs('#main-content');if(!main)return;
    qs('.listing-sticky-actions')?.remove();qs('[data-gallery-modal]')?.remove();
    main.innerHTML='<div class="container"><div class="real-detail-loading">Зареждаме обявата…</div></div>';
    const {data:row,error}=await client.from('listings').select('*').eq('id',id).maybeSingle();
    if(error||!row){main.innerHTML='<div class="container"><div class="empty-state"><h1>Обявата не е налична</h1><p class="muted">Може да е свалена, изтекла или да няма публичен достъп.</p><a class="primary-btn" href="listings.html">Към обявите</a></div></div>';return}
    const [imgs,prof,promo]=await Promise.all([
      client.from('listing_images').select('*').eq('listing_id',id),
      row.seller_id?client.from('profiles').select('id,display_name,profile_type,city').eq('id',row.seller_id).maybeSingle():Promise.resolve({data:null,error:null}),
      client.from('listing_promotion_state').select('listing_id,kind,expires_at,bumped_at').eq('listing_id',id).maybeSingle()
    ]);
    const fields=v260ListingFields(row),images=(imgs.data||[]).sort(v260ImageSort),urls=images.map(v260PublicImageUrl),gallery=urls.length?urls:['assets/img/products/washer-blue.svg'];
    const profile=prof.data||{},dealer=profile.profile_type==='dealer',seller=profile.display_name||'Продавач',promoState=v260ActivePromo(promo.data);
    const badge=promoState&&(promoState.kind==='vip'||promoState.kind==='top')?`<span class="badge ${promoState.kind==='vip'?'badge-vip':'badge-top'}">${promoState.kind==='vip'?'VIP':'TOP'}</span>`:'';
    const phone=fields.showPhone&&fields.phone?fields.phone:'';
    const phoneHref=phone?'tel:'+phone.replace(/[^+\d]/g,''):'';
    document.title=(row.title||'Обява')+' · Пазар за бяла техника';document.body.dataset.listingId=id;document.body.dataset.sellerId=row.seller_id||'';
    const thumbs=gallery.map((u,i)=>`<button class="thumb${i===0?' active':''}" type="button" data-real-thumb="${i}"><img alt="" loading="lazy" src="${esc(u)}"></button>`).join('');
    const phoneButton=phone?`<a class="secondary-btn icon-action-button phone-action-button" href="${esc(phoneHref)}"><span class="icon-action-label">Обади се</span></a>`:'<span class="real-chat-only-note">Контакт само чрез чата</span>';
    main.innerHTML=`<div class="container real-listing-detail"><div class="breadcrumb"><a href="index.html">Начало</a><span>/</span><a href="listings.html?category=${encodeURIComponent(fields.category)}">${esc(fields.category)}</a><span>/</span><span>${esc(row.title||'Обява')}</span></div>
      <div class="detail-grid"><section><div class="gallery-main real-gallery-main" data-real-gallery-main><img alt="${esc(row.title||'Обява')}" src="${esc(gallery[0])}" fetchpriority="high"><div class="gallery-counter" data-real-gallery-counter>1/${gallery.length}</div></div><div class="thumbs real-gallery-thumbs">${thumbs}</div>
      <div class="description-card"><h2>Описание</h2><p>${esc(fields.description||'Няма добавено описание.')}</p><h2 style="margin-top:18px">Забележки и дефекти</h2><p class="muted">${esc(fields.defects||'Няма посочени забележки.')}</p></div>
      <div class="spec-card"><div class="spec-head">Характеристики</div><div class="spec-grid">${v260SpecRows(fields)}</div></div>
      <div class="listing-action-panel"><div class="listing-action-panel-head">Действия по обявата</div><div class="detail-actions"><a class="primary-btn" href="messages.html?listing=${encodeURIComponent(id)}&seller=${encodeURIComponent(row.seller_id||'')}">Съобщение</a>${phoneButton}<button class="secondary-btn" data-favorite="${esc(id)}" type="button">Запази обявата</button><button class="secondary-btn" data-real-share type="button">Сподели обявата</button></div></div></section>
      <aside class="detail-side"><div class="detail-card"><div class="real-detail-tags"><span class="tag">${esc(fields.category)}</span>${badge}</div><div class="listing-title-row"><h1>${esc(row.title||'Обява')}</h1></div>${v260SpecSummary(fields)?`<div class="muted small">${esc(v260SpecSummary(fields))}</div>`:''}<div class="listing-updated-meta">Публикувана ${esc(v260RelativeDate(row.published_at||row.created_at))}</div><div class="detail-price">${esc(v260Money(row.price))}</div><div class="real-detail-location">${esc(fields.city||'България')}</div></div>
      <div class="seller-card"><div class="seller-head"><div class="avatar">${esc(v260Initials(seller))}</div><div><strong>${esc(seller)}</strong><span class="seller-type-inline"><span>${dealer?'Търговец':'Частно лице'}${profile.city?' · '+esc(profile.city):''}</span></span></div></div>${phone?`<a class="secondary-btn seller-phone-bottom" href="${esc(phoneHref)}">Обади се</a>`:''}<a class="secondary-btn" href="seller.html?id=${encodeURIComponent(row.seller_id||'')}" style="width:100%;margin-top:10px">Виж профила</a><div class="seller-secondary-actions"><a class="ghost-btn danger-text" href="report.html?type=listing&listing=${encodeURIComponent(id)}">Докладвай обявата</a></div></div></aside></div></div>`;
    main.querySelectorAll('[data-real-thumb]').forEach(btn=>btn.addEventListener('click',()=>{const i=Number(btn.dataset.realThumb||0),img=main.querySelector('[data-real-gallery-main] img'),counter=main.querySelector('[data-real-gallery-counter]');if(img)img.src=gallery[i]||gallery[0];if(counter)counter.textContent=`${i+1}/${gallery.length}`;main.querySelectorAll('[data-real-thumb]').forEach(x=>x.classList.toggle('active',x===btn))}));
    main.querySelector('[data-real-share]')?.addEventListener('click',async()=>{const share={title:row.title||'Обява',text:`${row.title||'Обява'} · ${v260Money(row.price)}`,url:location.href};try{if(navigator.share)await navigator.share(share);else{await navigator.clipboard.writeText(location.href);toast('Линкът е копиран.')}}catch{}});
    const fav=main.querySelector('[data-favorite]');if(fav){let arr;try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{arr=[]}fav.classList.toggle('active',arr.includes(id));fav.addEventListener('click',()=>{let a;try{a=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{a=[]}a.includes(id)?a=a.filter(x=>x!==id):a.push(id);localStorage.setItem('favorites',JSON.stringify(a));fav.classList.toggle('active')})}
  }


  async function routeGuardAndSync(){
    const current=file();
    let session=null;
    try{session=await getSession()}catch(err){console.warn(err)}
    if(protectedPages.has(current)&&!session){location.replace('login.html?next='+encodeURIComponent(current+location.search));return {redirected:true}}
    let account=null;
    if(session){account=await syncLegacyUser(session)}
    if(session&&current==='login.html'){
      // Do not auto-redirect if an MFA challenge is still required.
      const {data:aal}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if(!(aal?.currentLevel==='aal1'&&aal?.nextLevel==='aal2'))location.replace('profile.html');
    }
    return {session,account};
  }

  async function boot(){
    initRegistration();
    initLogin();
    initForgotPassword();
    initVerifyEmail();
    const state=await routeGuardAndSync();
    if(state?.redirected)return;
    await initProfilePage(state.session,state.account);
    await initProfileEdit(state.session,state.account);
    await initAccountSecurity(state.session);
    await initSupabasePromotions(state.session);
    await initSupabasePostAd(state.session,state.account);
    await renderSupabaseMyAds(state.session);
    await initPublicListings();
    await initRealListingDetail(state.session);
  }

  boot().catch(err=>{console.error(err);toast(humanizeError(err))});
})();
