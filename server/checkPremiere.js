require('dotenv').config();
const mongoose = require('mongoose');
const Channel = require('./models/Channel');

async function checkPremiere() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Ctado ao MongoDB');

    const premiereChannels = await Channel.find({
      name: { $regex: /premiere|pfc|prime/i },
      isActive: true
    }).select('name groupTitle');

    console.log(`Encontrados ${premiereChannels.length} canais Premiere/Prime:`);
    premiereChannels.forEach(c => console.log(`- ${c.name} (${c.groupTitle})`));

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkPremiere();
