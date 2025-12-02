// scripts/set-user.js
import admin from 'firebase-admin';

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

admin.initializeApp({
  credential: admin.credential.cert(join(__dirname, '..', 'serviceAccountKey.json')),
});

async function setUserByEmail(email, unidades) {
  if (!email) {
    throw new Error('Uso: node scripts/set-user.js user@dominio.com "alphaville,buena vista,marista"');
  }

  const user = await admin.auth().getUserByEmail(email);
  const current = user.customClaims || {};
  
  // Processa as unidades permitidas
  let allowedUnits = [];
  if (unidades) {
    allowedUnits = unidades.split(',').map(u => u.trim().toLowerCase());
  }
  
  // Define os claims para usuário normal
  const newClaims = { 
    ...current, 
    role: 'user',
    admin: false,
    allowedUnits: allowedUnits
  };

  await admin.auth().setCustomUserClaims(user.uid, newClaims);
  console.log(`OK: ${email} agora tem claims:`, newClaims);
  console.log(`Unidades permitidas: ${allowedUnits.join(', ')}`);
}

// Pega argumentos da linha de comando
const email = process.argv[2];
const unidades = process.argv[3];

setUserByEmail(email, unidades).catch(err => {
  console.error(err);
  process.exit(1);
});
