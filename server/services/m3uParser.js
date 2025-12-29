const axios = require("axios");

/**
 * Parse M3U playlist and extract channel information
 * @param {string} m3uUrl - URL of the M3U playlist
 * @returns {Promise<Array>} Array of channel objects
 */
async function parseM3U(m3uUrl) {
  try {
    console.log("[M3U Parser] Fetching M3U from:", m3uUrl);
    
    const response = await axios.get(m3uUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const content = response.data;
    const lines = content.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Parse EXTINF line (channel metadata)
      if (line.startsWith('#EXTINF:')) {
        currentChannel = parseExtInf(line);
      }
      // Parse stream URL
      else if (line && !line.startsWith('#') && currentChannel.name) {
        currentChannel.url = line;
        
        // Only add if it's a sports channel
        if (isSportsChannel(currentChannel)) {
          channels.push({ ...currentChannel });
        }
        
        currentChannel = {};
      }
    }

    console.log(`[M3U Parser] ✅ Parsed ${channels.length} sports channels`);
    return channels;
  } catch (error) {
    console.error("[M3U Parser] ❌ Error:", error.message);
    throw new Error(`Failed to parse M3U: ${error.message}`);
  }
}

/**
 * Parse EXTINF line to extract channel information
 * @param {string} line - EXTINF line from M3U
 * @returns {Object} Channel metadata
 */
function parseExtInf(line) {
  const channel = {
    name: '',
    logo: null,
    groupTitle: null,
    country: null,
    language: null,
  };

  // Extract tvg-logo
  const logoMatch = line.match(/tvg-logo="([^"]*)"/);
  if (logoMatch) {
    channel.logo = logoMatch[1];
  }

  // Extract group-title (category)
  const groupMatch = line.match(/group-title="([^"]*)"/);
  if (groupMatch) {
    channel.groupTitle = groupMatch[1];
  }

  // Extract tvg-country
  const countryMatch = line.match(/tvg-country="([^"]*)"/);
  if (countryMatch) {
    channel.country = countryMatch[1];
  }

  // Extract tvg-language
  const languageMatch = line.match(/tvg-language="([^"]*)"/);
  if (languageMatch) {
    channel.language = languageMatch[1];
  }

  // Extract channel name (after last comma)
  const nameMatch = line.match(/,(.+)$/);
  if (nameMatch) {
    channel.name = nameMatch[1].trim();
  }

  return channel;
}

/**
 * Check if channel is related to sports
 * @param {Object} channel - Channel object
 * @returns {boolean} True if sports channel
 */
function isSportsChannel(channel) {
  const sportsKeywords = [
    'sport', 'espn', 'fox sports', 'futebol', 'football', 'soccer',
    'nfl', 'nba', 'nhl', 'mlb', 'ufc', 'fight', 'boxing', 'premiere',
    'combate', 'sportv', 'band sports', 'esporte', 'champions',
    'copa', 'liga', 'arena', 'racing', 'tennis', 'golf', 'rugby',
    'cricket', 'formula', 'f1', 'moto', 'volei', 'basquete',
    'beinsports', 'sky sports', 'dazn', 'eleven', 'fox deportes',
    'tnt sports', 'star+', 'paramount', 'peacock', 'nbcsn'
  ];

  const searchText = `${channel.name} ${channel.groupTitle || ''}`.toLowerCase();
  
  return sportsKeywords.some(keyword => searchText.includes(keyword));
}

/**
 * Filter channels by category/keyword
 * @param {Array} channels - Array of channels
 * @param {string} filter - Filter keyword
 * @returns {Array} Filtered channels
 */
function filterChannels(channels, filter) {
  if (!filter) return channels;
  
  const filterLower = filter.toLowerCase();
  return channels.filter(channel => {
    const searchText = `${channel.name} ${channel.groupTitle || ''}`.toLowerCase();
    return searchText.includes(filterLower);
  });
}

module.exports = {
  parseM3U,
  isSportsChannel,
  filterChannels,
};
