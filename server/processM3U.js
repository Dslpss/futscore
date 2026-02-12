// Script para reimportar apenas canais REALMENTE de esporte
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  logo: String,
  category: { type: String, default: 'sports' },
  groupTitle: String,
  country: String,
  language: String,
  isActive: { type: Boolean, default: true },
  viewCount: { type: Number, default: 0 },
}, { timestamps: true });

const Channel = mongoose.model('Channel', channelSchema);

// Keywords que indicam ESPORTE no group-title
const sportsGroupKeywords = [
  'sport', 'esporte', 'deportes', 'futebol', 'football', 'soccer',
  'basquete', 'basketball', 'nba', 'nfl', 'ufc', 'fight', 'luta',
  'boxing', 'boxe', 'mma', 'wrestling', 'tennis', 'tenis',
  'golf', 'formula', 'f1', 'racing', 'corrida', 'automobilismo',
  'motogp', 'volleyball', 'volei', 'rugby', 'cricket', 'hockey'
];

// Keywords de canais de esporte conhecidos (no nome do canal)
const sportsChannelNames = [
  'espn', 'fox sport', 'sportv', 'band sport', 'bandsports', 'premiere', 'pfc', 'combate',
  'tnt sport', 'estadio tnt', 'nosso futebol', 'bein', 'sky sport', 'dazn', 'star+', 'paramount sport',
  'eurosport', 'eleven sport', 'supersport', 'tsn', 'nbcsn', 'fs1', 'fs2',
  'canal+ sport', 'movistar sport', 'directv sport', 'espn+', 'tve deporte',
  'prime video', 'hbo max', 'amazon prime'
];

// Keywords que EXCLUEM (filmes, séries, etc)
const excludeKeywords = [
  'movie', 'filme', 'series', 'serie', 'kids', 'criança', 'infantil',
  'news', 'noticia', 'musica', 'music', 'documentar', 'adult', 'xxx',
  '24/7', 'vod', 'on demand', 'cinema', 'hbo', 'netflix', 'amazon',
  'disney', 'cartoon', 'anime', 'desenho', 'religios'
];

function isSportsChannel(channel) {
  const name = (channel.name || '').toLowerCase();
  const group = (channel.groupTitle || '').toLowerCase();
  const combined = `${name} ${group}`;
  
  // Excluir se tiver keywords proibidas
  if (excludeKeywords.some(kw => combined.includes(kw))) {
    return false;
  }
  
  // Incluir se o group-title indica esporte
  if (sportsGroupKeywords.some(kw => group.includes(kw))) {
    return true;
  }
  
  // Incluir se o nome do canal é de esporte conhecido
  if (sportsChannelNames.some(kw => name.includes(kw))) {
    return true;
  }
  
  return false;
}

async function reimportSportsOnly() {
  const filePath = process.argv[2] || '../canais.m3u';
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado ao MongoDB');

    // Deletar todos os canais existentes
    const deleted = await Channel.deleteMany({});
    console.log(`🗑️  Canais anteriores deletados: ${deleted.deletedCount}`);

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    console.log(`📄 Total de linhas: ${lines.length}`);

    const channels = [];
    let currentChannel = {};
    let skipped = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        currentChannel = { name: '', logo: null, groupTitle: null, country: null };

        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) currentChannel.logo = logoMatch[1];

        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) currentChannel.groupTitle = groupMatch[1];

        const countryMatch = line.match(/tvg-country="([^"]*)"/);
        if (countryMatch) currentChannel.country = countryMatch[1];

        const nameMatch = line.match(/,(.+)$/);
        if (nameMatch) currentChannel.name = nameMatch[1].trim();
      }
      else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        
        if (isSportsChannel(currentChannel)) {
          channels.push({ ...currentChannel });
        } else {
          skipped++;
        }
        
        currentChannel = {};
      }
    }

    console.log(`📺 Canais de esporte encontrados: ${channels.length}`);
    console.log(`⏭️  Canais ignorados (não-esporte): ${skipped}`);

    let count = 0;
    for (const channelData of channels) {
      await Channel.create({
        name: channelData.name,
        url: channelData.url,
        logo: channelData.logo,
        category: 'sports',
        groupTitle: channelData.groupTitle,
        country: channelData.country,
      });
      count++;
      
      if (count % 50 === 0) {
        console.log(`   Inseridos: ${count}/${channels.length}`);
      }
    }

    console.log(`\n✅ CONCLUÍDO!`);
    console.log(`   ✓ Total de canais de esporte: ${count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

reimportSportsOnly();
