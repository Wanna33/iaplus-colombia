(() => {
  'use strict';
  const button = new URLSearchParams(location.search).get('button');
  if (!['ESZ3PJJFB5752', 'QJWRD7JVZVBMQ', 'R244SQBE54KXA'].includes(button)) return;
  const notify = (type, extra = {}) => parent.postMessage({type, button, ...extra}, location.origin);
  const resize = () => notify('iap-paypal-height', {height:document.body.scrollHeight + 8});
  new ResizeObserver(resize).observe(document.body);
  try {
    Promise.resolve(window.paypal.HostedButtons({hostedButtonId:button}).render('#buttons'))
      .then(() => { notify('iap-paypal-ready'); resize(); })
      .catch(() => notify('iap-paypal-error'));
  } catch { notify('iap-paypal-error'); }
})();
