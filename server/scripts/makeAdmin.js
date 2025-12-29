// Script para marcar um usuário como admin
// Execute com: node scripts/makeAdmin.js SEU_EMAIL

require('dotenv').config();
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  isAdmin: Boolean,
});

const User = mongoose.model('User', userSchema);

async function makeAdmin() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ Por favor, forneça um email: node scripts/makeAdmin.js email@example.com');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    const user = await User.findOne({ email: email });
    
    if (!user) {
      console.log(`❌ Usuário com email "${email}" não encontrado`);
      process.exit(1);
    }

    await User.updateOne({ email: email }, { isAdmin: true });
    console.log(`✅ Usuário "${email}" agora é admin!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

makeAdmin();
