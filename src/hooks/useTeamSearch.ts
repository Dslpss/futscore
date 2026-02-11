import { useState, useCallback, useEffect } from "react";
import { api } from "../services/api";
import { inferMsnTeamId } from "../utils/teamIdMapper";

export interface TeamSearchResult {
  id: number;
  name: string;
  logo: string;
  country: string;
  msnId?: string;
}

export const useTeamSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamSearchResult[]>([]);
  const [searchingTeams, setSearchingTeams] = useState(false);

  // Debounced search can be implemented here if needed, 
  // currently mimicking the existing direct call pattern
  const searchTeams = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchingTeams(true);
    try {
      // Use existing API service
      const teams = await api.searchTeams(query);
      
      const formattedTeams = teams.map((team: any) => ({
        id: team.team.id,
        name: team.team.name,
        logo: team.team.logo,
        country: team.team.country,
        msnId: inferMsnTeamId(team.team.id),
      }));
      
      setSearchResults(formattedTeams);
    } catch (error) {
      console.error("[useTeamSearch] Error searching teams:", error);
      setSearchResults([]);
    } finally {
      setSearchingTeams(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return {
    searchQuery,
    searchResults,
    searchingTeams,
    searchTeams,
    clearSearch,
  };
};
