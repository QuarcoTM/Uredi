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
    global:{headers:{'X-Client-Info':'uredi-web/2.58'}}
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


  // v2.58: real Supabase "Моите обяви" + real promotion activation.
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
      .select('listing_id,storage_bucket,storage_path')
      .in('listing_id',listingIds);
    if(error){console.warn('Listing images:',error);return []}
    return data||[];
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
      <div class="ad-manage-main"><strong>${esc(listing.title||'Обява')}</strong><div class="muted small real-ad-meta">${price>0?esc(price.toFixed(0))+' € · ':''}${esc(realListingStatusLabel(listing.status))}</div>${promoState}${direct}</div>
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
    if(callout&&params.get('promoted')){
      callout.style.display='block';
      callout.innerHTML='<strong>Промотирането е активирано.</strong> Балансът и статусът на обявата са обновени в Supabase.';
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
    await renderSupabaseMyAds(state.session);
  }

  boot().catch(err=>{console.error(err);toast(humanizeError(err))});
})();
