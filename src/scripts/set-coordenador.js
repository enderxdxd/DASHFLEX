// scripts/set-coordenador.js
import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

admin.initializeApp({
  credential: admin.credential.cert(join(__dirname, '..', 'serviceAccountKey.json')),
});

async function setCoordenador(email) {
  if (!email) {
    throw new Error('Uso: node scripts/set-coordenador.js coordenador@flexacademia.com.br');
  }

  const user = await admin.auth().getUserByEmail(email);
  
  // Define os claims para coordenador com acesso a todas as 4 unidades
  const newClaims = { 
    role: 'coordenador',
    admin: false,
    allowedUnits: ['alphaville', 'buenavista', 'marista', 'palmas']
  };

  await admin.auth().setCustomUserClaims(user.uid, newClaims);
  console.log(`✅ OK: ${email} agora é COORDENADOR com claims:`, newClaims);
  console.log(`📍 Unidades permitidas: ${newClaims.allowedUnits.join(', ')}`);
}

// Pega email da linha de comando
const email = process.argv[2];

setCoordenador(email).catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
