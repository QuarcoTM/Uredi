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
    global:{headers:{'X-Client-Info':'uredi-web/2.88'}}
  });
  window.UrediSupabase=client;

  const authPages=new Set(['login.html','register.html','forgot-password.html','verify-email.html']);
  const protectedPages=new Set([
    'profile.html','profile-edit.html','profile-settings.html','account-security.html','data-rights.html',
    'my-ads.html','messages.html','notifications.html','saved-searches.html','profile-promotions.html',
    'admin-access.html','post-ad.html','edit-ad.html','promote.html','checkout.html','report.html'
  ]);

  const humanizeError=(error)=>{
    const m=String(error?.message||error||'').toLowerCase();
    if(m.includes('renewal is available in the final 7 days'))return 'Можеш да подновиш обявата през последните 7 дни или след изтичането ѝ.';
    if(m.includes('listing has not expired yet'))return 'Обявата още не е изтекла. Можеш да я подновиш след края на срока.';
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
      const city=qs('[data-register-city]')?.value.trim()||'';
      const terms=!!qs('[data-register-terms]')?.checked;
      if(name.length<2||name.length>40){toast('Потребителското име трябва да е между 2 и 40 символа.');return}
      if(city.length<2||city.length>60){toast('Въведи населено място.');return}
      if(phoneValue&&!/^\d{6,15}$/.test(phoneValue)){toast('Телефонът трябва да съдържа между 6 и 15 цифри.');return}
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
            city,
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
      const btn=e.currentTarget;
      busy(btn,true,'Запазване…');
      try{
        const {error}=await client.auth.updateUser({password:pass});
        if(error)throw error;
      }catch(error){toast(humanizeError(error));return}
      finally{busy(btn,false)}
      toast('Паролата е сменена.');
      await sleep(450);location.href='profile.html';
    });
  }

  async function initForgotPassword(){
    if(file()!=='forgot-password.html')return;
    const mode=new URL(location.href).searchParams.get('mode');
    if(mode==='update'){
      const url=new URL(location.href), hash=new URLSearchParams(url.hash.slice(1));
      const linkError=['error','error_code'].some(key=>url.searchParams.has(key)||hash.has(key));
      let session=null;
      try{session=await getSession()}catch(error){/* Keep the new-link form available. */}
      if(session&&!linkError){renderResetPasswordForm();return}
      const status=qs('[data-forgot-status]');
      if(status){status.style.display='block';status.textContent='Линкът е невалиден или е изтекъл. Въведи имейла си, за да получиш нов.'}
      if(!linkError)client.auth.onAuthStateChange((event,s)=>{if(event==='PASSWORD_RECOVERY'&&s)renderResetPasswordForm()});
    }
    const btn=qs('[data-forgot-submit]');if(!btn)return;
    btn.addEventListener('click',async()=>{
      const email=qs('[data-forgot-email]')?.value.trim()||'';
      const status=qs('[data-forgot-status]');
      if(!emailOk(email)){if(status){status.style.display='block';status.textContent='Въведи валиден email адрес.'}return}
      busy(btn,true,'Изпращане…');
      try{
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:abs('forgot-password.html?mode=update')});
        if(error)throw error;
        if(status){status.style.display='block';status.textContent='Ако има профил с този email, ще получиш защитен линк за нова парола.'}
      }catch(error){if(status){status.style.display='block';status.textContent=humanizeError(error)}}
      finally{busy(btn,false)}
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
    if(city)city.value=p.city||'';
    const showPhone=qs('.profile-toggle-input');if(showPhone)showPhone.checked=!!pr.show_phone;
    qs('[data-profile-save]')?.addEventListener('click',async e=>{
      const saveBtn=e.currentTarget;
      const displayName=String(name?.value||'').trim();
      const cityValue=String(city?.value||'').trim();
      const nameLength=Array.from(displayName).length;
      const cityLength=Array.from(cityValue).length;
      if(nameLength<2||nameLength>40){toast('Потребителското име трябва да е между 2 и 40 символа.');return}
      if(/[\u0000-\u001F\u007F]/.test(displayName)){toast('Потребителското име съдържа непозволен контролен символ.');return}
      if(cityLength<2||cityLength>60){toast('Въведи населено място.');return}
      const phoneValue=String(phone?.value||'').trim();
      if(phoneValue&&!/^\d{6,15}$/.test(phoneValue)){toast('Телефонът трябва да съдържа между 6 и 15 цифри.');return}
      busy(saveBtn,true,'Запазване…');
      try{
        let saved=false;
        // v2.85: one server-side operation avoids the Safari/PostgREST parallel-update error
        // seen on profile edits and validates the public name without restricting letters/symbols.
        const rpc=await client.rpc('market_update_my_profile_v285',{
          p_display_name:displayName,
          p_city:cityValue,
          p_phone:phoneValue||null,
          p_show_phone:!!showPhone?.checked
        });
        if(!rpc.error){
          saved=true;
        }else if(/market_update_my_profile_v285|schema cache|could not find the function|function .* does not exist/i.test(String(rpc.error.message||''))){
          // Safe fallback while the SQL patch is being applied: update sequentially, never Promise.all.
          const profileRes=await client.from('profiles').update({display_name:displayName,city:cityValue}).eq('id',session.user.id);
          if(profileRes.error)throw profileRes.error;
          const phoneChanged=(phoneValue||'')!==String(pr.phone||'') || (!!showPhone?.checked)!==!!pr.show_phone;
          if(phoneChanged){
            const privateRes=await client.from('profile_private').update({phone:phoneValue||null,show_phone:!!showPhone?.checked}).eq('user_id',session.user.id);
            if(privateRes.error)throw privateRes.error;
          }
          saved=true;
        }else{
          throw rpc.error;
        }
        if(!saved)throw new Error('Профилът не беше запазен.');
        try{await client.auth.updateUser({data:{display_name:displayName,city:cityValue}})}catch(err){console.warn('Profile metadata sync skipped',err)}
        p.display_name=displayName;p.city=cityValue;pr.phone=phoneValue||null;pr.show_phone=!!showPhone?.checked;
        window.MarketMonetization?.setCurrentUser?.({
          id:session.user.id,
          name:displayName,
          type:p.profile_type==='dealer'?'dealer':'private',
          email:session.user.email||''
        });
        toast('Промените са запазени.');
      }catch(err){
        console.error('Profile save failed',err);
        toast(humanizeError(err));
      }finally{
        busy(saveBtn,false);
      }
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
    if(file()!=='admin-access.html')return;
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
    if(file()!=='admin-access.html')return;
    const access=await client.rpc('is_my_admin_account');
    if(access.error||access.data!==true){toast('Нямаш администраторски достъп.');return}
    const box=qs('[data-backup-codes]');if(!box)return;
    const pending=await client.auth.mfa.listFactors();
    if(pending.error)throw pending.error;
    for(const factor of pending.data?.all||[]){
      if(factor.factor_type==='totp'&&factor.status==='unverified'){
        const removed=await client.auth.mfa.unenroll({factorId:factor.id});
        if(removed.error)throw removed.error;
      }
    }
    const {data,error}=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Uredi Authenticator'});
    if(error){toast(humanizeError(error));return}
    const qr=data?.totp?.qr_code||'', secret=data?.totp?.secret||'', factorId=data?.id;
    const qrSrc=qr.startsWith('data:')?qr:(qr.trim().startsWith('<svg')?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr):qr);
    box.innerHTML=`<strong>Сканирай QR кода с приложение за удостоверяване</strong>
      <div class="uredi-mfa-enroll"><img class="uredi-mfa-qr" alt="QR код за 2FA" src="${esc(qrSrc)}"/><div><small class="muted">Ако не можеш да сканираш QR кода, използвай този ключ в приложението:</small><code class="uredi-mfa-secret">${esc(secret)}</code></div></div>
      <label class="field"><span class="required-label">Код от приложението</span><input data-mfa-enroll-code inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"/></label>
      <div class="uredi-mfa-enroll-actions"><button class="primary-btn" data-mfa-enroll-verify type="button">Включи 2FA</button><button class="ghost-btn" data-mfa-enroll-cancel type="button">Отказ</button></div>
      <small class="muted">Този код защитава само администраторския достъп. Не изпращай ключа или кодовете на други хора.</small>`;
    box.hidden=false;
    qs('[data-mfa-enroll-cancel]',box)?.addEventListener('click',async()=>{await client.auth.mfa.unenroll({factorId}).catch?.(()=>{});box.hidden=true;box.innerHTML=''});
    qs('[data-mfa-enroll-verify]',box)?.addEventListener('click',async e=>{
      const code=(qs('[data-mfa-enroll-code]',box)?.value||'').replace(/\D/g,'');if(code.length<6){toast('Въведи кода от приложението.');return}
      busy(e.currentTarget,true,'Проверка…');
      const {error:vErr}=await client.auth.mfa.challengeAndVerify({factorId,code});
      busy(e.currentTarget,false);
      if(vErr){toast(humanizeError(vErr));return}
      toast('Защитата е включена.');box.hidden=true;box.innerHTML='';location.replace('admin/promotions-prepare.html');
    });
  }

  async function initAccountSecurity(session){
    if(!session||file()!=='account-security.html')return;

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
        .select('*')
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

    const paidEnabled=v290PaidFlags(data.settings);
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
    if(!img?.storage_path)return 'assets/img/no-photo.svg';
    try{
      const bucket=img.storage_bucket||'listing-images';
      return client.storage.from(bucket).getPublicUrl(img.storage_path).data.publicUrl||'assets/img/no-photo.svg';
    }catch{return 'assets/img/no-photo.svg'}
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
    const purchase=v290PaidFlags(data.settings)?`<a class="overflow-menu-item" href="promote.html?listing=${encodeURIComponent(listing.id)}">Изкачи / TOP / VIP</a>`:'';
    const groups=groupAvailablePromotionLots(data).filter(g=>g.quantity>0);
    if(purchase&&!groups.length)return purchase;
    if(!groups.length)return '<a class="overflow-menu-item" href="profile-promotions.html">Промотиране на обяви</a>';
    return groups.map(g=>{
      const p=g.product;
      const label=p.kind==='bump'?'Изкачи':(p.name||promoKindLabel(p.kind));
      const chosen=selectedProductId&&selectedProductId===p.id?' · избрано':'';
      return `<button class="overflow-menu-item promo-action" type="button" data-supa-use-promo="${esc(p.id)}">Промотирай с ${esc(label)}${esc(chosen)}</button>`;
    }).join('')+purchase;
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
    if(listing.status==='active')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="reserved">Запази за купувач</button><button class="overflow-menu-item" type="button" data-supa-listing-status="sold">Маркирай като продадена</button><button class="overflow-menu-item" type="button" data-supa-listing-status="removed">Свали обявата</button>';
    else if(listing.status==='reserved')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="active">Върни като активна</button><button class="overflow-menu-item" type="button" data-supa-listing-status="sold">Маркирай като продадена</button><button class="overflow-menu-item" type="button" data-supa-listing-status="removed">Свали обявата</button>';
    else if(listing.status==='sold')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="active">Активирай отново</button><button class="overflow-menu-item" type="button" data-supa-listing-status="removed">Свали обявата</button>';
    else if(listing.status==='expired')statusActions='<button class="overflow-menu-item" type="button" data-supa-renew-listing>Поднови за 60 дни</button>';
    else if(listing.status==='removed')statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="active">Върни като активна</button>';
    else statusActions='<button class="overflow-menu-item" type="button" data-supa-listing-status="active">Активирай обявата</button>';
    if(['active','reserved'].includes(listing.status)&&listing.expires_at&&new Date(listing.expires_at).getTime()<=Date.now()+7*86400000)statusActions+='<button class="overflow-menu-item" type="button" data-supa-renew-listing>Поднови за 60 дни</button>';
    const editAction=`<a class="overflow-menu-item" href="edit-ad.html?id=${encodeURIComponent(listing.id)}">Редактирай обявата</a>`;
    const deleteAction='<button class="overflow-menu-item danger" type="button" data-supa-delete-listing>Изтрий обявата</button>';
    const menu=editAction+promotionMenuHTML(data,listing,selectedProductId)+statusActions+deleteAction;
    const href=`listing.html?id=${encodeURIComponent(listing.id)}`;
    return `<div class="ad-manage" data-listing-id="${esc(listing.id)}" data-listing-status="${esc(listing.status||'')}">
      <a class="real-ad-image-link" href="${href}" aria-label="Отвори обявата ${esc(listing.title||'')}"><img alt="${esc(listing.title||'Обява')}" loading="lazy" decoding="async" src="${esc(publicListingImageUrl(image))}"/></a>
      <div class="ad-manage-main"><a class="real-ad-title-link" href="${href}"><strong>${esc(listing.title||'Обява')}</strong></a><div class="muted small real-ad-meta">${price>0?esc(price.toFixed(0))+' € · ':''}${esc(realListingStatusLabel(listing.status))}</div>${promoState}${direct}</div>
      <div class="ad-actions overflow-actions"><button aria-expanded="false" aria-haspopup="menu" aria-label="Действия за обявата" class="overflow-trigger" data-overflow-trigger type="button">•••</button><div class="overflow-menu" data-overflow-menu hidden role="menu">${menu}</div></div>
    </div>`;
  }

  function myAdsEmptyHTML(title,text,showPost=true){
    return `<div class="empty-state myads-empty-real"><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p>${showPost?'<a class="primary-btn" href="post-ad.html">Публикувай обява</a>':''}</div>`;
  }

  // Persist cleanup before deletion so a failed Storage request can be retried.
  const cleanupKeyV307=userId=>'urediImageCleanupV307:'+userId;
  function readCleanupV307(userId){
    const rows=JSON.parse(localStorage.getItem(cleanupKeyV307(userId))||'[]');
    if(!Array.isArray(rows))throw new Error('Не успяхме да прочетем чакащите снимки за изтриване.');
    return rows;
  }
  function saveCleanupV307(userId,rows){localStorage.setItem(cleanupKeyV307(userId),JSON.stringify(rows))}
  let cleanupRunningV307=null;
  async function flushCleanupV307(userId){
    if(cleanupRunningV307)return cleanupRunningV307;
    cleanupRunningV307=(async()=>{
      const pending=readCleanupV307(userId);
      for(const item of pending){
        if(!v297Uuid(item.id)||!Array.isArray(item.files))continue;
        try{
          // Never remove images while the listing still exists (including a failed delete).
          const listing=await client.from('listings').select('id').eq('id',item.id).maybeSingle();
          if(listing.error)continue;
          if(listing.data){saveCleanupV307(userId,readCleanupV307(userId).filter(x=>x.id!==item.id));continue;}
          const files=item.files.filter(f=>f.bucket==='listing-images'&&typeof f.path==='string'&&f.path.startsWith(userId+'/'));
          if(files.length!==item.files.length)continue;
          for(let offset=0;offset<files.length;offset+=100){
            const result=await client.storage.from('listing-images').remove(files.slice(offset,offset+100).map(f=>f.path));
            if(result.error)throw result.error;
          }
          saveCleanupV307(userId,readCleanupV307(userId).filter(x=>x.id!==item.id));
        }catch(error){console.warn('Image cleanup pending:',error)}
      }
      return readCleanupV307(userId).length;
    })();
    try{return await cleanupRunningV307}finally{cleanupRunningV307=null}
  }
  async function deleteListingV307(listing,userId){
    if(!listing?.id)throw new Error('Обявата не е намерена. Презареди страницата.');
    const metadata=await client.from('listing_images').select('storage_bucket,storage_path').eq('listing_id',listing.id);
    if(metadata.error)throw metadata.error;
    let raw=v260Val(listing,'specs','attributes','details')||{};
    if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{raw={}}}
    const files=[...(metadata.data||[]).map(x=>({bucket:x.storage_bucket||'listing-images',path:x.storage_path})),
      ...[...v275ImagePathsFromRow(listing),raw.__label_path].filter(Boolean).map(path=>({bucket:'listing-images',path}))];
    const unique=[...new Map(files.map(x=>[x.bucket+':'+x.path,x])).values()];
    if(unique.some(f=>f.bucket!=='listing-images'||typeof f.path!=='string'||!f.path.startsWith(userId+'/')))throw new Error('Снимките изискват проверка. Обявата не е изтрита.');
    // Stop before deleting if the browser cannot retain the retry record.
    saveCleanupV307(userId,[...readCleanupV307(userId).filter(x=>x.id!==listing.id),{id:listing.id,files:unique}]);
    const result=await client.from('listings').delete().eq('id',listing.id).eq('seller_id',userId).select('id');
    if(result.error)throw result.error;
    if(!result.data?.length)throw new Error('Обявата не беше изтрита. Презареди страницата.');
    await flushCleanupV307(userId);
    return readCleanupV307(userId).some(x=>x.id===listing.id);
  }

  async function renderSupabaseMyAds(session){
    if(!session?.user?.id||file()!=='my-ads.html')return;
    const userId=session.user.id;
    const data=await loadPromotionData(userId);
    window.__urediMyAdsData=data;
    let cleanupPending=0;
    try{cleanupPending=await flushCleanupV307(userId)}catch{cleanupPending=-1}
    qs('[data-cleanup-notice]')?.remove();
    if(cleanupPending){
      const notice=document.createElement('div');notice.dataset.cleanupNotice='';notice.className='panel';
      notice.innerHTML='<div class="panel-body"><p>Има незавършено изчистване на снимки. Провери връзката и опитай отново. Ако обявата вече е изтрита, тя няма да се върне.</p><button class="secondary-btn" type="button">Опитай отново</button></div>';
      notice.querySelector('button').addEventListener('click',async e=>{busy(e.currentTarget,true);await renderSupabaseMyAds(session)});
      qs('.tabs')?.before(notice);
    }
    const images=await loadMyAdsImages(data.listings.map(x=>x.id));
    const firstImage=new Map();
    for(const img of images){if(!firstImage.has(img.listing_id))firstImage.set(img.listing_id,img)}
    for(const listing of data.listings){
      const path=v275ImagePathsFromRow(listing)[0];
      if(path)firstImage.set(listing.id,v275PseudoImage(path));
    }
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
          const product=(window.__urediMyAdsData||data).productById.get(productId);
          if(!confirm(`Да активираме ли ${product?.name||'промотирането'} за тази обява?`))return;
          busy(promoBtn,true,'Активиране…');
          const {error}=await client.rpc('activate_promotion',{p_listing_id:listingId,p_product_id:productId});
          busy(promoBtn,false);
          if(error){toast(humanizeError(error));return}
          toast('Промотирането е активирано.');
          location.href='my-ads.html?promoted=1';
          return;
        }
        const deleteBtn=e.target.closest('[data-supa-delete-listing]');
        if(deleteBtn){
          e.preventDefault();e.stopPropagation();
          const row=deleteBtn.closest('[data-listing-id]');
          const listingId=row?.dataset.listingId;
          if(!listingId)return;
          const liveData=window.__urediMyAdsData||data;
          const listing=(liveData.listings||[]).find(x=>x.id===listingId);
          const title=listing?.title||'тази обява';
          if(!confirm(`Да изтрием ли „${title}“ завинаги? Това действие не може да бъде отменено.`))return;
          busy(deleteBtn,true,'Изтриване…');
          try{
            const pending=await deleteListingV307(listing,userId);
            try{let favs=JSON.parse(localStorage.getItem('favorites')||'[]');localStorage.setItem('favorites',JSON.stringify(favs.filter(x=>x!==listingId)))}catch{}
            toast(pending?'Обявата е изтрита, но снимките още не са изчистени. Опитай отново от съобщението в „Моите обяви“.':'Обявата и снимките са изтрити.');
            await renderSupabaseMyAds(session);
          }catch(error){toast(humanizeError(error))}finally{busy(deleteBtn,false)}
          return;
        }
        const renewBtn=e.target.closest('[data-supa-renew-listing]');
        if(renewBtn){
          e.preventDefault();e.stopPropagation();
          const listingId=renewBtn.closest('[data-listing-id]')?.dataset.listingId;
          if(!listingId||renewBtn.disabled)return;
          busy(renewBtn,true,'Подновяване…');
          try{
            const {error}=await client.rpc('renew_listing',{p_listing_id:listingId});
            if(error){toast(humanizeError(error));return}
            toast('Обявата е подновена за 60 дни.');
            await renderSupabaseMyAds(session);
          }catch(error){toast(humanizeError(error))}finally{busy(renewBtn,false)}
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

  // DB Block 2 uses the coarse item_condition enum: new / used / refurbished.
  // The exact user-facing condition is preserved separately in specs['Състояние'].
  const v262ConditionMap={
    'Ново':['new'],
    'Разопаковано/мострено':['used'],
    'Реновирано':['refurbished'],
    'Като ново':['used'],
    'Много добро':['used'],
    'Добро':['used'],
    'С дефект':['used'],
    'За ремонт/части':['used']
  };
  const v262ConditionLabels={
    new:'Ново',brand_new:'Ново',unused:'Ново',
    open_box:'Разопаковано/мострено',unpacked:'Разопаковано/мострено',opened:'Разопаковано/мострено',display:'Разопаковано/мострено',demo:'Разопаковано/мострено',
    refurbished:'Реновирано',reconditioned:'Реновирано',renewed:'Реновирано',
    like_new:'Като ново',as_new:'Като ново',
    very_good:'Много добро',excellent:'Много добро',used_very_good:'Много добро',used_excellent:'Много добро',excellent_used:'Много добро',verygood:'Много добро',
    used:'Употребявано',good:'Добро',used_good:'Добро',
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
        const auth=await client.auth.getSession();
        const token=auth?.data?.session?.access_token||'';
        const headers={apikey:cfg.supabasePublishableKey,Accept:'application/openapi+json'};
        if(token)headers.Authorization='Bearer '+token;
        const res=await fetch(cfg.supabaseUrl.replace(/\/$/,'')+'/rest/v1/',{headers,cache:'no-store'});
        if(!res.ok)return [];
        const spec=await res.json();
        const found=[];
        const walk=(node,key='')=>{
          if(!node||typeof node!=='object')return;
          const k=String(key||'').toLowerCase();
          const title=String(node.title||'').toLowerCase();
          const format=String(node.format||'').toLowerCase();
          if(Array.isArray(node.enum)&&(format==='item_condition'||title==='item_condition'||['condition','condition_name','item_condition','state'].includes(k)))found.push(...node.enum);
          Object.entries(node).forEach(([childKey,v])=>walk(v,childKey));
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

  const v268CategorySlugFallback={
    'Перални':'peralni',
    'Сушилни':'sushilni',
    'Перални със сушилни':'peralni-sus-sushilni',
    'Хладилници':'hladilnici',
    'Фризери':'frizeri',
    'Съдомиялни':'sudomialni',
    'Фурни':'furni',
    'Готварски печки':'gotvarski-pechki',
    'Котлони':'kotloni',
    'Аспиратори':'aspiratori',
    'Микровълнови':'mikrovalnovi',
    'Климатици':'klimatici',
    'Бойлери':'boyleri',
    'Друга бяла техника':'byala-tehnika'
  };
  async function v268ResolveCategorySlug(name){
    if(!name)return '';
    for(const table of ['categories','listing_categories']){
      try{
        const res=await client.from(table).select('slug,name').ilike('name',name).limit(1).maybeSingle();
        if(!res.error&&res.data?.slug)return String(res.data.slug);
      }catch{}
    }
    return v268CategorySlugFallback[name]||String(name).trim().toLowerCase()
      .replace(/\s+/g,'-').replace(/[^a-z0-9а-я-]/gi,'');
  }

  function v260ListingContext(session,account){
    const category=v260SelectedText(qs('[data-ad-category]'))||v260Clean(qs('[data-ad-category]')?.value);
    const categorySlug=v268CategorySlugFallback[category]||'';
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
    const phone=showPhone?v260Clean(qs('[data-ad-phone]')?.value).replace(/\D+/g,''):'';
    const specs={};
    const characteristics=qsa('.form-section',qs('.post-layout')).find(s=>s.querySelector('h1')?.textContent?.trim()==='Характеристики');
    if(characteristics){
      qsa('.field',characteristics).forEach(field=>{
        const label=v260Clean(field.querySelector('label')?.textContent).replace(/\s+/g,' ');
        const ctrl=field.querySelector('input,select,textarea');
        let value=ctrl?.tagName==='SELECT'?v260SelectedText(ctrl):v260Clean(ctrl?.value);
        const suffix=v260Clean(ctrl?.dataset?.specSuffix);
        if(value&&suffix)value=`${value} ${suffix}`;
        if(label&&value)specs[label]=value;
      });
    }
    // Keep the detailed Bulgarian condition even though the DB enum is intentionally coarse.
    if(condition)specs['Състояние']=condition;
    const title=(brand+' '+(model||category)).replace(/\s+/g,' ').trim()||category||'Обява';
    return {
      session,account,category,categorySlug,brand,model,condition,price,warranty,year,defects,description,city,delivery,
      phone,showPhone,specs,title,
      sellerType:account?.profile?.profile_type||'private',
      sellerId:session?.user?.id||''
    };
  }

  function v260PayloadForListing(ctx,status='draft'){
    const now=v260NowIso(),expires=v260ExpiryIso();
    const body={
      seller_id:ctx.sellerId,title:ctx.title,status,price:ctx.price,currency:'EUR',
      category:ctx.category,category_slug:ctx.categorySlug||null,brand:ctx.brand,model:ctx.model||null,condition:ctx.condition,
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
    if(key==='condition'||key==='condition_name'||key==='item_condition'||key==='state')return await v262ResolveConditionValue(ctx.condition);
    const map={
      seller_id:ctx.sellerId,user_id:ctx.sellerId,owner_id:ctx.sellerId,created_by:ctx.sellerId,
      title:ctx.title,status:'draft',price:ctx.price,currency:'EUR',
      category:ctx.category,category_name:ctx.category,category_text:ctx.category,category_slug:ctx.categorySlug||v268CategorySlugFallback[ctx.category]||'',
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
    ctx.categorySlug=ctx.categorySlug||await v268ResolveCategorySlug(ctx.category);
    const payload=v260PayloadForListing(ctx,'draft');
    const resolvedCondition=await v262ResolveConditionValue(ctx.condition);
    if(Object.prototype.hasOwnProperty.call(payload,'condition'))payload.condition=resolvedCondition;
    const conditionCandidates=[resolvedCondition,...(v262ConditionMap[ctx.condition]||[]),ctx.condition].filter((v,i,a)=>v&&a.indexOf(v)===i);
    let conditionCandidateIndex=Math.max(0,conditionCandidates.indexOf(resolvedCondition));
    const aliases={
      category_name:ctx.category,category_text:ctx.category,category_slug:ctx.categorySlug,
      brand_name:ctx.brand,brand_text:ctx.brand,
      model_name:ctx.model||null,model_text:ctx.model||null,
      condition_name:resolvedCondition,condition_text:ctx.condition,item_condition:resolvedCondition,state:resolvedCondition,
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
          category:['category_name','category_text','category_slug'],brand:['brand_name','brand_text'],model:['model_name','model_text'],
          condition:['condition_name','item_condition','condition_text','state'],warranty:['warranty_text'],year:['year_value','production_year'],
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
      if(v262InvalidConditionEnum(error)){
        conditionCandidateIndex+=1;
        if(conditionCandidateIndex<conditionCandidates.length){
          const nextCondition=conditionCandidates[conditionCandidateIndex];
          let changed=false;
          ['condition','condition_name','item_condition','state'].forEach(key=>{
            if(Object.prototype.hasOwnProperty.call(body,key)){body[key]=nextCondition;changed=true}
          });
          if(changed)continue;
        }
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
    // v2.74: use a dedicated RPC for image metadata first.
    // This avoids the PostgREST INSERT path that returns a project-specific ON CONFLICT error.
    try{
      const rpc=await client.rpc('add_listing_image_metadata',{
        p_listing_id:listingId,
        p_storage_bucket:'listing-images',
        p_storage_path:path,
        p_position:index,
        p_is_primary:index===0&&!isLabel,
        p_image_type:isLabel?'label':'gallery',
        p_mime_type:file?.type||'image/webp',
        p_file_size:Number(file?.size||0)
      });
      if(!rpc.error)return true;
      const msg=String(rpc.error?.message||'');
      if(!/function .*add_listing_image_metadata.*does not exist|could not find the function|pgrst202/i.test(msg))throw rpc.error;
      console.warn('Image metadata RPC is not installed yet; falling back to direct insert.',rpc.error);
    }catch(rpcErr){
      const msg=String(rpcErr?.message||rpcErr||'');
      if(!/function .*add_listing_image_metadata.*does not exist|could not find the function|pgrst202/i.test(msg))throw rpcErr;
    }

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

  function v273StorageConflict(error){
    return /no unique or exclusion constraint matching the ON CONFLICT specification/i.test(String(error?.message||error||''));
  }

  async function v273UploadStorageObject(path,file){
    const bucket=client.storage.from('listing-images');
    const options={cacheControl:'31536000',contentType:file?.type||undefined};

    // Prefer a signed upload token. It uses the user's normal INSERT permission,
    // but avoids the standard browser-upload code path that is currently
    // returning a PostgreSQL ON CONFLICT schema error in this project.
    try{
      const signed=await bucket.createSignedUploadUrl(path,{upsert:false});
      const token=signed?.data?.token;
      if(!signed?.error&&token){
        const sent=await bucket.uploadToSignedUrl(path,token,file,options);
        if(!sent?.error)return sent;
        if(!v273StorageConflict(sent.error))throw sent.error;
        console.warn('Signed Storage upload hit ON CONFLICT; trying standard upload once.',sent.error);
      }else if(signed?.error){
        console.warn('Could not create signed upload URL; falling back to standard upload.',signed.error);
      }
    }catch(err){
      if(!v273StorageConflict(err))console.warn('Signed upload path unavailable; falling back to standard upload.',err);
    }

    const direct=await bucket.upload(path,file,{...options,upsert:false});
    if(direct?.error)throw direct.error;
    return direct;
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
        const up=await v273UploadStorageObject(path,file);
        if(up?.error)throw up.error;
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
    const post=qs('.post-layout');
    const sections=post?qsa('.form-section',post):[];
    const requiredControls=post?qsa('[data-smart-required]',post):[];
    const missingRequired=requiredControls.filter(ctrl=>{
      if(ctrl.disabled||ctrl.closest('[hidden]'))return false;
      const value=v260Clean(ctrl.value);
      return !value || (ctrl.type==='number' && Number(value)<=0);
    });
    if(missingRequired.length){
      const first=missingRequired[0];
      const label=v260Clean(first.closest('.field')?.querySelector('label')?.textContent).replace(/\s*\*?\s*$/,'');
      errors.push(label?`Попълни „${label}“.`:'Попълни задължителните полета.');
      const section=first.closest('.form-section');
      const index=sections.indexOf(section);
      if(index>=0)step=index;
    }
    if(!ctx.category){errors.push('Избери категория.');step=Math.max(step,0)}
    if(!ctx.brand){errors.push('Избери или въведи марка.');step=Math.max(step,0)}
    if(!ctx.condition){errors.push('Избери състояние.');step=Math.max(step,2)}
    if(!(ctx.price>0)){errors.push('Въведи валидна цена.');step=Math.max(step,2)}
    if(!ctx.defects){errors.push('Опиши дефектите или напиши „Няма“.');step=Math.max(step,2)}
    if(!ctx.description){errors.push('Добави описание.');step=Math.max(step,3)}
    if(!ctx.city){errors.push('Въведи населено място.');step=Math.max(step,4)}
    if(!ctx.delivery){errors.push('Избери начин на доставка.');step=Math.max(step,4)}
    // v2.70: structured fields accept only values offered by the UI.
    const allowedCategories=new Set(['Перални','Сушилни','Перални със сушилни','Хладилници','Фризери','Съдомиялни','Фурни','Готварски печки','Котлони','Аспиратори','Микровълнови','Климатици','Бойлери','Друга бяла техника']);
    const allowedConditions=new Set(['Ново','Разопаковано/мострено','Реновирано','Като ново','Много добро','Добро','С дефект','За ремонт/части']);
    const allowedWarranty=new Set(['Без гаранция','3 месеца','6 месеца','12 месеца','24+ месеца']);
    const allowedDelivery=new Set(['Лично предаване','Куриер','Собствен транспорт']);
    if(ctx.category&&!allowedCategories.has(ctx.category)){errors.push('Избери валидна категория от списъка.');step=Math.max(step,0)}
    if(ctx.condition&&!allowedConditions.has(ctx.condition)){errors.push('Избери валидно състояние от списъка.');step=Math.max(step,2)}
    if(ctx.warranty&&!allowedWarranty.has(ctx.warranty)){errors.push('Избери валидна гаранция от списъка.');step=Math.max(step,2)}
    if(ctx.delivery&&!allowedDelivery.has(ctx.delivery)){errors.push('Избери валиден начин на доставка от списъка.');step=Math.max(step,4)}
    // v2.70: explicit text limits before anything is sent to Supabase.
    const countChars=value=>Array.from(String(value??'')).length;
    const textRules=[
      {value:ctx.brand,label:'Марка',min:1,max:50,step:0,optional:false},
      {value:ctx.model,label:'Модел',min:0,max:60,step:0,optional:true},
      {value:ctx.defects,label:'Известни дефекти или забележки',min:1,max:1000,step:2,optional:false},
      {value:ctx.description,label:'Описание',min:20,max:2000,step:3,optional:false},
      {value:ctx.city,label:'Населено място',min:2,max:60,step:4,optional:false},
      {value:ctx.phone,label:'Телефон',min:6,max:15,step:4,optional:true}
    ];
    for(const rule of textRules){
      const n=countChars(rule.value);
      if(rule.optional&&n===0)continue;
      if(n<rule.min){errors.push(`„${rule.label}“ трябва да е поне ${rule.min} символа.`);step=Math.max(step,rule.step)}
      if(n>rule.max){errors.push(`„${rule.label}“ може да е максимум ${rule.max} символа.`);step=Math.max(step,rule.step)}
    }
    if(ctx.phone&&!/^\d{6,15}$/.test(ctx.phone)){errors.push('Телефонът може да съдържа само 6–15 цифри.');step=Math.max(step,4)}
    if(ctx.price>1000000){errors.push('Цената може да бъде максимум 1 000 000 €.');step=Math.max(step,2)}
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

  // v2.90: server catalog and pending orders; no browser-side payment completion.
  function v290PaidFlags(settings){
    return cfg.freeBeta===false&&cfg.paidServicesEnabled===true&&cfg.promotionPurchaseUiEnabled===true
      &&settings?.free_beta===false&&settings?.paid_services_enabled===true;
  }
  async function v290PaidReady(){
    if(cfg.freeBeta!==false||cfg.paidServicesEnabled!==true||cfg.promotionPurchaseUiEnabled!==true)return false;
    const {data,error}=await client.from('monetization_settings').select('*').eq('singleton',true).single();
    return !error&&v290PaidFlags(data);
  }
  function v290Price(p){
    const money=n=>new Intl.NumberFormat('bg-BG',{style:'currency',currency:'EUR'}).format(Number(n));
    return (p.on_promo?`<del>${esc(money(p.regular_price))}</del> `:'')+`<strong>${esc(money(p.current_price))}</strong>`
      +(p.on_promo&&p.promo_ends_at?` · до ${esc(fmtBgDate(p.promo_ends_at,true))}`:'');
  }
  async function v290InitPurchasePages(session){
    const root=qs('[data-promote-root],[data-checkout-root]');if(!root)return;
    const closed=()=>{root.innerHTML='<div class="feature-disabled"><h1>Публикуването е безплатно</h1><p>В момента не се предлагат платени услуги.</p><a class="primary-btn" href="my-ads.html">Моите обяви</a></div>'};
    closed();
    if(!session?.user?.id||!await v290PaidReady())return;
    const res=await client.rpc('get_promotion_catalog');
    if(res.error){root.innerHTML='<p>Не успяхме да заредим услугите. Презареди страницата.</p>';return}
    const catalog=res.data||[],params=new URLSearchParams(location.search),listing=params.get('listing')||'';
    if(listing){
      const r=await client.from('listings').select('id,seller_id,status').eq('id',listing).single();
      if(r.error||r.data?.seller_id!==session.user.id||r.data?.status!=='active'){
        root.innerHTML='<p>Избери своя активна обява.</p><a href="my-ads.html">Моите обяви</a>';return;
      }
    }
    if(root.hasAttribute('data-promote-root')){
      root.innerHTML='<h1>Промотирай обява</h1><div class="promotion-grid">'+catalog.map(p=>`<article class="promo-card"><h2>${esc(p.item_name)}</h2><p>${esc(p.description||'')}</p><p>${v290Price(p)}</p><a class="primary-btn" href="checkout.html?item=${encodeURIComponent(p.item_id)}&type=${encodeURIComponent(p.item_type)}${listing&&p.item_type==='product'?'&listing='+encodeURIComponent(listing):''}">${listing&&p.item_type==='product'?'Купи и използвай':'Купи'}</a></article>`).join('')+'</div>';return;
    }
    const item=catalog.find(p=>p.item_id===params.get('item')&&p.item_type===(params.get('type')||'product'));
    if(!item||listing&&item.item_type!=='product'){root.innerHTML='<p>Невалидна услуга.</p>';return}
    // A separately integrated server payment adapter is required before launch.
    // It must use only the server order ID and verify payment by webhook.
    const adapter=window.UrediPayments;
    const ready=typeof adapter?.startCheckout==='function';
    root.innerHTML=`<div class="checkout-shell"><div class="checkout-card"><h1>${esc(item.item_name)}</h1><p>${v290Price(item)}</p><p>${listing?'Услугата ще се активира за обявата след потвърдено плащане.':'Активациите ще бъдат добавени в профила след потвърдено плащане.'}</p>${ready?'':'<p>Плащанията още не са достъпни.</p>'}<button type="button" class="primary-btn" data-real-checkout ${ready?'':'disabled'}>Продължи към плащане</button><p data-checkout-status role="status"></p><a href="my-ads.html">Моите обяви</a></div></div>`;
    let orderId=null;
    qs('[data-real-checkout]',root).addEventListener('click',async e=>{
      const b=e.currentTarget;if(b.disabled)return;busy(b,true);
      try{
        if(!await v290PaidReady())throw new Error('Платените услуги са изключени.');
        if(!orderId){
          const r=await client.rpc('create_promotion_order',{p_item_type:item.item_type,p_item_id:item.item_id,p_listing_id:listing||null,p_apply_immediately:!!listing});
          if(r.error)throw r.error;orderId=r.data;
        }
        await adapter.startCheckout({orderId});
        qs('[data-checkout-status]',root).textContent='Очаква се потвърждение на плащането.';
      }catch(err){qs('[data-checkout-status]',root).textContent='Плащането не е завършено. '+(err.message||'Опитай отново.');}
      finally{busy(b,false)}
    });
  }

  async function v260RenderPostPromotionChoices(session){
    window.UrediPostAdPromotion={getSelected:()=>'',isPurchase:()=>false};
    if(file()!=='post-ad.html'||!session?.user?.id)return '';
    // This entire selector stays absent during FREE BETA, including bonus choices.
    if(cfg.freeBeta!==false || cfg.postPromotionEnabled!==true)return '';
    const post=qs('.post-layout');if(!post)return '';
    const sections=qsa('.form-section',post),last=sections[sections.length-1],panel=last?.querySelector('.panel-body');
    if(!panel)return '';
    let box=qs('[data-supa-post-promotion]',panel);
    if(box)box.remove();
    box=document.createElement('div');box.className='post-promotion-box supa-post-promotion';box.dataset.supaPostPromotion='';
    box.innerHTML='<div class="post-promo-title"><strong>Промотирай веднага</strong><span>Зареждаме наличните ти активации…</span></div>';
    const callout=panel.querySelector('.success-callout');panel.insertBefore(box,callout?.closest('.form-grid')||panel.firstChild);

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
    let catalog=[];
    if(await v290PaidReady()){
      const res=await client.rpc('get_promotion_catalog');
      if(!res.error)catalog=(res.data||[]).filter(p=>p.item_type==='product'&&!groups.some(g=>g.product.id===p.item_id));
    }
    const purchaseOptions=catalog.map(p=>`<label class="post-promo-option"><input type="radio" name="supa-post-promotion" value="${esc(p.item_id)}"><span><b>${esc(p.item_name)}</b><small>${v290Price(p)} · плащане след публикуване</small></span></label>`).join('');
    const options=groups.map(g=>{
      const p=g.product,label=p?.name||promoKindLabel(p?.kind);
      const expiry=g.earliestExpiry?`<small>Налични: ${g.quantity} · използвай до ${esc(fmtBgDate(g.earliestExpiry))}</small>`:`<small>Налични: ${g.quantity}</small>`;
      return `<label class="post-promo-option"><input type="radio" name="supa-post-promotion" value="${esc(p.id)}"><span><b>Използвай 1 × ${esc(label)}</b>${expiry}</span>${g.hasBonus?'<em>ПОДАРЪК</em>':''}</label>`;
    }).join('');
    box.innerHTML=`<div class="post-promo-title"><strong>Промотирай веднага</strong><span>По желание. Избраната активация се използва едва след успешно публикуване.</span></div><label class="post-promo-option is-selected"><input type="radio" name="supa-post-promotion" value="" checked><span><b>Публикувай без промотиране</b><small>Можеш да промотираш и по-късно.</small></span></label>${options}${purchaseOptions}${groups.length||catalog.length?'':'<div class="post-promo-none">Нямаш налична активация в момента.</div>'}<a class="post-promo-packages" href="profile-promotions.html">Промотиране на обяви</a>`;
    const publish=qs('[data-publish]');
    const sync=()=>{
      qsa('.post-promo-option',box).forEach(x=>x.classList.toggle('is-selected',!!x.querySelector('input')?.checked));
      const id=box.querySelector('input[name="supa-post-promotion"]:checked')?.value||'';
      const group=groups.find(g=>g.product.id===id);
      if(publish)publish.textContent=group?`Публикувай + ${group.product.short_name||group.product.name||promoKindLabel(group.product.kind)}`:'Публикувай безплатно';
    };
    box.addEventListener('change',sync);sync();
    window.UrediPostAdPromotion={getSelected:()=>cfg.freeBeta===false&&cfg.postPromotionEnabled===true?(box.querySelector('input[name="supa-post-promotion"]:checked')?.value||''):'',isPurchase:id=>catalog.some(p=>p.item_id===id),data};
    return box;
  }

  async function initSupabasePostAd(session,account){
    if(file()!=='post-ad.html'||!session?.user?.id)return;
    const post=qs('.post-layout'),publish=qs('[data-publish]');if(!post||!publish)return;
    // Prefill only when the user has not already typed something.
    const city=qs('[data-ad-city]'),phone=qs('[data-ad-phone]');
    if(city&&!v260Clean(city.value))city.value=account?.profile?.city||account?.dealer?.company_city||'';
    if(phone&&(phone.value==='0888 123 456'||phone.value==='0888123456'||!v260Clean(phone.value)))phone.value=account?.private?.phone||account?.dealer?.business_phone||'';
    if(phone){
      const digitsOnly=()=>{const clean=String(phone.value||'').replace(/\D+/g,'').slice(0,15);if(phone.value!==clean)phone.value=clean};
      digitsOnly();
      phone.addEventListener('input',digitsOnly);
      phone.addEventListener('paste',()=>setTimeout(digitsOnly,0));
    }
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
      const selectedPromotion=cfg.freeBeta===false&&cfg.postPromotionEnabled===true?(window.UrediPostAdPromotion?.getSelected?.()||''):'';
      const purchasePromotion=selectedPromotion&&window.UrediPostAdPromotion?.isPurchase?.(selectedPromotion);
      const photos=window.marketPreparedPhotos||[],label=window.marketPreparedLabelPhoto||null;
      publish.dataset.actionBusy='1';publish.classList.add('is-publishing');publish.dataset.oldText=publish.textContent;publish.disabled=true;publish.textContent='Създаване на обявата…';
      v260PostFeedback('ok','<strong>Публикуваме обявата.</strong><br>Не затваряй страницата, докато снимките се качват.');
      let listing=null;const uploaded=[];let publishStage='създаване на обявата';
      try{
        listing=await v260AdaptiveInsertListing(ctx);
        publishStage='качване на снимките';
        publish.textContent=`Качване на снимки 0/${photos.length+(label?1:0)}…`;
        const all=[...photos.map(x=>({file:x.file,isLabel:false}))];if(label)all.push({file:label,isLabel:true});
        for(let i=0;i<all.length;i++){
          const {file:imgFile,isLabel}=all[i];
          const path=`${session.user.id}/${listing.id}/${String(i).padStart(2,'0')}-${v260Uuid()}.${v260FileExt(imgFile)}`;
          publishStage=`качване на файл ${i+1}/${all.length}`;
          const up=await v273UploadStorageObject(path,imgFile);
          if(up?.error)throw up.error;
          uploaded.push(path);
          publish.textContent=`Качване на снимки ${i+1}/${all.length}…`;
        }
        publishStage='запазване на снимките към обявата';
        publish.textContent='Запазване на снимките…';
        const labelPath=label&&uploaded.length?uploaded[uploaded.length-1]:'';
        await v275SaveListingImagePaths(listing.id,ctx,uploaded,labelPath);
        publishStage='активиране на обявата';
        publish.textContent='Активиране на обявата…';
        let rpc=await client.rpc('publish_listing',{p_listing_id:listing.id});
        if(rpc.error){
          rpc=await client.rpc('set_listing_status',{p_listing_id:listing.id,p_status:'active'});
          if(rpc.error)await v260AdaptiveUpdateListing(listing.id,{status:'active'});
        }
        try{await v260AdaptiveUpdateListing(listing.id,{published_at:v260NowIso(),expires_at:v260ExpiryIso(),updated_at:v260NowIso()})}catch(err){console.warn('Listing timestamps:',err)}
        let promoted=false,promoFailed=false;
        if(selectedPromotion&&!purchasePromotion){
          publishStage='активиране на промотирането';
          publish.textContent='Активиране на промотирането…';
          try{
            const promo=await client.rpc('activate_promotion',{p_listing_id:listing.id,p_product_id:selectedPromotion});
            if(promo.error)throw promo.error;
            promoted=true;
          }catch(err){promoFailed=true;console.warn('Promotion after publish:',err)}
        }
        post.dataset.supabaseSafeLeave='1';document.documentElement.dataset.supabasePublishing='1';
        const q=new URLSearchParams({published:'1',id:listing.id});
        if(promoted)q.set('promoted','1');if(promoFailed)q.set('promo_failed','1');
        location.href=purchasePromotion?'checkout.html?item='+encodeURIComponent(selectedPromotion)+'&listing='+encodeURIComponent(listing.id)+'&context=publish':'my-ads.html?'+q.toString();
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
        if(/no unique or exclusion constraint matching the ON CONFLICT/i.test(technical))msg=`Supabase върна технически ON CONFLICT проблем при ${publishStage}. v2.75 не записва новите снимки в listing_images; прати този екран, ако проблемът остане.`;
        else if(/row-level security|permission denied/i.test(technical))msg='Supabase не позволи записването на обявата. Ще трябва да коригираме RLS правилото за listings.';
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

  function v275ImagePathsFromRow(row){
    let direct=row?.image_paths;
    if(typeof direct==='string'){try{direct=JSON.parse(direct)}catch{direct=[]}}
    if(Array.isArray(direct)&&direct.length)return direct.map(String).filter(Boolean);
    let raw=v260Val(row,'specs','attributes','details')||{};
    if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{raw={}}}
    const stored=raw&&typeof raw==='object'?raw.__image_paths:null;
    if(typeof stored==='string'){try{return JSON.parse(stored).map(String).filter(Boolean)}catch{return []}}
    return Array.isArray(stored)?stored.map(String).filter(Boolean):[];
  }

  function v275PseudoImage(path){
    return path?{storage_bucket:'listing-images',storage_path:String(path)}:null;
  }

  async function v275SaveListingImagePaths(listingId,ctx,paths,labelPath=''){
    const cleanPaths=(paths||[]).map(String).filter(Boolean);
    const meta={...(ctx.specs||{}),__image_paths:cleanPaths};
    if(labelPath)meta.__label_path=String(labelPath);
    const attempts=[
      {image_paths:cleanPaths},
      {specs:meta},
      {attributes:meta},
      {details:meta}
    ];
    let lastError=null;
    for(const body of attempts){
      const key=Object.keys(body)[0];
      const {error}=await client.from('listings').update(body).eq('id',listingId).eq('seller_id',ctx.sellerId);
      if(!error){ctx.specs=meta;return true}
      lastError=error;
      const unknown=v260UnknownColumn(error);
      if(unknown===key)continue;
      throw error;
    }
    throw lastError||new Error('Не успяхме да запазим снимките към обявата.');
  }

  const v279CategoryNameBySlug=Object.fromEntries(Object.entries(v268CategorySlugFallback).map(([name,slug])=>[String(slug),name]));

  function v279StoredCategory(row){
    const direct=v260Clean(v260Val(row,'category','category_name','category_text'));
    if(direct&&direct!=='Бяла техника')return direct;
    const slug=v260Clean(v260Val(row,'category_slug','slug')).toLowerCase();
    if(slug&&v279CategoryNameBySlug[slug])return v279CategoryNameBySlug[slug];
    // Older/adaptive rows may have kept the category only in the generated title.
    const title=v260Clean(row?.title);
    for(const name of Object.keys(v268CategorySlugFallback)){
      if(title&&v260Norm(title).includes(v260Norm(name)))return name;
    }
    return direct||'Бяла техника';
  }

  function v260ListingFields(row){
    let specs=v260Val(row,'specs','attributes','details')||{};
    if(typeof specs==='string'){try{specs=JSON.parse(specs)}catch{specs={}}}
    const imagePaths=v275ImagePathsFromRow(row);
    if(specs&&typeof specs==='object'){
      specs={...specs};
      delete specs.__image_paths;
      delete specs.__label_path;
    }
    return {
      category:v279StoredCategory(row),
      brand:v260Clean(v260Val(row,'brand','brand_name','brand_text')),
      model:v260Clean(v260Val(row,'model','model_name','model_text')),
      condition:v260Clean(specs['Състояние'])||v262ConditionLabel(v260Clean(v260Val(row,'condition_name','condition_text','condition','state'))),
      warranty:v260Clean(v260Val(row,'warranty','warranty_text')),
      year:v260Val(row,'year','year_value','production_year'),
      description:v260Clean(v260Val(row,'description')),
      defects:v260Clean(v260Val(row,'defects')),
      city:v260Clean(v260Val(row,'city','city_name','city_text')),
      delivery:v260Clean(v260Val(row,'delivery','delivery_method','delivery_text')),
      phone:v260Clean(v260Val(row,'phone','contact_phone','phone_contact')),
      showPhone:!!v260Val(row,'show_phone','phone_visible'),
      specs:specs&&typeof specs==='object'?specs:{},
      imagePaths,
      currency:v260Clean(v260Val(row,'currency'))||'EUR'
    };
  }

  function v260PublicImageUrl(img){
    if(!img?.storage_path)return 'assets/img/no-photo.svg';
    try{return client.storage.from(img.storage_bucket||'listing-images').getPublicUrl(img.storage_path).data.publicUrl||'assets/img/no-photo.svg'}catch{return 'assets/img/no-photo.svg'}
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
    const names={no_frost:'No Frost',inverter:'Инверторен',convection:'Вентилатор / конвекция',grill:'Грил'};
    return Object.entries(fields.specs||{}).flatMap(([key,value])=>{
      if(key.startsWith('__')||value==null||typeof value==='object')return [];
      const label=names[key]||key.trim(),text=String(value).trim();
      if(!label||!text)return [];
      const normalized=text.toLocaleLowerCase('bg-BG');
      if(value===true||['да','yes','true'].includes(normalized))return [label];
      if(value===false||['не','no','false'].includes(normalized))return [label+': Не'];
      return [text];
    }).slice(0,3).join(' · ');
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
    return `<article class="listing-row real-listing-row${promoState?.kind==='vip'?' vip':promoState?.kind==='top'?' top':''}" data-real-listing="1" data-listing-id="${esc(row.id)}" data-brand="${esc(f.brand)}" data-category="${esc(f.category)}" data-city="${esc(f.city)}" data-code="${esc(f.model)}" data-created="${created}" data-bumped="${bumped}" data-model="${esc(f.model)}" data-price="${Number(row.price||0)}" data-promo-rank="${v260PromoRank(promo)}" data-search="${esc(search)}" data-seller-type="${dealer?'trader':'private'}" data-state="${esc(f.condition)}" data-delivery="${['Куриер','Собствен транспорт'].includes(f.delivery)?'1':'0'}" data-photos="${img||f.imagePaths.length?'1':'0'}" data-warranty="${f.warranty&&f.warranty!=='Без гаранция'?'1':'0'}">
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
    const controls={category:qs('#categoryFilter'),brand:qs('#brandFilter'),state:qs('#stateFilter'),city:qs('#cityFilter'),seller:qs('#sellerTypeFilter'),minPrice:qs('#minPrice'),maxPrice:qs('#maxPrice'),q:qs('[data-listing-search]'),distance:qs('#distanceRadius'),warranty:qs('#warrantyFilter'),delivery:qs('#deliveryFilter'),photos:qs('#photosFilter')};
    const sort=qs('[data-sort-listings]'),count=qs('[data-result-count]'),zero=qs('[data-zero-results]'),loadMore=qs('[data-load-more]'),chips=qs('[data-active-filters]'),chipWrap=qs('[data-active-filters-wrap]');
    let limit=Number(cfg.resultPagination?.initial||5);
    const params=new URLSearchParams(location.search);
    const set=(key,value)=>{const c=controls[key];if(!c||!value)return;if(c.tagName==='SELECT'){const opt=[...c.options].find(o=>v260Norm(o.value||o.textContent)===v260Norm(value));if(opt)c.value=opt.value}else c.value=value};
    set('category',params.get('category'));set('brand',params.get('brand'));set('state',params.get('state'));set('city',params.get('city'));set('seller',params.get('seller'));set('minPrice',params.get('minPrice'));set('maxPrice',params.get('maxPrice')||params.get('max'));set('q',params.get('q'));
    const value=k=>controls[k]?.type==='checkbox'?(controls[k].checked?'1':''):v260Clean(controls[k]?.value);
    const matches=row=>{
      const q=value('q'),tokens=v260QueryTokens(q),hay=v260Norm([row.dataset.search,row.dataset.brand,row.dataset.model,row.dataset.city,row.dataset.state,row.dataset.category].join(' '));
      const white=['бяла техника','електроуреди','уреди','уред'].includes(v260Norm(q));
      const qOk=!q||white||v260Norm(q).split(/\s+/).filter(Boolean).every(t=>v260QueryTokens(t).some(alias=>hay.includes(alias)));
      const min=Number(value('minPrice').replace(',','.')||0),max=Number(value('maxPrice').replace(',','.')||999999999);
      return qOk&&(!value('category')||v260CategoryAlias(row.dataset.category)===v260CategoryAlias(value('category')))&&(!value('brand')||v260Norm(row.dataset.brand)===v260Norm(value('brand')))&&(!value('state')||v260Norm(row.dataset.state)===v260Norm(value('state')))&&(!value('city')||v260Norm(row.dataset.city)===v260Norm(value('city')))&&(!value('seller')||row.dataset.sellerType===value('seller'))&&(!value('warranty')||row.dataset.warranty==='1')&&(!value('delivery')||row.dataset.delivery==='1')&&(!value('photos')||row.dataset.photos==='1')&&(!value('distance')||!!window.UrediGeo?.matches(row,Number(value('distance'))))&&Number(row.dataset.price||0)>=min&&Number(row.dataset.price||0)<=max;
    };
    const drawChips=()=>{
      if(!chips||!chipWrap)return;const active=[];Object.entries(controls).forEach(([k,c])=>{const v=value(k);if(v)active.push([k,c?.type==='checkbox'?'Да':v])});
      const labels={q:'Търсене',category:'Категория',brand:'Марка',state:'Състояние',city:'Град',seller:'Продавач',minPrice:'Цена от',maxPrice:'Цена до',distance:'Разстояние (км)',warranty:'С гаранция',delivery:'Предлага доставка',photos:'Само със снимки'};
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
      const rm=e.target.closest('[data-supa-remove-filter]');if(rm){const c=controls[rm.dataset.supaRemoveFilter];if(c){c.value='';if(c.type==='checkbox')c.checked=false;limit=Number(cfg.resultPagination?.initial||5);apply()}return}
      if(e.target.closest('[data-clear-filters]')){Object.values(controls).filter(Boolean).forEach(c=>{if(c.type==='checkbox')c.checked=false;else c.value=''});window.UrediGeo?.reset();limit=Number(cfg.resultPagination?.initial||5);apply()}
    });
    document.addEventListener('uredi:geo-change',()=>{limit=Number(cfg.resultPagination?.initial||5);apply()});
    document.addEventListener('click',e=>{if(e.target.closest('[data-remove-last-filter]')){const k=Object.keys(controls).reverse().find(k=>value(k));if(k){const c=controls[k];if(c.type==='checkbox')c.checked=false;else c.value='';limit=Number(cfg.resultPagination?.initial||5);apply()}}});
    apply();
  }

  async function v304LoadActiveListings(){
    const rows=[];
    try{
      for(let offset=0;;){
        const r=await client.from('listings').select('*').eq('status','active').order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+199);
        if(r.error)return {data:null,error:r.error};
        if(!r.data?.length)break;
        rows.push(...r.data);offset+=r.data.length;
      }
      return {data:[...new Map(rows.map(r=>[r.id,r])).values()],error:null};
    }catch(error){return {data:null,error}}
  }
  async function v304RelatedRows(table,columns,key,ids){
    const data=[];
    for(let i=0;i<ids.length;i+=50){
      const r=await client.from(table).select(columns).in(key,ids.slice(i,i+50));
      if(r.error)return {data:[],error:r.error};
      data.push(...(r.data||[]));
    }
    return {data,error:null};
  }

  async function initPublicListings(){
    if(file()!=='listings.html')return;
    const list=qs('.listing-list');if(!list)return;
    list.dataset.supabaseLoading='1';
    const skeleton=qs('[data-results-skeleton]');if(skeleton)skeleton.classList.remove('is-hidden');
    const {data:listings,error}=await v304LoadActiveListings();
    if(error){console.error('Public listings:',error);list.innerHTML='<div class="real-listings-error"><strong>Не успяхме да заредим обявите.</strong><span>Обнови страницата след малко.</span></div>';if(skeleton)skeleton.classList.add('is-hidden');return}
    const rows=listings||[],ids=rows.map(x=>x.id),sellerIds=[...new Set(rows.map(x=>x.seller_id).filter(Boolean))];
    const [imagesRes,promosRes,profilesRes]=await Promise.all([
      v304RelatedRows('listing_images','*','listing_id',ids),
      v304RelatedRows('listing_promotion_state','listing_id,product_id,kind,started_at,expires_at,bumped_at,updated_at','listing_id',ids),
      v304RelatedRows('profiles','id,display_name,profile_type,city','id',sellerIds)
    ]);
    if(imagesRes.error)console.warn(imagesRes.error);if(promosRes.error)console.warn(promosRes.error);if(profilesRes.error)console.warn(profilesRes.error);
    const images=(imagesRes.data||[]).sort(v260ImageSort),firstImage=new Map();images.forEach(img=>{if(!firstImage.has(img.listing_id))firstImage.set(img.listing_id,img)});
    rows.forEach(row=>{const path=v275ImagePathsFromRow(row)[0];if(path)firstImage.set(row.id,v275PseudoImage(path))});
    const promoMap=new Map((promosRes.data||[]).map(x=>[x.listing_id,x])),profileMap=new Map((profilesRes.data||[]).map(x=>[x.id,x]));
    list.innerHTML=rows.map(row=>v260ListingRowHTML(row,firstImage.get(row.id),profileMap.get(row.seller_id),promoMap.get(row.id))).join('');
    v288HydratePriceHistory(list).catch(console.warn);
    // Add real brands to the filter without removing the curated defaults.
    const brandSelect=qs('#brandFilter');if(brandSelect){const existing=new Set([...brandSelect.options].map(o=>v260Norm(o.value||o.textContent)));rows.forEach(r=>{const b=v260ListingFields(r).brand;if(b&&!existing.has(v260Norm(b))){const o=document.createElement('option');o.value=b;o.textContent=b;brandSelect.appendChild(o);existing.add(v260Norm(b))}})}
    if(skeleton)skeleton.classList.add('is-hidden');list.dataset.supabaseLoading='0';v260BindPublicFilters();
    // Re-bind favorite buttons that were added after app-v260 initialized.
    const stored=(()=>{try{return JSON.parse(localStorage.getItem('favorites')||'[]')}catch{return []}})();
    qsa('[data-favorite]',list).forEach(btn=>{const id=btn.dataset.favorite;if(stored.includes(id))btn.classList.add('active');if(btn.dataset.supaFavBound)return;btn.dataset.supaFavBound='1';btn.addEventListener('click',e=>{e.preventDefault();let arr;try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{arr=[]}arr.includes(id)?arr=arr.filter(x=>x!==id):arr.push(id);localStorage.setItem('favorites',JSON.stringify(arr));btn.classList.toggle('active')})});
  }

  function v276HomeFeaturedCard(row,img,profile,promo){
    const f=v260ListingFields(row);
    const state=v260ActivePromo(promo);
    const tier=state?.kind==='vip'?'VIP':state?.kind==='top'?'TOP':state?.kind==='bump'?'Изкачи':'';
    const badge=tier&&tier!=='Изкачи'?`<span class="promo-badge badge ${tier==='VIP'?'badge-vip':'badge-top'}">${tier}</span>`:'';
    const seller=profile?.display_name||'Продавач';
    const dealer=profile?.profile_type==='dealer';
    const spec=v260SpecSummary(f);
    return `<article class="product-card real-home-card" data-real-home-listing="${esc(row.id)}" data-listing-id="${esc(row.id)}" data-price="${Number(row.price||0)}">
      ${badge}<button aria-label="Добави в любими" class="fav-float" data-favorite="${esc(row.id)}"><span class="ico"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></span></button>
      <a href="listing.html?id=${encodeURIComponent(row.id)}"><img alt="${esc(row.title||'Обява')}" class="product-img" decoding="async" loading="lazy" src="${esc(v260PublicImageUrl(img))}"/></a>
      <div class="card-body"><a href="listing.html?id=${encodeURIComponent(row.id)}"><div class="product-category-label">${esc(f.category)}</div><h3 class="product-title">${esc(row.title||'Обява')}</h3>${spec?`<div class="product-specs">${esc(spec)}</div>`:''}</a>
      <div class="product-meta"><div class="price">${esc(v260Money(row.price))}</div><span class="location">${esc(f.city||'България')}</span></div>
      <div class="seller-line"><span class="seller-name">${esc(seller)}</span>${dealer?'<span class="badge badge-seller-type">Търговец</span>':''}</div></div>
    </article>`;
  }

  async function initRealHomeFeatured(){
    if(file()!=='index.html')return;
    const section=qs('[data-featured-promo-section]'),grid=qs('[data-featured-promo-grid]');
    if(!section||!grid)return;
    try{
      const {data:listings,error}=await client.from('listings').select('*').eq('status','active').order('created_at',{ascending:false}).limit(80);
      if(error)throw error;
      const rows=listings||[];
      if(!rows.length){section.hidden=true;return}
      const ids=rows.map(x=>x.id),sellerIds=[...new Set(rows.map(x=>x.seller_id).filter(Boolean))];
      const [promosRes,imagesRes,profilesRes]=await Promise.all([
        client.from('listing_promotion_state').select('listing_id,product_id,kind,started_at,expires_at,bumped_at,updated_at').in('listing_id',ids),
        client.from('listing_images').select('*').in('listing_id',ids),
        sellerIds.length?client.from('profiles').select('id,display_name,profile_type,city').in('id',sellerIds):Promise.resolve({data:[],error:null})
      ]);
      if(promosRes.error)throw promosRes.error;
      const promoMap=new Map((promosRes.data||[]).map(x=>[x.listing_id,x]));
      const profileMap=new Map((profilesRes.data||[]).map(x=>[x.id,x]));
      const firstImage=new Map();
      (imagesRes.data||[]).sort(v260ImageSort).forEach(img=>{if(!firstImage.has(img.listing_id))firstImage.set(img.listing_id,img)});
      rows.forEach(row=>{const path=v275ImagePathsFromRow(row)[0];if(path)firstImage.set(row.id,v275PseudoImage(path))});

      const promoted=rows.map(row=>({row,state:v260ActivePromo(promoMap.get(row.id))})).filter(x=>x.state);
      if(!promoted.length){section.hidden=true;grid.innerHTML='';return}
      const maxRank=Math.max(...promoted.map(x=>v260PromoRank(x.state)));
      const selected=promoted.filter(x=>v260PromoRank(x.state)===maxRank)
        .sort((a,b)=>new Date(b.state.updated_at||b.state.started_at||b.row.created_at||0)-new Date(a.state.updated_at||a.state.started_at||a.row.created_at||0))
        .slice(0,4);
      grid.innerHTML=selected.map(x=>v276HomeFeaturedCard(x.row,firstImage.get(x.row.id),profileMap.get(x.row.seller_id),x.state)).join('');
      await v288HydratePriceHistory(grid);
      const subtitle=qs('[data-featured-promo-subtitle]',section);
      if(subtitle)subtitle.textContent=maxRank===3?'VIP обяви':maxRank===2?'TOP обяви':'Наскоро изкачени обяви';
      section.hidden=false;

      let favs=[];try{favs=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{}
      qsa('[data-favorite]',grid).forEach(btn=>{
        const id=btn.dataset.favorite;if(favs.includes(id))btn.classList.add('active');
        btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();let arr=[];try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{};arr.includes(id)?arr=arr.filter(x=>x!==id):arr.push(id);localStorage.setItem('favorites',JSON.stringify(arr));btn.classList.toggle('active')});
      });
    }catch(err){
      console.warn('Homepage promoted listings:',err);
      section.hidden=true;
    }
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
    const id=new URLSearchParams(location.search).get('id');
    if(!v297Uuid(id)){const target=qs('#main-content');if(target)target.innerHTML='<div class="container"><h1>Обявата не е налична</h1><a href="listings.html">Към обявите</a></div>';return}
    const main=qs('#main-content');if(!main)return;
    qs('.listing-sticky-actions')?.remove();qs('[data-gallery-modal]')?.remove();qs('[data-real-gallery-modal]')?.remove();
    main.innerHTML='<div class="container"><div class="real-detail-loading">Зареждаме обявата…</div></div>';
    const {data:row,error}=await client.from('listings').select('*').eq('id',id).maybeSingle();
    if(error||!row){main.innerHTML='<div class="container"><div class="empty-state"><h1>Обявата не е налична</h1><p class="muted">Може да е свалена, изтекла или да няма публичен достъп.</p><a class="primary-btn" href="listings.html">Към обявите</a></div></div>';return}
    const [imgs,prof,promo]=await Promise.all([
      client.from('listing_images').select('*').eq('listing_id',id),
      row.seller_id?client.from('profiles').select('id,display_name,profile_type,city').eq('id',row.seller_id).maybeSingle():Promise.resolve({data:null,error:null}),
      client.from('listing_promotion_state').select('listing_id,kind,expires_at,bumped_at').eq('listing_id',id).maybeSingle()
    ]);
    const fields=v260ListingFields(row),images=(imgs.data||[]).sort(v260ImageSort);
    const storedUrls=(fields.imagePaths||[]).map(path=>v260PublicImageUrl(v275PseudoImage(path)));
    const legacyUrls=images.map(v260PublicImageUrl);
    const urls=storedUrls.length?storedUrls:legacyUrls;
    const gallery=urls.length?urls:['assets/img/no-photo.svg'];
    const profile=prof.data||{},dealer=profile.profile_type==='dealer',seller=profile.display_name||'Продавач',promoState=v260ActivePromo(promo.data);
    const badge=promoState&&(promoState.kind==='vip'||promoState.kind==='top')?`<span class="badge ${promoState.kind==='vip'?'badge-vip':'badge-top'}">${promoState.kind==='vip'?'VIP':'TOP'}</span>`:'';
    const phone=fields.showPhone&&fields.phone?fields.phone:'';
    const phoneHref=phone?'tel:'+phone.replace(/[^+\d]/g,''):'';
    const isOwnListing=!!session?.user?.id&&session.user.id===row.seller_id;
    v297RememberListing(row.id);
    document.title=(row.title||'Обява')+' · Пазар за бяла техника';document.body.dataset.listingId=id;document.body.dataset.sellerId=row.seller_id||'';
    const thumbs=gallery.map((u,i)=>`<button class="thumb${i===0?' active':''}" type="button" data-real-thumb="${i}" aria-label="Снимка ${i+1} от ${gallery.length}"><img alt="" loading="lazy" src="${esc(u)}"></button>`).join('');
    const phoneButton=!isOwnListing&&phone?`<a class="secondary-btn icon-action-button phone-action-button" href="${esc(phoneHref)}"><span class="icon-action-label">Обади се</span></a>`:'';
    const chatOnly=!isOwnListing&&!phone?`<div class="real-chat-only-note"><span class="real-chat-only-icon" aria-hidden="true">●</span><span>Контактът е достъпен само чрез вътрешния чат.</span></div>`:'';
    const messageClass=phone?'primary-btn message-action-button':'primary-btn message-action-button real-chat-only-primary';
    const primaryContactAction=isOwnListing?`<a class="primary-btn message-action-button" href="edit-ad.html?id=${encodeURIComponent(id)}">Редактирай обявата</a>`:`<a class="${messageClass}" href="messages.html?listing=${encodeURIComponent(id)}&seller=${encodeURIComponent(row.seller_id||'')}">Съобщение</a>`;
    main.innerHTML=`<div class="container real-listing-detail" data-listing-id="${esc(id)}" data-price="${Number(row.price||0)}"><div class="breadcrumb"><a href="index.html">Начало</a><span>/</span><a href="listings.html?category=${encodeURIComponent(fields.category)}">${esc(fields.category)}</a><span>/</span><span>${esc(row.title||'Обява')}</span></div>
      <div class="detail-grid"><section><div class="gallery-main real-gallery-main" data-real-gallery-main role="button" tabindex="0" aria-label="Отвори снимката на цял екран"><img alt="${esc(row.title||'Обява')}" src="${esc(gallery[0])}" fetchpriority="high"><div class="gallery-zoom-hint" aria-hidden="true">⛶</div><div class="gallery-counter" data-real-gallery-counter>1/${gallery.length}</div></div><div class="thumbs real-gallery-thumbs">${thumbs}</div>
      <div class="description-card"><h2>Описание</h2><p>${esc(fields.description||'Няма добавено описание.')}</p><h2 style="margin-top:18px">Забележки и дефекти</h2><p class="muted">${esc(fields.defects||'Няма посочени забележки.')}</p></div>
      <div class="spec-card"><div class="spec-head">Характеристики</div><div class="spec-grid">${v260SpecRows(fields)}</div></div>
      <div class="listing-action-panel"><div class="listing-action-panel-head">Действия по обявата</div><div class="detail-actions">${primaryContactAction}${phoneButton}<button class="secondary-btn" data-favorite="${esc(id)}" type="button">Запази обявата</button><button class="secondary-btn" data-real-share type="button">Сподели обявата</button><button class="secondary-btn" data-compare-real="${esc(id)}" aria-pressed="false" type="button">Сравни</button></div>${chatOnly}</div></section>
      <aside class="detail-side"><div class="detail-card"><div class="real-detail-tags"><span class="tag">${esc(fields.category)}</span>${badge}</div><div class="listing-title-row"><h1>${esc(row.title||'Обява')}</h1></div>${v260SpecSummary(fields)?`<div class="muted small">${esc(v260SpecSummary(fields))}</div>`:''}<div class="listing-updated-meta">Публикувана ${esc(v260RelativeDate(row.published_at||row.created_at))}</div><div class="price-with-trend detail-price-with-trend"><div class="detail-price">${esc(v260Money(row.price))}</div></div><div class="real-detail-location">${esc(fields.city||'България')}</div></div>
      <div class="seller-card"><div class="seller-head"><div class="avatar">${esc(v260Initials(seller))}</div><div><strong>${esc(seller)}</strong><span class="seller-type-inline"><span>${dealer?'Търговец':'Частно лице'}${profile.city?' · '+esc(profile.city):''}</span></span></div></div>${!isOwnListing&&phone?`<a class="secondary-btn seller-phone-bottom phone-action-button" href="${esc(phoneHref)}">Обади се</a>`:''}<a class="secondary-btn" href="seller.html?id=${encodeURIComponent(row.seller_id||'')}" style="width:100%;margin-top:10px">Виж профила</a>${!isOwnListing?`<div class="seller-secondary-actions"><a class="secondary-btn listing-report-button" href="report.html?type=listing&listing=${encodeURIComponent(id)}">Докладвай обявата</a></div>`:''}</div></aside></div></div>`;
    syncCompareV299();
    await v288HydratePriceHistory(main);

    let currentIndex=0;
    const setCurrent=i=>{
      currentIndex=Math.max(0,Math.min(gallery.length-1,Number(i)||0));
      const img=main.querySelector('[data-real-gallery-main] img'),counter=main.querySelector('[data-real-gallery-counter]');
      if(img)img.src=gallery[currentIndex]||gallery[0];
      if(counter)counter.textContent=`${currentIndex+1}/${gallery.length}`;
      main.querySelectorAll('[data-real-thumb]').forEach(x=>x.classList.toggle('active',Number(x.dataset.realThumb||0)===currentIndex));
    };
    main.querySelectorAll('[data-real-thumb]').forEach(btn=>btn.addEventListener('click',()=>setCurrent(btn.dataset.realThumb)));

    const modal=document.createElement('div');
    modal.className='real-gallery-modal';modal.dataset.realGalleryModal='';modal.hidden=true;
    modal.innerHTML=`<div class="real-gallery-modal-backdrop" data-real-gallery-close></div><div class="real-gallery-modal-shell" role="dialog" aria-modal="true" aria-label="Снимка на обявата"><button class="real-gallery-modal-close" type="button" data-real-gallery-close aria-label="Затвори">×</button><button class="real-gallery-modal-nav prev" type="button" data-real-gallery-prev aria-label="Предишна снимка">‹</button><img alt="${esc(row.title||'Обява')}" data-real-gallery-modal-img><button class="real-gallery-modal-nav next" type="button" data-real-gallery-next aria-label="Следваща снимка">›</button><div class="real-gallery-modal-counter" data-real-gallery-modal-counter></div></div>`;
    document.body.appendChild(modal);
    const modalImg=qs('[data-real-gallery-modal-img]',modal),modalCounter=qs('[data-real-gallery-modal-counter]',modal);
    const renderModal=()=>{if(modalImg)modalImg.src=gallery[currentIndex]||gallery[0];if(modalCounter)modalCounter.textContent=`${currentIndex+1} / ${gallery.length}`;const prev=qs('[data-real-gallery-prev]',modal),next=qs('[data-real-gallery-next]',modal);if(prev)prev.hidden=gallery.length<2;if(next)next.hidden=gallery.length<2};
    const openModal=()=>{renderModal();modal.hidden=false;document.documentElement.classList.add('real-gallery-open');document.body.classList.add('real-gallery-open');qs('[data-real-gallery-close]:not(.real-gallery-modal-backdrop)',modal)?.focus()};
    const closeModal=()=>{modal.hidden=true;document.documentElement.classList.remove('real-gallery-open');document.body.classList.remove('real-gallery-open')};
    const stepModal=delta=>{currentIndex=(currentIndex+delta+gallery.length)%gallery.length;setCurrent(currentIndex);renderModal()};
    const mainGallery=main.querySelector('[data-real-gallery-main]');
    mainGallery?.addEventListener('click',openModal);
    mainGallery?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openModal()}});
    qsa('[data-real-gallery-close]',modal).forEach(x=>x.addEventListener('click',closeModal));
    qs('[data-real-gallery-prev]',modal)?.addEventListener('click',()=>stepModal(-1));
    qs('[data-real-gallery-next]',modal)?.addEventListener('click',()=>stepModal(1));
    let touchX=null;
    modal.addEventListener('touchstart',e=>{touchX=e.touches?.[0]?.clientX??null},{passive:true});
    modal.addEventListener('touchend',e=>{if(touchX===null)return;const end=e.changedTouches?.[0]?.clientX??touchX,dx=end-touchX;touchX=null;if(Math.abs(dx)>50)stepModal(dx>0?-1:1)},{passive:true});
    document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')closeModal();if(e.key==='ArrowLeft')stepModal(-1);if(e.key==='ArrowRight')stepModal(1)});

    main.querySelector('[data-real-share]')?.addEventListener('click',async()=>{const share={title:row.title||'Обява',text:`${row.title||'Обява'} · ${v260Money(row.price)}`,url:location.href};try{if(navigator.share)await navigator.share(share);else{await navigator.clipboard.writeText(location.href);toast('Линкът е копиран.')}}catch{}});
    const fav=main.querySelector('[data-favorite]');if(fav){let arr;try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{arr=[]}fav.classList.toggle('active',arr.includes(id));fav.addEventListener('click',()=>{let a;try{a=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{a=[]}a.includes(id)?a=a.filter(x=>x!==id):a.push(id);localStorage.setItem('favorites',JSON.stringify(a));fav.classList.toggle('active')})}
  }


  async function initRealEditAd(session){
    if(file()!=='edit-ad.html'||!session?.user?.id)return;
    const id=new URLSearchParams(location.search).get('id');
    const main=qs('#main-content');
    if(!id){
      if(main)main.innerHTML='<div class="container"><div class="empty-state"><h1>Липсва обява за редактиране</h1><p class="muted">Отвори „Моите обяви“ и избери „Редактирай обявата“.</p><a class="primary-btn" href="my-ads.html">Към Моите обяви</a></div></div>';
      return;
    }
    const {data:row,error}=await client.from('listings').select('*').eq('id',id).eq('seller_id',session.user.id).maybeSingle();
    if(error||!row){
      if(main)main.innerHTML='<div class="container"><div class="empty-state"><h1>Обявата не е намерена</h1><p class="muted">Можеш да редактираш само собствените си обяви.</p><a class="primary-btn" href="my-ads.html">Към Моите обяви</a></div></div>';
      return;
    }
    const panel=qs('.panel .panel-body',main||document);
    if(!panel)return;
    const fields=v260ListingFields(row);
    const categories=['Перални','Сушилни','Перални със сушилни','Хладилници','Фризери','Съдомиялни','Фурни','Готварски печки','Котлони','Аспиратори','Микровълнови','Климатици','Бойлери','Друга бяла техника'];
    const commonBrands=['Bosch','Siemens','Samsung','LG','AEG','Beko','Miele','Whirlpool','Electrolux','Gorenje','Candy','Indesit','Hotpoint','Liebherr','Hisense','Haier','Arctic'];
    const isCommon=commonBrands.some(x=>v260Norm(x)===v260Norm(fields.brand));
    const brandValue=isCommon?fields.brand:'Друга';
    const warrantyOptions=['Без гаранция','3 месеца','6 месеца','12 месеца','24+ месеца'];
    const conditionOptions=['Ново','Разопаковано/мострено','Реновирано','Като ново','Много добро','Добро','С дефект','За ремонт/части'];
    const deliveryOptions=['Лично предаване','Куриер','Собствен транспорт'];
    const imagePaths=fields.imagePaths||[];
    const imageStrip=imagePaths.length?`<div class="edit-image-strip">${imagePaths.slice(0,6).map(path=>`<a href="listing.html?id=${encodeURIComponent(id)}" aria-label="Виж снимката в обявата"><img alt="" src="${esc(v260PublicImageUrl(v275PseudoImage(path)))}"></a>`).join('')}</div>`:'';
    panel.innerHTML=`
      <div class="edit-listing-summary">
        <div><strong>${esc(row.title||'Обява')}</strong><span>${esc(realListingStatusLabel(row.status))} · ${esc(v260Money(row.price))}</span></div>
        <a class="secondary-btn compact-action" href="listing.html?id=${encodeURIComponent(id)}">Преглед на обявата</a>
      </div>
      ${imageStrip}
      <div class="form-grid real-edit-grid">
        <div class="field"><label class="required-label" for="edit-category">Категория</label><select id="edit-category" data-ad-category data-category-control required aria-required="true">${categories.map(x=>`<option value="${esc(x)}"${x===fields.category?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label class="required-label" for="edit-brand">Марка</label><select id="edit-brand" data-ad-brand required aria-required="true">${commonBrands.map(x=>`<option value="${esc(x)}"${x===brandValue?' selected':''}>${esc(x)}</option>`).join('')}<option value="Друга"${brandValue==='Друга'?' selected':''}>Друга марка</option></select></div>
        <div class="field other-brand-field" data-other-brand-field hidden><label class="required-label" for="edit-other-brand">Друга марка</label><input id="edit-other-brand" data-other-brand-input data-char-counter data-max-chars="50" maxlength="50" minlength="2" autocomplete="off" value="${esc(isCommon?'':fields.brand)}" placeholder="Напр. Miele"></div>
        <div class="field"><label for="edit-model">Модел <span class="muted">(по желание)</span></label><input id="edit-model" data-char-counter data-max-chars="60" maxlength="60" value="${esc(fields.model)}"></div>
        <div class="field"><label class="required-label" for="edit-price">Цена (€)</label><input id="edit-price" type="number" min="0.01" max="1000000" step="0.01" inputmode="decimal" required value="${esc(row.price??'')}"></div>
        <div class="field"><label class="required-label" for="edit-condition">Състояние</label><select id="edit-condition" required>${conditionOptions.map(x=>`<option value="${esc(x)}"${x===fields.condition?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label class="required-label" for="edit-warranty">Гаранция</label><select id="edit-warranty" required>${warrantyOptions.map(x=>`<option value="${esc(x)}"${x===fields.warranty?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="edit-year">Година <span class="muted">(по желание)</span></label><input id="edit-year" type="number" inputmode="numeric" min="1900" max="${new Date().getFullYear()+1}" step="1" value="${esc(fields.year||'')}"></div>
        <div class="field full"><div class="edit-section-label">Характеристики</div><div class="form-grid edit-category-fields" data-category-fields></div></div>
        <div class="field full"><label class="required-label" for="edit-defects">Известни дефекти или забележки</label><textarea id="edit-defects" data-char-counter data-max-chars="1000" maxlength="1000" minlength="1" required>${esc(fields.defects||'Няма')}</textarea></div>
        <div class="field full"><label class="required-label" for="edit-description">Описание</label><textarea id="edit-description" data-char-counter data-max-chars="2000" maxlength="2000" minlength="20" required>${esc(fields.description)}</textarea></div>
        <div class="field"><label class="required-label" for="edit-city">Град</label><input id="edit-city" list="edit-bg-cities" data-char-counter data-max-chars="60" maxlength="60" minlength="2" required value="${esc(fields.city)}"><datalist id="edit-bg-cities"><option value="София"><option value="Пловдив"><option value="Варна"><option value="Бургас"><option value="Кюстендил"><option value="Благоевград"><option value="Перник"><option value="Дупница"><option value="Русе"><option value="Стара Загора"><option value="Плевен"><option value="Велико Търново"></datalist></div>
        <div class="field"><label class="required-label" for="edit-delivery">Доставка</label><select id="edit-delivery" required>${deliveryOptions.map(x=>`<option value="${esc(x)}"${x===fields.delivery?' selected':''}>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="edit-phone">Телефон <span class="muted">(по желание)</span></label><input id="edit-phone" inputmode="numeric" pattern="[0-9]*" data-digits-only data-char-counter data-max-chars="15" maxlength="15" value="${esc(fields.phone)}"></div>
        <div class="field"><label>Публичен контакт</label><label class="switch"><input id="edit-show-phone" type="checkbox"${fields.showPhone?' checked':''}><span>Показвай номера в тази обява</span></label></div>
      </div>
      <div class="edit-form-actions"><button class="primary-btn" data-real-edit-save type="button">Запази промените</button><a class="secondary-btn" href="my-ads.html">Отказ</a></div>
      <div class="success-callout" data-real-edit-status hidden></div>`;

    for(let i=0;i<30&&!window.UrediCategoryFields;i++)await sleep(50);
    try{window.UrediFormUX?.syncOtherBrand?.();window.UrediFormUX?.refreshCounters?.()}catch{}
    const categorySelect=qs('[data-ad-category]',panel);
    const fillSpecs=()=>{
      const specs=fields.specs||{};
      qsa('[data-category-fields] .category-spec-field',panel).forEach(field=>{
        const label=v260Clean(field.querySelector('label')?.textContent);
        const ctrl=field.querySelector('input,select,textarea');
        if(!ctrl||!label)return;
        let value=specs[label];
        if(value===undefined||value===null)return;
        value=String(value);
        const suffix=v260Clean(ctrl.dataset?.specSuffix);
        if(ctrl.type==='number'&&suffix)value=value.replace(new RegExp('\\s*'+suffix.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')+'\\s*$','i'),'');
        if(ctrl.tagName==='SELECT'){
          const opt=[...ctrl.options].find(o=>v260Norm(o.value||o.textContent)===v260Norm(value));
          if(opt)ctrl.value=opt.value;
        }else ctrl.value=value;
      });
      try{window.UrediFormUX?.refreshCounters?.()}catch{}
    };
    const editableCategory=categories.includes(fields.category)?fields.category:'';
    if(categorySelect&&editableCategory)categorySelect.value=editableCategory;
    if(window.UrediCategoryFields?.setValues&&editableCategory){
      window.UrediCategoryFields.setValues(editableCategory,fields.specs||{});
    }else if(window.UrediCategoryFields){
      window.UrediCategoryFields.render();
      fillSpecs();
    }
    // Some browsers/extensions can cause a late DOM refresh. Re-apply the persisted
    // values once more after the form settles, without overwriting later user edits.
    setTimeout(()=>{
      try{
        if(window.UrediCategoryFields?.setValues&&editableCategory){
          const host=qs('[data-category-fields]',panel);
          const hasUserInput=host&&qsa('input,select,textarea',host).some(ctrl=>v260Clean(ctrl.value));
          if(categorySelect&&!categorySelect.value)categorySelect.value=editableCategory;
          if(!hasUserInput)window.UrediCategoryFields.setValues(editableCategory,fields.specs||{});
        }else fillSpecs();
        window.UrediFormUX?.syncOtherBrand?.();
        window.UrediFormUX?.refreshCounters?.();
      }catch{}
    },150);
    categorySelect?.addEventListener('change',()=>setTimeout(()=>{try{window.UrediCategoryFields?.render?.()}catch{}},0));

    const save=qs('[data-real-edit-save]',panel),status=qs('[data-real-edit-status]',panel);
    save?.addEventListener('click',async()=>{
      const category=v260Clean(qs('[data-ad-category]',panel)?.value);
      const brandSel=qs('[data-ad-brand]',panel),brandRaw=v260Clean(brandSel?.value);
      const brand=brandRaw==='Друга'?v260Clean(qs('[data-other-brand-input]',panel)?.value):brandRaw;
      const model=v260Clean(qs('#edit-model',panel)?.value);
      const price=Number(qs('#edit-price',panel)?.value||0);
      const condition=v260Clean(qs('#edit-condition',panel)?.value);
      const warranty=v260Clean(qs('#edit-warranty',panel)?.value);
      const yearRaw=v260Clean(qs('#edit-year',panel)?.value),year=yearRaw?Number(yearRaw):null;
      const defects=v260Clean(qs('#edit-defects',panel)?.value);
      const description=v260Clean(qs('#edit-description',panel)?.value);
      const city=v260Clean(qs('#edit-city',panel)?.value);
      const delivery=v260Clean(qs('#edit-delivery',panel)?.value);
      const showPhone=!!qs('#edit-show-phone',panel)?.checked;
      const phone=showPhone?v260Clean(qs('#edit-phone',panel)?.value).replace(/\D+/g,''):'';
      const missing=qsa('[data-category-fields] [data-smart-required]',panel).find(x=>!v260Clean(x.value));
      if(!category){toast('Избери категория.');return}
      if(!brand){toast('Избери или въведи марка.');return}
      if(!(price>0)){toast('Въведи валидна цена.');return}
      if(!condition||!warranty){toast('Избери състояние и гаранция.');return}
      if(missing){toast('Попълни всички характеристики за избраната категория.');missing.focus();return}
      if(!defects){toast('Опиши дефектите или напиши „Няма“.');return}
      if(description.length<20){toast('Описанието трябва да е поне 20 символа.');return}
      if(city.length<2){toast('Въведи град.');return}
      if(!delivery){toast('Избери начин на доставка.');return}
      if(phone&&!/^\d{6,15}$/.test(phone)){toast('Телефонът може да съдържа само 6–15 цифри.');return}
      const newSpecs={};
      qsa('[data-category-fields] .category-spec-field',panel).forEach(field=>{
        const label=v260Clean(field.querySelector('label')?.textContent),ctrl=field.querySelector('input,select,textarea');
        let value=ctrl?.tagName==='SELECT'?v260SelectedText(ctrl):v260Clean(ctrl?.value);
        const suffix=v260Clean(ctrl?.dataset?.specSuffix);if(value&&suffix)value=`${value} ${suffix}`;
        if(label&&value)newSpecs[label]=value;
      });
      newSpecs['Състояние']=condition;
      let raw=v260Val(row,'specs','attributes','details')||{};if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch{raw={}}}
      const storedPaths=v275ImagePathsFromRow(row);if(storedPaths.length)newSpecs.__image_paths=storedPaths;
      if(raw&&typeof raw==='object'&&raw.__label_path)newSpecs.__label_path=raw.__label_path;
      const categorySlug=await v268ResolveCategorySlug(category);
      const resolvedCondition=await v262ResolveConditionValue(condition);
      const title=(brand+' '+(model||category)).replace(/\s+/g,' ').trim();
      const patch={title,category,category_slug:categorySlug,brand,model:model||null,price,condition:resolvedCondition,warranty,year,defects,description,city,delivery,phone:phone||null,show_phone:showPhone,specs:newSpecs,updated_at:v260NowIso()};
      busy(save,true,'Запазване…');
      try{
        await v260AdaptiveUpdateListing(id,patch);
        busy(save,false);
        if(status){status.hidden=false;status.innerHTML='<strong>Промените са запазени.</strong> Публичната обява вече е обновена.';status.scrollIntoView({behavior:'smooth',block:'nearest'})}
        toast('Промените са запазени.');
      }catch(err){busy(save,false);toast(humanizeError(err))}
    });
  }


  // v2.81: unread badge counts conversations, not individual messages.
  let realChatBadgeChannel=null;
  let realChatBadgeUserId=null;

  const paintRealChatBadge=(count)=>{
    const n=Math.max(0,Number(count)||0);
    qsa('[data-chat-badge]').forEach(b=>{
      if(n>0){
        b.textContent=n>99?'99+':String(n);
        b.classList.add('has-unread');
        b.setAttribute('aria-hidden','false');
      }else{
        b.textContent='';
        b.classList.remove('has-unread');
        b.setAttribute('aria-hidden','true');
      }
    });
    const header=qs('.header-actions a[href^="messages.html"]');
    if(header){
      let badge=qs('[data-real-chat-header-badge]',header);
      if(!badge){
        badge=document.createElement('span');
        badge.className='header-chat-badge';
        badge.dataset.realChatHeaderBadge='';
        badge.setAttribute('aria-hidden','true');
        header.appendChild(badge);
      }
      if(n>0){
        badge.textContent=n>99?'99+':String(n);
        badge.classList.add('has-unread');
        badge.setAttribute('aria-hidden','false');
        header.setAttribute('aria-label',`Съобщения, ${n} непрочетени разговора`);
      }else{
        badge.textContent='';
        badge.classList.remove('has-unread');
        badge.setAttribute('aria-hidden','true');
        header.setAttribute('aria-label','Съобщения');
      }
    }
  };

  async function refreshRealChatBadge(){
    try{
      let userId=realChatBadgeUserId;
      if(!userId){
        const session=await getSession();
        userId=session?.user?.id||null;
        realChatBadgeUserId=userId;
      }
      if(!userId){paintRealChatBadge(0);return}
      const {data,error}=await client
        .from('market_conversations')
        .select('id,seller_id,buyer_id,seller_unread,buyer_unread');
      if(error){
        if(!/market_conversations|schema cache/i.test(String(error.message||'')))console.warn(error);
        return;
      }
      const unreadChats=(data||[]).filter(c=>{
        const n=c.seller_id===userId?Number(c.seller_unread||0):c.buyer_id===userId?Number(c.buyer_unread||0):0;
        return n>0;
      }).length;
      paintRealChatBadge(unreadChats);
    }catch(err){console.warn('Chat badge refresh failed',err)}
  }
  window.UrediChatBadgeRefresh=refreshRealChatBadge;


  async function initRealChatBadge(session){
    realChatBadgeUserId=session?.user?.id||null;
    if(!realChatBadgeUserId){paintRealChatBadge(0);return}
    await refreshRealChatBadge();
    try{
      if(realChatBadgeChannel)await client.removeChannel(realChatBadgeChannel);
      realChatBadgeChannel=client.channel(`uredi-chat-badge-${realChatBadgeUserId}`)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'market_messages'},async()=>{
          await refreshRealChatBadge();
              })
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'market_messages'},async()=>{
          await refreshRealChatBadge();
              })
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'market_conversations'},async()=>{
          await refreshRealChatBadge();
              })
        .subscribe();
    }catch(err){console.warn('Chat badge realtime unavailable',err)}
  }



  // v2.88: real price history for live Supabase listings.
  const v288PriceHistoryCache=new Map();

  function v288PriceHistoryDate(value){
    const d=new Date(value||Date.now());
    if(Number.isNaN(d.getTime()))return '';
    return [String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('.');
  }

  function v288PriceHistoryText(value){
    const n=Number(value);
    if(!Number.isFinite(n)||n<=0)return '';
    return `${Number.isInteger(n)?n:n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')} €`;
  }

  function v288CompactPriceRows(rows,currentPrice){
    const out=[];
    (rows||[]).slice().sort((a,b)=>new Date(a.changed_at||0)-new Date(b.changed_at||0)).forEach(row=>{
      const price=Number(row.price);
      if(!Number.isFinite(price)||price<=0)return;
      const last=out[out.length-1];
      if(last&&Math.abs(last.price-price)<0.001){
        // Keep the newest timestamp for consecutive identical snapshots.
        last.changed_at=row.changed_at||last.changed_at;
      }else out.push({price,changed_at:row.changed_at});
    });
    const current=Number(currentPrice);
    if(Number.isFinite(current)&&current>0){
      const last=out[out.length-1];
      if(!last||Math.abs(last.price-current)>0.001)out.push({price:current,changed_at:new Date().toISOString()});
    }
    return out;
  }

  function v288CurrentPriceForNode(node){
    const raw=node?.dataset?.price;
    const direct=Number(raw);
    if(Number.isFinite(direct)&&direct>0)return direct;
    const txt=node?.querySelector?.('.detail-price,.price')?.textContent||'';
    const parsed=parseFloat(String(txt).replace(/[^\d.,]/g,'').replace(',','.'));
    return Number.isFinite(parsed)?parsed:0;
  }

  function v288ApplyPriceHistory(node,rows){
    if(!node)return;
    const priceEl=node.querySelector('.detail-price,.price');
    if(!priceEl)return;
    const current=v288CurrentPriceForNode(node);
    const history=v288CompactPriceRows(rows,current);
    let wrap=priceEl.closest('.price-with-trend');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className=priceEl.classList.contains('detail-price')?'price-with-trend detail-price-with-trend':'price-with-trend';
      priceEl.parentNode.insertBefore(wrap,priceEl);
      wrap.appendChild(priceEl);
    }
    let btn=wrap.querySelector('[data-real-price-history]');
    if(history.length<2){if(btn)btn.remove();return}
    const prev=history[history.length-2].price,currentRow=history[history.length-1].price;
    if(Math.abs(prev-currentRow)<0.001){if(btn)btn.remove();return}
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='price-trend';
      btn.dataset.realPriceHistory='';
      btn.dataset.priceHistory='';
      btn.setAttribute('title','История на цената');
      wrap.appendChild(btn);
    }
    const direction=currentRow<prev?'down':'up';
    btn.hidden=false;
    btn.classList.remove('price-trend-down','price-trend-up');
    btn.classList.add(direction==='down'?'price-trend-down':'price-trend-up');
    btn.dataset.priceTrend=direction;
    btn.dataset.currentPrice=v288PriceHistoryText(currentRow);
    btn.dataset.currentPriceDate=v288PriceHistoryDate(history[history.length-1].changed_at);
    btn.dataset.priceHistory=history.map(x=>`${v288PriceHistoryText(x.price)}|${v288PriceHistoryDate(x.changed_at)}`).join(';');
    const label=direction==='down'?'Цената е намалена. Виж историята на цената.':'Цената е повишена. Виж историята на цената.';
    btn.setAttribute('aria-label',label);
    btn.title=(direction==='down'?'Цената е намалена':'Цената е повишена')+' · История на цената';
  }

  async function v288HydratePriceHistory(root=document){
    const nodes=[];
    if(root?.matches?.('[data-listing-id]'))nodes.push(root);
    qsa('[data-listing-id]',root||document).forEach(x=>nodes.push(x));
    if(document.body?.dataset?.listingId&&!nodes.some(x=>String(x.dataset.listingId||'')===String(document.body.dataset.listingId))){
      const detail=(root||document).querySelector?.('.real-listing-detail');
      if(detail){detail.dataset.listingId=document.body.dataset.listingId;nodes.push(detail)}
    }
    const uniq=[...new Map(nodes.map(x=>[String(x.dataset.listingId||''),x])).entries()].filter(([id])=>v284Uuid(id));
    if(!uniq.length)return;
    const missing=uniq.map(([id])=>id).filter(id=>!v288PriceHistoryCache.has(id));
    if(missing.length){
      const {data,error}=await client.from('market_listing_price_history').select('listing_id,price,changed_at').in('listing_id',missing).order('changed_at',{ascending:true});
      if(error){
        if(!/market_listing_price_history|schema cache/i.test(String(error.message||'')))console.warn('Price history:',error);
        return;
      }
      missing.forEach(id=>v288PriceHistoryCache.set(id,[]));
      (data||[]).forEach(row=>{
        const id=String(row.listing_id||'');
        if(!v288PriceHistoryCache.has(id))v288PriceHistoryCache.set(id,[]);
        v288PriceHistoryCache.get(id).push(row);
      });
    }
    uniq.forEach(([id,node])=>v288ApplyPriceHistory(node,v288PriceHistoryCache.get(id)||[]));
  }
  window.UrediPriceHistoryRefresh=async(listingId)=>{
    if(listingId)v288PriceHistoryCache.delete(String(listingId));else v288PriceHistoryCache.clear();
    await v288HydratePriceHistory(document);
  };



  // v2.84: real account-synced Favorites + marketplace notifications.
  let realFavoriteUserId=null;
  let realFavoriteSession=null;
  let realFavoriteIds=new Set();
  let realFavoriteBusy=new Set();
  let realFavoriteObserver=null;
  let realFavoriteChannel=null;
  let realNotificationUserId=null;
  let realNotificationChannel=null;

  const v284Uuid=(value)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||''));

  function v284PaintFavoriteButtons(root=document){
    qsa('[data-favorite]',root).forEach(btn=>{
      const id=String(btn.dataset.favorite||'');
      if(!v284Uuid(id))return;
      const on=realFavoriteIds.has(id);
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-pressed',on?'true':'false');
      btn.setAttribute('aria-label',on?'Премахни от любими':'Добави в любими');
      if(!btn.classList.contains('fav-float') && !btn.querySelector('svg')){
        const label=on?'Запазена':'Запази обявата';
        if(btn.textContent!==label)btn.textContent=label;
      }
    });
  }

  async function v284RefreshFavoriteIds(){
    if(!realFavoriteUserId){
      let local=[];
      try{local=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{}
      realFavoriteIds=new Set((Array.isArray(local)?local:[]).filter(v284Uuid));
      v284PaintFavoriteButtons();
      return realFavoriteIds;
    }
    const {data,error}=await client.from('market_favorites').select('listing_id').eq('user_id',realFavoriteUserId);
    if(error){
      if(!/market_favorites|schema cache/i.test(String(error.message||'')))console.warn('Favorites refresh:',error);
      return realFavoriteIds;
    }
    realFavoriteIds=new Set((data||[]).map(x=>String(x.listing_id)).filter(Boolean));
    v284PaintFavoriteButtons();
    return realFavoriteIds;
  }

  async function v284MigrateLocalFavorites(){
    if(!realFavoriteUserId)return;
    let local=[];
    try{local=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{}
    if(!Array.isArray(local)||!local.length)return;
    const realIds=[...new Set(local.filter(v284Uuid))];
    if(!realIds.length)return;
    const migrated=[];
    for(const id of realIds){
      try{
        const {error}=await client.rpc('market_set_favorite',{p_listing_id:id,p_favorite:true});
        if(!error)migrated.push(id);
      }catch{}
    }
    if(migrated.length){
      const keep=local.filter(x=>!migrated.includes(x));
      localStorage.setItem('favorites',JSON.stringify(keep));
    }
  }

  async function v284ToggleFavorite(id){
    id=String(id||'');
    if(!v284Uuid(id)||realFavoriteBusy.has(id))return;
    if(!realFavoriteUserId){
      let arr=[];try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{}
      arr=Array.isArray(arr)?arr:[];
      const on=arr.includes(id);
      arr=on?arr.filter(x=>x!==id):[...arr,id];
      localStorage.setItem('favorites',JSON.stringify(arr));
      realFavoriteIds=new Set(arr.filter(v284Uuid));
      v284PaintFavoriteButtons();
      toast(on?'Премахнато от любими.':'Добавено в любими. Влез в профила си, за да се синхронизира между устройствата.');
      if(file()==='favorites.html')await v284RenderFavoritesPage(realFavoriteSession);
      return;
    }
    realFavoriteBusy.add(id);
    const shouldAdd=!realFavoriteIds.has(id);
    try{
      const {data,error}=await client.rpc('market_set_favorite',{p_listing_id:id,p_favorite:shouldAdd});
      if(error)throw error;
      // Trust the state returned by the backend, then refresh from the table.
      const saved=typeof data==='boolean'?data:shouldAdd;
      if(saved)realFavoriteIds.add(id);else realFavoriteIds.delete(id);
      v284PaintFavoriteButtons();
      await v284RefreshFavoriteIds();
      toast(saved?'Добавено в любими.':'Премахнато от любими.');
      if(file()==='favorites.html')await v284RenderFavoritesPage(realFavoriteSession);
    }catch(err){
      const raw=String(err?.message||err||'');
      if(/CANNOT_FAVORITE_OWN/i.test(raw))toast('Не е необходимо да добавяш собствената си обява в Любими.');
      else if(/LISTING_NOT_AVAILABLE/i.test(raw))toast('Тази обява вече не е активна.');
      else toast(humanizeError(err));
    }finally{realFavoriteBusy.delete(id)}
  }

  // v2.86: one favorite handler for both guests and signed-in users.
  // Capture every real listing favorite click before legacy localStorage handlers,
  // otherwise some pages can toggle the same favorite twice and end up unchanged.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-favorite]');
    if(!btn)return;
    const id=btn.dataset.favorite;
    if(!v284Uuid(id))return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    v284ToggleFavorite(id);
  },true);

  function v284FavoriteStatus(status){
    const s=String(status||'').toLowerCase();
    const map={active:['Активна','active'],reserved:['Резервирана','reserved'],sold:['Продадена','sold'],expired:['Изтекла','expired'],paused:['Свалена','inactive'],inactive:['Свалена','inactive'],hidden:['Свалена','inactive'],draft:['Чернова','inactive'],rejected:['Спряна','inactive'],blocked:['Спряна','inactive']};
    return map[s]||[s?('Статус: '+s):'Недостъпна','inactive'];
  }

  function v284FavoriteCard(row,img,profile,promo){
    const f=v260ListingFields(row),dealer=profile?.profile_type==='dealer',seller=profile?.display_name||'Продавач';
    const [statusLabel,statusClass]=v284FavoriteStatus(row.status);
    const active=String(row.status||'').toLowerCase()==='active';
    const state=v260ActivePromo(promo);
    const tier=state?.kind==='vip'?'VIP':state?.kind==='top'?'TOP':'';
    const badge=tier?`<span class="promo-badge badge ${tier==='VIP'?'badge-vip':'badge-top'}">${tier}</span>`:'';
    const spec=v260SpecSummary(f);
    return `<article class="product-card real-favorite-card${active?'':' favorite-card-unavailable'}" data-listing-id="${esc(row.id)}" data-price="${Number(row.price||0)}">
      ${badge}${!active?`<span class="favorite-status-pill ${esc(statusClass)}">${esc(statusLabel)}</span>`:''}
      <button aria-label="Премахни от любими" aria-pressed="true" class="fav-float active" data-favorite="${esc(row.id)}"><span class="ico"><svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></span></button>
      <a href="listing.html?id=${encodeURIComponent(row.id)}"><img alt="${esc(row.title||'Обява')}" class="product-img" decoding="async" loading="lazy" src="${esc(v260PublicImageUrl(img))}"/></a>
      <div class="card-body"><a href="listing.html?id=${encodeURIComponent(row.id)}"><div class="product-category-label">${esc(f.category)}</div><h3 class="product-title">${esc(row.title||'Обява')}</h3>${spec?`<div class="product-specs">${esc(spec)}</div>`:''}</a>
      <div class="product-meta"><div class="price">${esc(v260Money(row.price))}</div><span class="location">${esc(f.city||'България')}</span></div>
      <div class="seller-line"><span class="seller-name">${esc(seller)}</span>${dealer?'<span class="badge badge-seller-type">Търговец</span>':''}</div></div>
    </article>`;
  }

  async function v284RenderFavoritesPage(session=realFavoriteSession){
    if(file()!=='favorites.html')return;
    const section=qs('[data-favorites-section]'),grid=qs('[data-real-favorites-grid]')||qs('.product-grid',section||document),empty=qs('[data-empty-template]');
    if(!section||!grid)return;
    // v2.87: the legacy guest-favorites renderer may leave an inline display:none
    // before Supabase finishes loading. Always take ownership of visibility here.
    const showSection=()=>{section.hidden=false;section.style.removeProperty('display')};
    const hideSection=()=>{section.hidden=true;section.style.display='none'};
    const showEmpty=()=>{if(empty){empty.hidden=false;empty.style.display='block'}};
    const hideEmpty=()=>{if(empty){empty.hidden=true;empty.style.display='none'}};
    const syncNote=qs('[data-favorites-sync-note]');
    if(syncNote){
      syncNote.hidden=!!session;
      syncNote.innerHTML=session?'':'<strong>Гост режим.</strong> Влез в профила си, за да пазиш любимите си на всички устройства.';
    }
    let favoriteRows=[];
    if(session?.user?.id){
      const {data,error}=await client.from('market_favorites').select('listing_id,created_at').eq('user_id',session.user.id).order('created_at',{ascending:false});
      if(error){console.warn('Favorite page:',error);showSection();hideEmpty();grid.innerHTML='<div class="real-listings-error"><strong>Не успяхме да заредим Любими.</strong><span>Обнови страницата след малко.</span></div>';return}
      favoriteRows=data||[];
    }else{
      let arr=[];try{arr=JSON.parse(localStorage.getItem('favorites')||'[]')}catch{}
      favoriteRows=(Array.isArray(arr)?arr:[]).filter(v284Uuid).map((listing_id,i)=>({listing_id,created_at:new Date(Date.now()-i).toISOString()}));
    }
    const ids=favoriteRows.map(x=>x.listing_id).filter(Boolean);
    if(!ids.length){grid.innerHTML='';hideSection();showEmpty();return}
    showSection();hideEmpty();
    const {data:listings,error}=await client.from('listings').select('*').in('id',ids);
    if(error){console.warn('Favorite listings:',error);showSection();hideEmpty();grid.innerHTML='<div class="real-listings-error"><strong>Не успяхме да заредим Любими.</strong><span>Обнови страницата след малко.</span></div>';return}
    const rowMap=new Map((listings||[]).map(x=>[String(x.id),x]));
    const rows=favoriteRows.map(f=>rowMap.get(String(f.listing_id))).filter(Boolean);
    if(!rows.length){grid.innerHTML='';hideSection();showEmpty();return}
    const sellerIds=[...new Set(rows.map(x=>x.seller_id).filter(Boolean))];
    const [imagesRes,promosRes,profilesRes]=await Promise.all([
      client.from('listing_images').select('*').in('listing_id',rows.map(x=>x.id)),
      client.from('listing_promotion_state').select('listing_id,kind,expires_at,bumped_at,started_at,updated_at').in('listing_id',rows.map(x=>x.id)),
      sellerIds.length?client.from('profiles').select('id,display_name,profile_type,city').in('id',sellerIds):Promise.resolve({data:[],error:null})
    ]);
    const firstImage=new Map();(imagesRes.data||[]).sort(v260ImageSort).forEach(img=>{if(!firstImage.has(img.listing_id))firstImage.set(img.listing_id,img)});
    rows.forEach(row=>{const path=v275ImagePathsFromRow(row)[0];if(path)firstImage.set(row.id,v275PseudoImage(path))});
    const promoMap=new Map((promosRes.data||[]).map(x=>[x.listing_id,x]));
    const profileMap=new Map((profilesRes.data||[]).map(x=>[x.id,x]));
    grid.innerHTML=rows.map(row=>v284FavoriteCard(row,firstImage.get(row.id),profileMap.get(row.seller_id),promoMap.get(row.id))).join('');
    showSection();hideEmpty();
    v284PaintFavoriteButtons(grid);
    await v288HydratePriceHistory(grid);
  }

  async function initRealFavorites(session){
    realFavoriteSession=session||null;
    realFavoriteUserId=session?.user?.id||null;
    if(realFavoriteUserId)await v284MigrateLocalFavorites();
    await v284RefreshFavoriteIds();
    await v284RenderFavoritesPage(session);
    if(realFavoriteObserver)realFavoriteObserver.disconnect();
    realFavoriteObserver=new MutationObserver(()=>v284PaintFavoriteButtons());
    realFavoriteObserver.observe(document.body,{childList:true,subtree:true});
    if(realFavoriteUserId){
      try{
        if(realFavoriteChannel)await client.removeChannel(realFavoriteChannel);
        realFavoriteChannel=client.channel(`uredi-favorites-${realFavoriteUserId}`)
          .on('postgres_changes',{event:'*',schema:'public',table:'market_favorites',filter:`user_id=eq.${realFavoriteUserId}`},async()=>{await v284RefreshFavoriteIds();if(file()==='favorites.html')await v284RenderFavoritesPage(realFavoriteSession)})
          .subscribe();
      }catch(err){console.warn('Favorites realtime unavailable',err)}
    }
  }

  function v284NotificationIcon(kind,type){
    if(kind==='price-drop')return '↓';
    if(kind==='favorite-sold')return '✓';
    if(kind==='favorite-reserved')return '⏳';
    if(kind==='favorite-active')return '↻';
    if(kind==='favorite-deleted')return '×';
    if(type==='ads')return '▣';
    return '•';
  }

  function v284NotificationTime(value){
    const d=new Date(value||Date.now());
    if(Number.isNaN(d.getTime()))return '';
    return d.toLocaleString('bg-BG',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  function v284PaintNotificationBadge(count){
    const n=Math.max(0,Number(count)||0);
    qsa('.header-actions a[href^="notifications.html"], .mobile-notifications[href^="notifications.html"]').forEach(link=>{
      let badge=qs('[data-real-notification-badge]',link);
      if(!badge){
        badge=document.createElement('span');
        badge.className='header-notification-badge';
        badge.dataset.realNotificationBadge='';
        badge.setAttribute('aria-hidden','true');
        link.appendChild(badge);
      }
      if(n>0){badge.textContent=n>99?'99+':String(n);badge.classList.add('has-unread');badge.setAttribute('aria-hidden','false');link.setAttribute('aria-label',`Известия, ${n} непрочетени`)}
      else{badge.textContent='';badge.classList.remove('has-unread');badge.setAttribute('aria-hidden','true');link.setAttribute('aria-label','Известия')}
    });
  }

  async function v284RefreshNotificationBadge(){
    if(!realNotificationUserId){v284PaintNotificationBadge(0);return 0}
    const {count,error}=await client.from('market_notifications').select('id',{count:'exact',head:true}).eq('user_id',realNotificationUserId).is('read_at',null);
    if(error){if(!/market_notifications|schema cache/i.test(String(error.message||'')))console.warn('Notification badge:',error);return 0}
    v284PaintNotificationBadge(count||0);return count||0;
  }
  window.UrediNotificationBadgeRefresh=v284RefreshNotificationBadge;

  async function v284MarkNotificationRead(id){
    if(!realNotificationUserId||!id)return;
    const {error}=await client.from('market_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',realNotificationUserId).is('read_at',null);
    if(error)console.warn('Notification read:',error);
    await v284RefreshNotificationBadge();
  }

  async function v284RenderNotificationsPage(){
    if(file()!=='notifications.html'||!realNotificationUserId)return;
    const box=qs('[data-notification-list]'),empty=qs('[data-notifications-empty]');if(!box)return;
    const {data,error}=await client.from('market_notifications').select('id,type,kind,title,body,href,listing_id,read_at,created_at').eq('user_id',realNotificationUserId).order('created_at',{ascending:false}).limit(100);
    if(error){console.warn('Notifications page:',error);return}
    box.querySelectorAll('.notification-item,.notice').forEach(x=>x.remove());
    const rows=data||[];
    if(empty)empty.hidden=rows.length>0;
    rows.forEach(n=>{
      const item=document.createElement('article');
      item.className='notification-item real-notification-item '+(n.kind==='price-drop'?'notification-price-drop ':'')+(n.read_at?'':'is-unread');
      item.dataset.notificationType=n.type||'system';item.dataset.marketNotificationId=n.id;
      if(n.href)item.dataset.marketNotificationHref=n.href;
      item.tabIndex=0;item.setAttribute('role',n.href?'link':'button');
      item.innerHTML=`<div class="notification-icon">${esc(v284NotificationIcon(n.kind,n.type))}</div><div class="notification-copy"><strong>${esc(n.title||'Известие')}</strong><p>${esc(n.body||'')}</p><small>${esc(v284NotificationTime(n.created_at))}</small></div>${n.href?'<span class="mini-btn notification-open-hint">Виж</span>':''}`;
      box.appendChild(item);
    });
    const active=qs('[data-notification-filter].active')?.dataset.notificationFilter||'all';
    qsa('.real-notification-item',box).forEach(x=>x.hidden=active!=='all'&&x.dataset.notificationType!==active);
  }

  async function v284OpenNotification(item){
    if(!item)return;
    const id=item.dataset.marketNotificationId,href=item.dataset.marketNotificationHref||'';
    if(item.classList.contains('is-unread')){
      await v284MarkNotificationRead(id);
      item.classList.remove('is-unread');
    }
    if(href)location.href=href;
  }

  document.addEventListener('click',e=>{
    const all=e.target.closest?.('[data-real-notifications-read-all]');
    if(all&&realNotificationUserId){
      e.preventDefault();e.stopImmediatePropagation();
      (async()=>{
        busy(all,true,'Маркиране…');
        const {error}=await client.from('market_notifications').update({read_at:new Date().toISOString()}).eq('user_id',realNotificationUserId).is('read_at',null);
        busy(all,false);
        if(error){toast(humanizeError(error));return}
        await v284RefreshNotificationBadge();await v284RenderNotificationsPage();toast('Всички известия са маркирани като прочетени.');
      })();
      return;
    }
    const filter=e.target.closest?.('[data-notification-filter]');
    if(filter&&file()==='notifications.html'){
      qsa('[data-notification-filter]').forEach(x=>{const on=x===filter;x.classList.toggle('active',on);x.setAttribute('aria-selected',on?'true':'false')});
      const type=filter.dataset.notificationFilter||'all';
      qsa('.real-notification-item').forEach(x=>x.hidden=type!=='all'&&x.dataset.notificationType!==type);
      return;
    }
    const item=e.target.closest?.('[data-market-notification-id]');
    if(item&&file()==='notifications.html'){
      e.preventDefault();v284OpenNotification(item);
    }
  },true);
  document.addEventListener('keydown',e=>{
    const item=e.target.closest?.('[data-market-notification-id]');if(!item)return;
    if(e.key==='Enter'||e.key===' '){e.preventDefault();v284OpenNotification(item)}
  });

  async function initRealMarketplaceNotifications(session){
    realNotificationUserId=session?.user?.id||null;
    if(!realNotificationUserId){v284PaintNotificationBadge(0);return}
    await v284RefreshNotificationBadge();
    await v284RenderNotificationsPage();
    try{
      if(realNotificationChannel)await client.removeChannel(realNotificationChannel);
      realNotificationChannel=client.channel(`uredi-market-notifications-${realNotificationUserId}`)
        .on('postgres_changes',{event:'*',schema:'public',table:'market_notifications',filter:`user_id=eq.${realNotificationUserId}`},async()=>{await v284RefreshNotificationBadge();await v284RenderNotificationsPage()})
        .subscribe();
    }catch(err){console.warn('Notification realtime unavailable',err)}
    window.addEventListener('focus',()=>{v284RefreshNotificationBadge();if(file()==='notifications.html')v284RenderNotificationsPage()});
  }

  function v287SyncBetaCampaignVisibility(session){
    const signedIn=!!session?.user?.id;
    qsa('[data-beta-public-campaign]').forEach(section=>{
      section.hidden=signedIn;
      if(signedIn)section.style.display='none';
      else section.style.removeProperty('display');
    });
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

  async function initAdminAccess(session){
    if(file()!=='admin-access.html'||!session)return;
    const requested=new URLSearchParams(location.search).get('next');
    const destination=['admin/index.html','admin/audit.html','admin/settings.html','admin/health.html','admin/categories.html','admin/brands.html','admin/sold-archive.html','admin/users.html','admin/ads.html','admin/moderation.html','admin/reports.html','admin/blocked-profiles.html','admin/promotions-prepare.html'].includes(requested)?requested:'admin/promotions-prepare.html';
    const status=qs('[data-admin-status]'),button=qs('[data-admin-verify]');
    const access=await client.rpc('is_my_admin_account');
    if(access.error||access.data!==true){status.textContent='Този профил няма администраторски достъп.';return}
    const {data:aal,error}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(error){status.textContent='Не успяхме да проверим достъпа. Презареди страницата.';return}
    if(aal?.currentLevel==='aal2'){location.replace(destination);return}
    const {data:factors,error:fError}=await client.auth.mfa.listFactors();
    if(fError){status.textContent='Не успяхме да заредим защитата. Презареди страницата.';return}
    const enrolled=(factors?.totp||[]).some(f=>f.status==='verified');
    status.textContent=enrolled?'Потвърди администраторския вход.':'Настрой допълнителната защита веднъж за администраторския си профил. Потребителите на сайта не минават през тази стъпка.';
    button.textContent=enrolled?'Потвърди входа':'Настрой администраторската защита';button.hidden=false;
    button.onclick=async()=>{
      busy(button,true);
      try{
        if(enrolled){await ensureMfaIfEnrolled();location.replace(destination)}
        else await startMfaEnrollment();
      }catch(err){if(err.message!=='MFA_CANCELLED')toast(humanizeError(err))}
      finally{busy(button,false)}
    };
  }

  async function initRealReportV294(session){
    if(file()!=='report.html')return;
    const button=qs('[data-submit-report]'),feedback=qs('[data-report-feedback]');
    if(!button||!feedback)return;
    const show=(message,ok=false)=>{feedback.hidden=false;feedback.className='moderation-feedback '+(ok?'ok':'error');feedback.textContent=message};
    if(!session?.user?.id){show('Влез в профила си, за да изпратиш сигнал.');return}
    const params=new URLSearchParams(location.search);
    const candidates=[['listing','p_listing_id'],['user','p_reported_user_id'],['conversation','p_conversation_id'],['message','p_message_id'],['review','p_review_id']].filter(([key])=>params.get(key));
    if(candidates.length!==1||!v284Uuid(params.get(candidates[0]?.[0]))){show('Не е избрана валидна обява или профил. Отвори „Докладвай“ от съответната страница.');return}
    const [key,param]=candidates[0],id=params.get(key);
    const errors={
      'Cannot report own listing':'Не можеш да докладваш собствената си обява.',
      'Cannot report yourself':'Не можеш да докладваш собствения си профил.',
      'Too many reports. Please try again later.':'Достигна лимита за сигнали. Опитай по-късно.',
      'Listing not found':'Обявата вече не е налична.',
      'Authentication required':'Влез отново в профила си, за да изпратиш сигнала.',
      'Conversation not accessible':'Нямаш достъп до този разговор.',
      'Message cannot be reported':'Това съобщение не може да бъде докладвано.',
      'Review cannot be reported':'Този отзив не може да бъде докладван.'
    };
    if(key==='listing'){
      const r=await client.from('listings').select('id,seller_id,title').eq('id',id).single();
      if(r.error||!r.data){show('Не успяхме да заредим обявата. Презареди страницата и опитай отново.');return}
      if(r.data.seller_id===session.user.id){show(errors['Cannot report own listing']);return}
      const heading=qs('.report-kicker');if(heading)heading.textContent='Сигнал за: '+r.data.title;
    }
    button.disabled=false;
    let submitting=false,submitted=false;
    button.addEventListener('click',async e=>{
      e.preventDefault();if(submitting||submitted)return;
      const reason=qs('input[name="reason"]:checked')?.value;
      if(!['fraud','wrong_category','prohibited_content','duplicate','misleading','other'].includes(reason)){show('Избери причина за сигнала.');return}
      const details=qs('.report-card textarea')?.value.trim()||'';
      if(details.length>1000){show('Описанието може да е до 1000 символа.');return}
      submitting=true;busy(button,true,'Изпращане…');feedback.hidden=true;
      try{
        const {data,error}=await client.rpc('submit_report',{p_reason:reason,p_details:details||null,[param]:id});
        if(error)throw error;
        if(!v284Uuid(data))throw new Error('Missing report confirmation');
        submitted=true;show('Сигналът е записан и е изпратен за преглед. Благодарим.',true);
        qsa('.report-card input,.report-card textarea').forEach(el=>el.disabled=true);
        button.textContent='Сигналът е изпратен';
      }catch(err){show(errors[err?.message]||'Не получихме потвърждение за сигнала. Провери връзката и опитай отново.');}
      finally{submitting=false;if(!submitted)busy(button,false);else button.disabled=true}
    });
  }

  const v297Uuid=id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id||''));
  function v297RememberListing(id){
    if(!v297Uuid(id))return;
    try{const ids=JSON.parse(localStorage.getItem('marketRecentIdsV297')||'[]');localStorage.setItem('marketRecentIdsV297',JSON.stringify([id,...(Array.isArray(ids)?ids:[]).filter(x=>x!==id&&v297Uuid(x))].slice(0,20)))}catch{}
  }
  async function v297Cards(rows){
    if(!rows.length)return '';
    const ids=rows.map(x=>x.id),sellers=[...new Set(rows.map(x=>x.seller_id).filter(Boolean))];
    const [images,profiles]=await Promise.all([client.from('listing_images').select('*').in('listing_id',ids),sellers.length?client.from('profiles').select('id,display_name,profile_type,city').in('id',sellers):Promise.resolve({data:[]})]);
    const first=new Map();(images.data||[]).sort(v260ImageSort).forEach(i=>{if(!first.has(i.listing_id))first.set(i.listing_id,i)});
    const people=new Map((profiles.data||[]).map(p=>[p.id,p]));
    return rows.map(row=>v276HomeFeaturedCard(row,v275ImagePathsFromRow(row)[0]?v275PseudoImage(v275ImagePathsFromRow(row)[0]):first.get(row.id),people.get(row.seller_id),null)).join('');
  }
  async function initRealHomeV297(){
    if(file()!=='index.html')return;
    const latest=qs('[data-real-latest-grid]');
    if(latest){try{const r=await client.from('listings').select('*').eq('status','active').order('created_at',{ascending:false}).limit(8);if(r.error)throw r.error;latest.innerHTML=r.data?.length?await v297Cards(r.data):'<p>Все още няма активни обяви.</p>';await v288HydratePriceHistory(latest)}catch(e){latest.innerHTML='<p>Не успяхме да заредим обявите. Обнови страницата.</p>';console.warn(e)}}
    const section=qs('[data-recent-section]'),grid=qs('[data-recent-grid]');if(!section||!grid)return;
    section.style.display='none';
    try{let ids=JSON.parse(localStorage.getItem('marketRecentIdsV297')||'[]');ids=(Array.isArray(ids)?ids:[]).filter(v297Uuid).slice(0,20);if(!ids.length)return;
    const r=await client.from('listings').select('*').in('id',ids).eq('status','active');if(r.error)throw r.error;
    const rows=(r.data||[]).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)).slice(0,4);if(!rows.length)return;
    grid.innerHTML=await v297Cards(rows);section.style.display='';await v288HydratePriceHistory(grid);
    }catch(e){console.warn('Recently viewed:',e)}
  }
  async function initRealSellerV297(){
    if(file()!=='seller.html')return;
    const main=qs('#main-content'),id=new URLSearchParams(location.search).get('id');if(!main)return;
    const unavailable=()=>{main.innerHTML='<div class="container"><div class="empty-state"><h1>Профилът не е наличен</h1><a href="listings.html">Към обявите</a></div></div>'};
    if(!v297Uuid(id)){unavailable();return}
    const r=await client.from('profiles').select('id,display_name,profile_type,city,account_status').eq('id',id).maybeSingle();
    if(r.error){main.innerHTML='<div class="container"><p>Не успяхме да заредим профила. Обнови страницата.</p></div>';return}
    if(!r.data||['banned','suspended'].includes(r.data.account_status)){unavailable();return}
    const p=r.data;
    let company='';
    if(p.profile_type==='dealer'){
      const d=await client.from('dealer_profiles').select('company_name,eik,company_city').eq('user_id',id).maybeSingle();
      if(d.error)company='<p>Не успяхме да заредим фирмените данни.</p>';
      else if(d.data)company=`<h2>Фирмени данни</h2><p>${esc(d.data.company_name||'')}<br>ЕИК / Булстат: ${esc(d.data.eik||'Не е посочен')}<br>${esc(d.data.company_city||'')}</p>`;
    }
    main.innerHTML=`<div class="container"><section class="seller-card"><h1>${esc(p.display_name||'Продавач')}</h1><p>${p.profile_type==='dealer'?'Търговец':'Частно лице'}${p.city?' · '+esc(p.city):''}</p>${company}<p>За контакт използвай бутона за съобщение или телефона в конкретната обява.</p><a class="secondary-btn" href="listings.html">Към обявите</a></section></div>`;
  }

  // Real comparison: identifiers only in this browser; all displayed data comes from the database.
  const compareKeyV299='marketCompareIdsV299';
  let compareBusyV299=false,compareTimerV299;
  function compareIdsV299(){try{const a=JSON.parse(localStorage.getItem(compareKeyV299)||'[]');return [...new Set(Array.isArray(a)?a:[])].filter(v297Uuid).slice(0,3)}catch{return []}}
  function saveCompareV299(ids){localStorage.setItem(compareKeyV299,JSON.stringify(ids));syncCompareV299()}
  function syncCompareV299(){
    const ids=compareIdsV299();
    qsa('[data-compare-real]').forEach(b=>{const on=ids.includes(b.dataset.compareReal);const text=on?'✓ В сравнението':'Сравни';if(b.textContent!==text)b.textContent=text;b.setAttribute('aria-pressed',String(on));b.disabled=compareBusyV299});
    const dock=qs('[data-compare-dock]');if(dock){dock.hidden=!ids.length||file()==='compare.html';const a=qs('a',dock);a.textContent=`Сравни избраните (${ids.length}/3)`}
  }
  function mountCompareV299(){
    qsa('[data-listing-id]').forEach(card=>{
      const id=card.dataset.listingId;if(!v297Uuid(id)||card.querySelector('[data-compare-real]'))return;
      const host=card.querySelector('.detail-actions,.listing-right,.card-body');if(!host)return;
      const b=document.createElement('button');b.type='button';b.className=host.matches('.detail-actions')?'secondary-btn':'compare-select-v299';b.dataset.compareReal=id;host.appendChild(b);
    });syncCompareV299();
  }
  async function toggleCompareV299(id){
    if(compareBusyV299||!v297Uuid(id))return;
    let ids=compareIdsV299();if(ids.includes(id)){saveCompareV299(ids.filter(x=>x!==id));if(file()==='compare.html')await renderCompareV299();return}
    if(ids.length>=3){toast('Можеш да сравняваш до 3 обяви. Премахни една от избраните.');return}
    compareBusyV299=true;syncCompareV299();
    try{
      // Recheck the current selection after the request, including changes in another tab.
      const requested=[...ids,id];
      const r=await client.from('listings').select('id,category_slug,status').in('id',requested);if(r.error)throw r.error;
      ids=compareIdsV299();if(ids.some(x=>!requested.includes(x))){toast('Изборът е променен в друг прозорец. Опитай отново.');return}
      if(ids.includes(id))return;if(ids.length>=3){toast('Можеш да сравняваш до 3 обяви.');return}
      const row=(r.data||[]).find(x=>x.id===id);
      if(!row||!['active','reserved'].includes(row.status)){toast('Тази обява вече не е активна.');return}
      const selected=ids.map(x=>(r.data||[]).find(y=>y.id===x));
      if(selected.some(x=>!x||!['active','reserved'].includes(x.status))){toast('Има недостъпна обява в сравнението. Премахни я от „Сравнение“.');return}
      if(!row.category_slug||selected.some(x=>x.category_slug!==row.category_slug)){toast('Избирай обяви от една категория — например само хладилници.');return}
      saveCompareV299([...ids,id]);
    }catch(e){toast('Не успяхме да добавим обявата за сравнение. Опитай отново.');console.warn(e)}finally{compareBusyV299=false;syncCompareV299()}
  }
  function compareValueV299(v){if(v===true)return 'Да';if(v===false)return 'Не';if(v==null||typeof v==='object'||String(v).trim()==='')return 'Не е посочено';return String(v)}
  async function renderCompareV299(){
    const root=qs('[data-comparison-root]');if(!root)return;
    const ids=compareIdsV299();root.innerHTML='<p role="status">Зареждаме сравнението…</p>';
    if(!ids.length){root.innerHTML='<div class="empty-state"><h2>Няма избрани обяви</h2><p>Натисни „Сравни“ под обявите. Можеш да избереш до 3 от една категория.</p><a class="primary-btn" href="listings.html">Разгледай обявите</a></div>';return}
    try{
      const r=await client.from('listings').select('*').in('id',ids);if(r.error)throw r.error;
      if(JSON.stringify(ids)!==JSON.stringify(compareIdsV299()))return renderCompareV299();
      const rows=ids.map(id=>(r.data||[]).find(x=>x.id===id&&['active','reserved'].includes(x.status))||null);
      const cats=new Set(rows.filter(Boolean).map(x=>x.category_slug));
      if(cats.size>1){root.innerHTML='<p>Категорията на избрана обява е променена. Избери отново обяви от една категория.</p><button class="secondary-btn" data-compare-clear>Изчисти сравнението</button>';return}
      const fields=rows.map(row=>row?v260ListingFields(row):null),specKeys=[...new Set(fields.flatMap(f=>Object.keys(f?.specs||{}).filter(k=>!k.startsWith('__')&&typeof f.specs[k]!=='object')))];
      const specs=[['Цена',rows.map(r=>r?v260Money(r.price):null)],['Състояние',fields.map(f=>f?.condition)],['Марка',fields.map(f=>f?.brand)],['Модел',fields.map(f=>f?.model)],['Населено място',fields.map(f=>f?.city)],...specKeys.map(k=>[k,fields.map(f=>f?.specs[k])])];
      const img=await client.from('listing_images').select('*').in('listing_id',ids);const images=new Map();(img.data||[]).sort(v260ImageSort).forEach(x=>{if(!images.has(x.listing_id))images.set(x.listing_id,x)});
      if(JSON.stringify(ids)!==JSON.stringify(compareIdsV299()))return renderCompareV299();
      const headers=rows.map((row,i)=>{const p=row?v275ImagePathsFromRow(row)[0]:null;return `<th scope="col">${row?`<img src="${esc(v260PublicImageUrl(p?v275PseudoImage(p):images.get(row.id)))}" alt=""><a href="listing.html?id=${encodeURIComponent(row.id)}">${esc(row.title||'Обява')}</a>`:'<strong>Обявата вече не е налична</strong>'}<button class="compare-remove-v299" data-compare-remove="${esc(ids[i])}" aria-label="Премахни ${esc(row?.title||'недостъпната обява')} от сравнението">Премахни</button></th>`}).join('');
      root.innerHTML=`<p>${ids.length}/3 избрани обяви${fields.find(Boolean)?' · '+esc(fields.find(Boolean).category):''}. Плъзни таблицата настрани на телефон.</p><div class="compare-scroll-v299" tabindex="0" role="region" aria-label="Таблица за сравнение"><table class="compare-table-v299"><caption>Сравнение на избраните обяви</caption><thead><tr><th scope="col">Характеристика</th>${headers}</tr></thead><tbody>${specs.map(([label,values])=>`<tr><th scope="row">${esc(label)}</th>${values.map(v=>`<td>${esc(compareValueV299(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="compare-footer-v299"><a class="secondary-btn" href="listings.html">${ids.length<3?'Добави още обява':'Към обявите'}</a><button class="secondary-btn" data-compare-clear>Изчисти сравнението</button></div>`;
    }catch(e){root.innerHTML='<p role="alert">Не успяхме да заредим сравнението. Изборът ти е запазен.</p><button class="secondary-btn" data-compare-retry>Опитай отново</button>';console.warn(e)}
  }
  function initCompareV299(){
    const style=document.createElement('link');style.rel='stylesheet';style.href='assets/css/compare-v299.css?v=3.02';document.head.appendChild(style);
    const nav=qs('.main-nav');if(nav&&!nav.querySelector('a[href="compare.html"]')){const a=document.createElement('a');a.href='compare.html';a.textContent='Сравнение';nav.appendChild(a)}
    const dock=document.createElement('div');dock.className='compare-dock-v299';dock.dataset.compareDock='';dock.hidden=true;dock.innerHTML='<a href="compare.html"></a>';document.body.appendChild(dock);
    document.addEventListener('click',e=>{
      const add=e.target.closest('[data-compare-real]'),remove=e.target.closest('[data-compare-remove]');
      if(add||remove){e.preventDefault();toggleCompareV299(add?.dataset.compareReal||remove.dataset.compareRemove);return}
      if(e.target.closest('[data-compare-clear]')){saveCompareV299([]);renderCompareV299()}
      if(e.target.closest('[data-compare-retry]'))renderCompareV299();
    });
    new MutationObserver(records=>{if(!records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1)))return;clearTimeout(compareTimerV299);compareTimerV299=setTimeout(mountCompareV299,50)}).observe(document.body,{childList:true,subtree:true});
    window.addEventListener('storage',e=>{if(e.key===compareKeyV299){syncCompareV299();if(file()==='compare.html')renderCompareV299()}});
    mountCompareV299();if(file()==='compare.html')renderCompareV299();
  }

  async function boot(){
    initCompareV299();
    initRegistration();
    initLogin();
    initForgotPassword();
    initVerifyEmail();
    const state=await routeGuardAndSync();
    if(state?.redirected)return;
    v287SyncBetaCampaignVisibility(state.session);
    await initProfilePage(state.session,state.account);
    await initProfileEdit(state.session,state.account);
    await initAccountSecurity(state.session);
    await initAdminAccess(state.session);
    await initSupabasePromotions(state.session);
    await v290InitPurchasePages(state.session);
    await initSupabasePostAd(state.session,state.account);
    await initRealEditAd(state.session);
    await initRealReportV294(state.session);
    await renderSupabaseMyAds(state.session);
    await initRealHomeFeatured();
    await initRealHomeV297();
    await initRealSellerV297();
    await initPublicListings();
    await initRealListingDetail(state.session);
    await initRealChatBadge(state.session);
    await initRealFavorites(state.session);
    await initRealMarketplaceNotifications(state.session);
  }

  boot().catch(err=>{console.error(err);toast(humanizeError(err))});
})();

