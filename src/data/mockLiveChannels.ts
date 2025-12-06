export interface LiveChannel {
  id: string;
  name: string;
  poster: string;
  logo: string;
  url: string;
  category: string;
  headers?: Record<string, string>;
}

const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
  'Referer': 'https://www.youcineweb.com/',
  'Origin': 'https://www.youcineweb.com',
};

// Extracted from user's working URL (Preserved)
const BASE_DOMAIN = 'https://live-youcineweb.yamyday.com/live';
const SESSION_AUTH = 'client_ip%3D189.37.69.203%26session_id%3D54lJXk3XsbDl%26main_addr%3Dhttps://live-youcineweb.yamyday.com/v3/youshi/%26auth_id%3D424435340_com.global.ycweb__0%26app_id%3Dcom.global.ycweb%26spared_addr%3Dhttps://live-ycweb.yamyday.com/v3/youshi/%26sign_type%3Dcfl%26user_id%3D424435340%26media_encrypted%3D0%26dev_id%3De28660cc%26app_ver%3D20302%26link%3Dcf%26expired%3D1765065906%26tag%3D15B972%26check_play_ip%3Dtrue%26token%3D735E7BA04934FC58C8B9125FA51CB265';

const constructUrl = (mediaCode: string, licenseParams: string) => {
  const encodedLicense = encodeURIComponent(licenseParams);
  // Using .m3u8 directly as seen in user's working URL
  return `${BASE_DOMAIN}/${mediaCode}.m3u8?content_auth2=${SESSION_AUTH}&content_license2=${encodedLicense}`;
};

