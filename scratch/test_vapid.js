const webpush = require('web-push');
const pub = 'BHcypF0bbqvKjEiYndyFy3z1RYSJ9vtfj2edycAhkYwHFZHnG45_w9756lAqLOb_nE5R-5Thnm3WvsoK55CvYuI';
const priv = 'TKFUyiMV3OgDwaGsuW0cq7aafiUXkJM7p_wsKY0RiNU';
const sub = 'mailto:reperibilitacomandopl@gmail.com';

try {
  webpush.setVapidDetails(sub, pub, priv);
  console.log('SUCCESS: VAPID keys are valid!');
} catch (e) {
  console.error('FAILED: Invalid VAPID keys:', e.message);
}
