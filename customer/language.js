(function(){
  // Simple i18n helper for the customer app
  // Usage:
  // - Add `data-i18n="key"` to elements whose textContent should be translated.
  // - Use `data-i18n-attr="placeholder|value"` to translate placeholder or value attributes.
  // - Call `i18n.init()` on app load (this file auto-initializes if `currentCustomer` is present).

  const translations = {
    en: {
      'fontSize': 'Font Size',
      'message': 'Message',
      'send': 'Send',
      'close': 'Close',
      'cancel': 'Cancel',
      'placeOrder': 'Place Order',
      'orderPlacedSuccess': 'Order Placed Successfully!',
      'orderReceived': 'Your order has been received.',
      'totalAmount': 'Total Amount',
      'specialOrder': 'Special Order',
      'noNotifications': 'No notifications',
      'noLoginHistory': 'No login history found for this account.',
      'loginHistory': 'Login History',
      'clearHistory': 'Clear History',
      'profileUpdated': 'Profile updated successfully!',
      'imageSent': 'Image sent',
      'fileSent': 'File sent',
      'messageSent': 'Message sent',
      'preferencesSaved': 'Preferences saved!',
      'passwordChanged': 'Password changed successfully!',
      'selectContactMessage': 'Please select a contact to message',
      'selectRecipient': 'Please select a recipient',
      'imageTooLarge': 'Image too large (max 2 MB)',
      'fileTooLarge': 'File too large (max 10 MB)',
      'selectContactImage': 'Please select a contact to send the image',
      'selectContactFile': 'Please select a contact to send the file',
      'noPaymentMethods': 'No payment methods saved',
      'profile': 'Profile',
      'messages': 'Messages',
      'settings': 'Settings',
      'orders': 'Orders',
      'notifications': 'Notifications',
      'logout': 'Logout',
      'fullName': 'Full Name',
      'email': 'Email',
      'phone': 'Phone',
      'address': 'Address'
    },
    am: {
      // Amharic translations (basic)
      'fontSize': 'ፊደል መጠን',
      'message': 'መልዕክት',
      'send': 'ላክ',
      'close': 'ዝጋ',
      'cancel': 'ሰርዝ',
      'placeOrder': 'ትዕዛዝ ያቅርቡ',
      'orderPlacedSuccess': 'ትዕዛዝ በተሳካ ሁኔታ ተደርጓል!',
      'orderReceived': 'ትዕዛዛችሁ ተቀብሏል።',
      'totalAmount': 'ጠቅላላ ዋጋ',
      'specialOrder': 'ልዩ ትዕዛዝ',
      'noNotifications': 'ምንም ማስታወቂያ የለም',
      'noLoginHistory': 'ለዚህ መለያ የግባ ታሪክ አልተገኘም።',
      'loginHistory': 'የግባ ታሪክ',
      'clearHistory': 'ታሪኩን አስወግድ',
      'profileUpdated': 'መለያዎ በተሳካ ሁኔታ ተዘምኗል!',
      'imageSent': 'ምስል ተልኳል',
      'fileSent': 'ፋይል ተልኳል',
      'messageSent': 'መልዕክት ተልኳል',
      'preferencesSaved': 'ቅድሚያዎች ተቀምጠዋል!',
      'passwordChanged': 'ፕስወርድ በተሳካ ሁኔታ ቀየረ!',
      'selectContactMessage': 'ለመልዕክት እባክዎን አውታረ ግንኙነት ይምረጡ',
      'selectRecipient': 'እባክዎን የሚቀበሉትን ይምረጡ',
      'imageTooLarge': 'ምስሉ ከፍ ነው (ከፍተኛ 2 MB)',
      'fileTooLarge': 'ፋይሉ ከፍ ነው (ከፍተኛ 10 MB)',
      'selectContactImage': 'ለምስል ማስተላለፊያ እባክዎን አውታረ ግንኙነት ይምረጡ',
      'selectContactFile': 'ለፋይል ማስተላለፊያ እባክዎን አውታረ ግንኙነት ይምረጡ',
      'noPaymentMethods': 'የክፍያ ዘዴዎች አልተቀመጡም',
      'profile': 'መለያ',
      'messages': 'መልዕክቶች',
      'settings': 'ቅንብሮች',
      'orders': 'ትዕዛዞች',
      'notifications': 'ማስታወቂያዎች',
      'logout': 'ውጣ',
      'fullName': 'ሙሉ ስም',
      'email': 'ኢሜይል',
      'phone': 'ስልክ',
      'address': 'አድራሻ'
    }
  };

  let currentLang = 'en';

  function t(key, lang) {
    lang = lang || currentLang;
    return (translations[lang] && translations[lang][key]) || translations['en'][key] || key;
  }

  function applyTranslations(lang) {
    lang = lang || currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const attr = el.getAttribute('data-i18n-attr');
      const translated = t(key, lang);
      if (attr === 'placeholder') {
        el.placeholder = translated;
      } else if (attr === 'value') {
        el.value = translated;
      } else {
        el.textContent = translated;
      }
    });
  }

  function setLanguage(lang) {
    if (!translations[lang]) lang = 'en';
    currentLang = lang;
    try { localStorage.setItem('language', lang); } catch (e) {}
    applyTranslations(lang);
  }

  function detectLanguage() {
    try {
      // Prefer per-user saved preference if available
      if (typeof currentCustomer !== 'undefined' && currentCustomer) {
        const prefs = JSON.parse(localStorage.getItem(`preferences_${currentCustomer.id}`) || '{}');
        if (prefs.language) return prefs.language;
      }
    } catch (e) {}
    return localStorage.getItem('language') || (navigator.language && navigator.language.startsWith('am') ? 'am' : 'en');
  }

  function init() {
    const lang = detectLanguage();
    setLanguage(lang);
  }

  // Expose API
  window.i18n = {
    t,
    setLanguage,
    applyTranslations,
    init,
    translations
  };

  // Auto-init (if DOM is ready later calls will re-apply)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
