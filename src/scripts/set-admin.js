// scripts/set-admin.js
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json'),
});

async function setAdminByEmail(email) {
  if (!email) throw new Error('Passe o e-mail: node scripts/set-admin.js user@dominio.com');

  const user = await admin.auth().getUserByEmail(email);
  const current = user.customClaims || {};
  // garante compatibilidade com checagens diferentes
  const newClaims = { ...current, role: 'admin', admin: true };

  await admin.auth().setCustomUserClaims(user.uid, newClaims);
  console.log(`OK: ${email} agora tem claims:`, newClaims);
}

setAdminByEmail(process.argv[2]).catch(err => {
  console.error(err);
  process.exit(1);
});
