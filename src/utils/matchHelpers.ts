import { Match } from '../types';

/**
 * Encontra o próximo jogo agendado dos times favoritos
 * @param allMatches - Lista de todas as partidas disponíveis
 * @param favoriteTeamIds - IDs dos times favoritos do usuário
 * @returns O próximo jogo encontrado ou null
 */
export const getNextFavoriteMatch = (
  allMatches: Match[],
  favoriteTeamIds: number[]
): Match | null => {
  if (!favoriteTeamIds || favoriteTeamIds.length === 0) {
    return null;
  }

  if (!allMatches || allMatches.length === 0) {
    return null;
  }

  const now = new Date().getTime();

  // Filtrar jogos futuros dos times favoritos
  const upcomingFavoriteMatches = allMatches.filter((match) => {
    const matchTime = new Date(match.fixture.date).getTime();
    const isFuture = matchTime > now;
    const isFavorite =
      favoriteTeamIds.includes(match.teams.home.id) ||
      favoriteTeamIds.includes(match.teams.away.id);

    // Apenas jogos agendados (não ao vivo ou finalizados)
    const isScheduled = ['NS', 'TBD', 'TIMED'].includes(match.fixture.status.short);

    return isFuture && isFavorite && isScheduled;
  });

  if (upcomingFavoriteMatches.length === 0) {
    return null;
  }

  // Ordenar por data mais próxima
  upcomingFavoriteMatches.sort((a, b) => {
    const dateA = new Date(a.fixture.date).getTime();
    const dateB = new Date(b.fixture.date).getTime();
    return dateA - dateB;
  });

  // Retornar o jogo mais próximo
  return upcomingFavoriteMatches[0];
};

/**
 * Verifica se há algum jogo ao vivo dos times favoritos
 * @param allMatches - Lista de todas as partidas disponíveis
 * @param favoriteTeamIds - IDs dos times favoritos do usuário
 * @returns Lista de jogos ao vivo dos favoritos
 */
export const getLiveFavoriteMatches = (
  allMatches: Match[],
  favoriteTeamIds: number[]
): Match[] => {
  if (!favoriteTeamIds || favoriteTeamIds.length === 0) {
    return [];
  }

  if (!allMatches || allMatches.length === 0) {
    return [];
  }

  return allMatches.filter((match) => {
    const isFavorite =
      favoriteTeamIds.includes(match.teams.home.id) ||
      favoriteTeamIds.includes(match.teams.away.id);

    const isLive = ['1H', '2H', 'HT'].includes(match.fixture.status.short);

    return isFavorite && isLive;
  });
};
