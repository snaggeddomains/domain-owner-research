// ==UserScript==
// @name         Snagged → DomainScout auto-track
// @namespace    https://research.snagged.com/
// @version      1.0.0
// @description  Auto-add a domain to the DomainScout "Track any domains" list when opened from Snagged Research — turns the two-click hand-off into one.
// @author       Snagged Research
// @match        https://www.domainscout.io/*
// @match        https://domainscout.io/*
// @run-at       document-idle
// @grant        none
// @downloadURL  https://research.snagged.com/domainscout.user.js
// @updateURL    https://research.snagged.com/domainscout.user.js
// ==/UserScript==

// How it works: the Snagged "DomainScout ↗" link opens this dashboard with the
// domain in the URL hash (#snagged=<domain>). This script watches for that hash,
// fills the "Track any domains" textarea, and clicks the Track button — so the
// only click you make is the link in Snagged. Mirrors the original Automator
// script's logic: textarea + the submit button whose text contains "Track".
(function () {
  'use strict';

  function getDomain() {
    const m = location.hash.match(/snagged=([^&]+)/);
    if (!m) return '';
    return decodeURIComponent(m[1]).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }

  function nativeSet(el, value) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function trackButton() {
    return [].slice
      .call(document.querySelectorAll('button[type=submit], button'))
      .filter((b) => /track/i.test((b.textContent || '').trim()))[0];
  }

  // Returns true once it has both filled the box and clicked Track.
  function attempt(domain) {
    const ta = document.querySelector('textarea');
    if (!ta) return false;
    nativeSet(ta, domain);
    ta.focus();
    const btn = trackButton();
    if (!btn) return false;
    btn.click();
    return true;
  }

  function clearHash() {
    history.replaceState(null, '', location.pathname + location.search);
  }

  function run() {
    const domain = getDomain();
    if (!domain) return;
    // The dashboard is a SPA — the Track box may render after load, so retry
    // briefly. Fall back to an Enter keypress if the button never shows.
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (attempt(domain)) {
        clearInterval(timer);
        clearHash();
      } else if (tries > 40) {
        clearInterval(timer);
        const ta = document.querySelector('textarea');
        if (ta) {
          nativeSet(ta, domain);
          ta.focus();
          ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        }
        clearHash();
      }
    }, 250);
  }

  run();
  // If the same DomainScout tab is reused for a different domain, the hash
  // changes without a reload — re-run on that.
  window.addEventListener('hashchange', run);
})();