export const MOCK_LIVE_CHANNELS: LiveChannel[] = [
  // --- ESPORTES ---
  {
    id: 'yc_sport1',
    name: 'Youcine Sport 1',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/04d1898d-ebea-482c-b02d-259b1efddeb8.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/04d1898d-ebea-482c-b02d-259b1efddeb8.png',
    url: constructUrl('pt_F9012193F66B5745_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_F9012193F66B5745_720p_264&expired=1765654607&token=783C1DFADD900030B838D5DECE276528'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_sport2',
    name: 'Youcine Sport 2',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/e600c54b-b111-4041-a3a8-5f52e16f8054.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/e600c54b-b111-4041-a3a8-5f52e16f8054.png',
    url: constructUrl('pt_C42209EB4DF2CF2A_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_C42209EB4DF2CF2A_720p_264&expired=1765654607&token=D44E91319C5BC5A19FD3094EDB5BBF30'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_sport3',
    name: 'Youcine Sport 3',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/ac8597c1-8b58-40ef-9c4a-ce1f4872a77e.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/ac8597c1-8b58-40ef-9c4a-ce1f4872a77e.png',
    url: constructUrl('pt_5354E544BEE20_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_5354E544BEE20_720p_264&expired=1765654607&token=5813BAC4A883872FF6964F2C93B34BA8'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_sport4',
    name: 'Youcine Sport 4',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/e26ad939-dc62-4af8-ba66-0b75c16b6d56.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/e26ad939-dc62-4af8-ba66-0b75c16b6d56.png',
    url: constructUrl('pt_E3E5BD29BD537A98E_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_E3E5BD29BD537A98E_720p_264&expired=1765654607&token=07C46195B90A0E29952241048EDC3B8A'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_sport5',
    name: 'Youcine Sport 5',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/57b6ae1a-32c0-4aa2-a736-615e6b2fd2a3.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/57b6ae1a-32c0-4aa2-a736-615e6b2fd2a3.png',
    url: constructUrl('pt_C3282BECB76E9B379_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_C3282BECB76E9B379_720p_264&expired=1765654607&token=9DF7BC9FE9376C2EFE290032BA9BE700'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_sport6',
    name: 'Youcine Sport 6',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/e9b6b540-4d69-4712-afcc-d5cac0ddb608.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/e9b6b540-4d69-4712-afcc-d5cac0ddb608.png',
    url: constructUrl('pt_B8E7554B8067DC468E7D_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_B8E7554B8067DC468E7D_720p_264&expired=1765654607&token=F9E85918AE12F0467C50F7C9AF725E8F'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_superliga',
    name: 'Youcine Superliga',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/04d1898d-ebea-482c-b02d-259b1efddeb8.png', // Fallback placeholder as logo missing in dump
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/04d1898d-ebea-482c-b02d-259b1efddeb8.png', 
    url: constructUrl('pt_9C733B133782F6C0_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_9C733B133782F6C0_264&expired=1765654607&token=6C9FCFFA1285EAFC73A9AB80DC9BD70C'),
    headers: COMMON_HEADERS
  },
  {
    id: 'premiere_clubes',
    name: 'Premiere Clubes UHD',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/9a3cd192-6804-4c1d-890f-9f7c3432b069.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/9a3cd192-6804-4c1d-890f-9f7c3432b069.png',
    url: constructUrl('ps_0108589415759_1080p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=ps_0108589415759_1080p_264&expired=1765654607&token=9BAB70732DAF49C6AF1AFA36DFF1D4E6'),
    headers: COMMON_HEADERS
  },
  {
    id: 'sportv_uhd',
    name: 'SporTV UHD',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/4b8553d1-21f6-466d-81d8-122576575498.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/4b8553d1-21f6-466d-81d8-122576575498.png',
    url: constructUrl('youcine_SporTV_UHD_1080p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=youcine_SporTV_UHD_1080p_264&expired=1765654607&token=FCE88FE62527E4D07F81EB6CE2790726'),
    headers: COMMON_HEADERS
  },
  {
    id: 'sportv2_uhd',
    name: 'SporTV 2 UHD',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/51803149-b702-4080-a423-95a0708c4e8e.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/51803149-b702-4080-a423-95a0708c4e8e.png',
    url: constructUrl('pt_930509047666951080p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_930509047666951080p_264&expired=1765654607&token=D23B2DD16933C2699141B979E767E333'),
    headers: COMMON_HEADERS
  },
  {
    id: 'combate_hd',
    name: 'Combate HD+',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/217e5bd4-d730-4e39-9062-c880a08f2934.webp',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/217e5bd4-d730-4e39-9062-c880a08f2934.webp',
    url: constructUrl('pt_DAF1CD8D173BE5A9107E5D_2M_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_DAF1CD8D173BE5A9107E5D_2M_264&expired=1765654607&token=6EBFDBAFF1B866D8890CF178FEF79056'),
    headers: COMMON_HEADERS
  },
  {
    id: 'espn2_uhd',
    name: 'ESPN 2 UHD',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/3dc0be6d-929b-4ef2-a527-694cbaf31d0e.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/3dc0be6d-929b-4ef2-a527-694cbaf31d0e.png',
    url: constructUrl('pt_ZX33DCF0114DDC5858_1080p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_ZX33DCF0114DDC5858_1080p_264&expired=1765654607&token=4CE74E485562275AC8489A6E1AF8DE06'),
    headers: COMMON_HEADERS
  },
  {
    id: 'espn3_uhd',
    name: 'ESPN 3 UHD',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/logo_espn3.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/logo_espn3.png',
    url: constructUrl('pt_0579021649258_1080p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_0579021649258_1080p_264&expired=1765654607&token=FF47160419E241030BD3B95AB9A6DEB0'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_nba',
    name: 'YouCine NBA',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/e8bf6aa1-f36b-4e30-be6a-dbff18414aa6.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/e8bf6aa1-f36b-4e30-be6a-dbff18414aa6.png',
    url: constructUrl('pt_48CA955106B1328438C9_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_48CA955106B1328438C9_264&expired=1765654607&token=7E137AE0031583EA63D08F76FAF4B769'),
    headers: COMMON_HEADERS
  },
  {
    id: 'yc_nfl',
    name: 'YouCine NFL',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/10f6a99c-4140-4d70-a127-e832d0a96fdd.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/10f6a99c-4140-4d70-a127-e832d0a96fdd.png',
    url: constructUrl('yc_E7C25264324C70D873B17758_720p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=yc_E7C25264324C70D873B17758_720p&expired=1765654607&token=0FCD505C25CD860689829AF84DBC39C4'),
    headers: COMMON_HEADERS
  },
  {
    id: 'ufc_fight_pass',
    name: 'UFC Fight Pass',
    category: 'Esportes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/logo_ufc.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/logo_ufc.png',
    url: constructUrl('pt_weifcx3i8Y8oB120naLmwy3_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_weifcx3i8Y8oB120naLmwy3_480p&expired=1765654607&token=51325A4389E82D185ECF7EC37E3169B1'),
    headers: COMMON_HEADERS
  },

  // --- TV ABERTA ---
  {
    id: 'globo_sp',
    name: 'Globo SP HD+',
    category: 'TV Aberta',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/f0d8b9a9-31dd-420e-80f3-c62a37ef2b29.webp',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/f0d8b9a9-31dd-420e-80f3-c62a37ef2b29.webp',
    url: constructUrl('pt_0B8EBD19BAC09683B3601F_2M_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_0B8EBD19BAC09683B3601F_2M_264&expired=1765654607&token=086020CA053DE2E576F67B4C530A8F49'),
    headers: COMMON_HEADERS
  },
  {
    id: 'sbt_hd',
    name: 'SBT HD+',
    category: 'TV Aberta',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/874f8b38-a0c3-4b1c-aa9f-994bc84935b8.webp',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/874f8b38-a0c3-4b1c-aa9f-994bc84935b8.webp',
    url: constructUrl('pt_8041C76226E052DD9D923B_2M_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_8041C76226E052DD9D923B_2M_264&expired=1765654607&token=2142ED3A7DE9F381BBCD22CB3E167513'),
    headers: COMMON_HEADERS
  },
  {
    id: 'record_hd',
    name: 'Record HD+',
    category: 'TV Aberta',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/afa71951-0695-4fb7-b5ab-00abeb2bd6c6.webp',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/afa71951-0695-4fb7-b5ab-00abeb2bd6c6.webp',
    url: constructUrl('pt_DDF2401F4B4C7BA067F7_720p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_DDF2401F4B4C7BA067F7_720p_264&expired=1765654607&token=7ED85274352B6A14FB9015BEA98B8CE6'),
    headers: COMMON_HEADERS
  },
  {
    id: 'band_hd',
    name: 'Band HD+',
    category: 'TV Aberta',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/57b6ae1a-32c0-4aa2-a736-615e6b2fd2a3.png', // Using fallback as no clear poster in snippet
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/57b6ae1a-32c0-4aa2-a736-615e6b2fd2a3.png',
    url: constructUrl('pt_QJDYEUCHZNDFHYETSIUC_720p_2M', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_QJDYEUCHZNDFHYETSIUC_720p_2M&expired=1765654607&token=0E9D1BAB18AB4C9D2A6A511D9C879A57'),
    headers: COMMON_HEADERS
  },

  // --- FILMES & SÉRIES ---
  {
    id: 'telecine_premium',
    name: 'Telecine Premium HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/5a2e6228-d3ce-405b-adf7-18a18206c163.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/5a2e6228-d3ce-405b-adf7-18a18206c163.png',
    url: constructUrl('pt_6B551C3FE16F334FEFF5_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_6B551C3FE16F334FEFF5_480p&expired=1765654607&token=74ECB9DFE240499D437A72382C9E10BB'),
    headers: COMMON_HEADERS
  },
  {
    id: 'telecine_pipoca',
    name: 'Telecine Pipoca HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/5639272c-79fe-4dd1-a315-80f7c0a5dbfd.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/5639272c-79fe-4dd1-a315-80f7c0a5dbfd.png',
    url: constructUrl('pt_6810F09BC6B169ACBB4C_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_6810F09BC6B169ACBB4C_480p&expired=1765654607&token=33314087AF62B92028030EAAC74894E1'),
    headers: COMMON_HEADERS
  },
  {
    id: 'telecine_action',
    name: 'Telecine Action HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/659f3fa7-d5c1-42a7-a10b-3851e4c84e25.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/659f3fa7-d5c1-42a7-a10b-3851e4c84e25.png',
    url: constructUrl('pt_5A0DB6B700FAB2D0945F_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_5A0DB6B700FAB2D0945F_480p&expired=1765654607&token=004E38A9A33B437C9E3BC441285D5AE9'),
    headers: COMMON_HEADERS
  },
  {
    id: 'telecine_fun',
    name: 'Telecine Fun HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/c96d3ef7-054f-4c51-9b9b-e17d367c4cf7.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/c96d3ef7-054f-4c51-9b9b-e17d367c4cf7.png',
    url: constructUrl('pt_B92E7FAC495A3B91AE9_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_B92E7FAC495A3B91AE9_480p&expired=1765654607&token=460755A196A395A45DB40FFB3AC32BED'),
    headers: COMMON_HEADERS
  },
  {
    id: 'telecine_touch',
    name: 'Telecine Touch HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/4b3dd194-df45-4d5d-a4b3-f34ab1e2c756.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/4b3dd194-df45-4d5d-a4b3-f34ab1e2c756.png',
    url: constructUrl('pt_89765A82148B4BAF38108_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_89765A82148B4BAF38108_480p&expired=1765654607&token=3088A16D2ED2485C4E53DF204F7246D6'),
    headers: COMMON_HEADERS
  },
  {
    id: 'telecine_cult',
    name: 'Telecine Cult HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/0e6df883-7fea-4925-aac1-c6409a57c31c.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/0e6df883-7fea-4925-aac1-c6409a57c31c.png',
    url: constructUrl('pt_ED9D5B8FAF6390DD_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_ED9D5B8FAF6390DD_480p&expired=1765654607&token=B85CF4E6E4A7D3F3925EA1D18E0A3BD4'),
    headers: COMMON_HEADERS
  },
  {
    id: 'hbo2_hd',
    name: 'HBO 2 HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/3edf44ee-ecfb-4df4-8334-a1a77f9b0c69.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/3edf44ee-ecfb-4df4-8334-a1a77f9b0c69.png',
    url: constructUrl('pt_7698E857D0871BD961F90013_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_7698E857D0871BD961F90013_480p&expired=1765654607&token=6A8B51D2630796AA3ED2B2021F56E643'),
    headers: COMMON_HEADERS
  },
  {
    id: 'tnt_hd',
    name: 'TNT HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/b4d28e14-9c14-494c-8c0c-2ff3a528e117.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/b4d28e14-9c14-494c-8c0c-2ff3a528e117.png',
    url: constructUrl('pt_2648799318_1080p_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_2648799318_1080p_264&expired=1765654607&token=24B144F89B68FE6F6E0FE24E9E466722'),
    headers: COMMON_HEADERS
  },
  {
    id: 'cinemax_hd',
    name: 'CineMax HD',
    category: 'Filmes',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/c36d8aa1-d35b-41f8-a533-20fa771d348f.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/c36d8aa1-d35b-41f8-a533-20fa771d348f.png',
    url: constructUrl('pt_2302D7B70066275E263951A0_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_2302D7B70066275E263951A0_480p&expired=1765654607&token=AD95E957B3D6A3BAD17212041C1A07DD'),
    headers: COMMON_HEADERS
  },

  // --- REALITY ---
  {
    id: 'a_fazenda_1',
    name: 'A Fazenda 17 - Sinal 1',
    category: 'Reality',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/7ecd393c-e7f4-4652-8afe-b572a3411fd7.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/7ecd393c-e7f4-4652-8afe-b572a3411fd7.png',
    url: constructUrl('pt_7F6B0005B513FAA4BE3D2C21_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_7F6B0005B513FAA4BE3D2C21_264&expired=1765654607&token=1635A7A06ED38B15DA27A2B7C1AF858B'),
    headers: COMMON_HEADERS
  },
  {
    id: 'a_fazenda_2',
    name: 'A Fazenda 17 - Sinal 2',
    category: 'Reality',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/051e4896-626d-4cf4-9892-af7f6917b7b9.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/051e4896-626d-4cf4-9892-af7f6917b7b9.png',
    url: constructUrl('pt_A8830DBB5538760304AB93D7_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_A8830DBB5538760304AB93D7_264&expired=1765654607&token=B02BC29A7618D65CF66678356219C3C7'),
    headers: COMMON_HEADERS
  },

  // --- INFANTIL & DOCS ---
  {
    id: 'discovery_kids',
    name: 'Discovery Kids HD',
    category: 'Infantil',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/faf0408e-af7c-47d3-ad65-cd2129bcfcd3.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/faf0408e-af7c-47d3-ad65-cd2129bcfcd3.png',
    url: constructUrl('pt_E1F0266A8AF745693D92C10B8_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_E1F0266A8AF745693D92C10B8_264&expired=1765654607&token=E3D5B9D2BB36C11DC596449D9235D737'),
    headers: COMMON_HEADERS
  },
  {
    id: 'history_hd',
    name: 'History HD',
    category: 'Documentários',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/96e1ea46-23b1-4549-a930-8907b0912433.png',
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/96e1ea46-23b1-4549-a930-8907b0912433.png',
    url: constructUrl('pt_ZX4B6A8A14A79CCF0_480p', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_ZX4B6A8A14A79CCF0_480p&expired=1765654607&token=05BB81AC5AAD02398D1515C1DAC7745D'),
    headers: COMMON_HEADERS
  },
  {
    id: 'globonews',
    name: 'GloboNews HD+',
    category: 'Notícias',
    poster: 'https://ffsqqm.m45504d3.xyz/public/images/5dcd2d63-e6ab-4db5-9c37-32dedc1a21ec.png', // Assuming placeholder or same family
    logo: 'https://ffsqqm.m45504d3.xyz/public/images/5dcd2d63-e6ab-4db5-9c37-32dedc1a21ec.png',
    url: constructUrl('pt_9C475299AB10203083E1E0_2M_264', 'app_id=com.global.ycweb&tag=15B972&scheme=md5-01&media_code=pt_9C475299AB10203083E1E0_2M_264&expired=1765654607&token=67AC4FC4A63AF5D827B64CE31799A616'),
    headers: COMMON_HEADERS
  }
];
