import axios from 'axios';
import { CONFIG } from '../constants/config';
import { Channel, ChannelStats, SyncResult } from '../types/Channel';

const CHANNELS_BASE_URL = `${CONFIG.BACKEND_URL}/api/channels`;

/**
 * Get all active channels
 */
export const getChannels = async (params?: {
  category?: string;
  search?: string;
  limit?: number;
}): Promise<Channel[]> => {
  try {
    const response = await axios.get(CHANNELS_BASE_URL, { params });
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error fetching channels:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch channels');
  }
};

/**
 * Get sports channels only
 */
export const getSportsChannels = async (limit?: number): Promise<Channel[]> => {
  try {
    const response = await axios.get(`${CHANNELS_BASE_URL}/sports`, {
      params: { limit }
    });
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error fetching sports channels:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch sports channels');
  }
};

/**
 * Get channel by ID
 */
export const getChannelById = async (id: string): Promise<Channel> => {
  try {
    const response = await axios.get(`${CHANNELS_BASE_URL}/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error fetching channel:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch channel');
  }
};

/**
 * Increment view count
 */
export const incrementViewCount = async (id: string): Promise<void> => {
  try {
    await axios.post(`${CHANNELS_BASE_URL}/${id}/view`);
  } catch (error: any) {
    console.error('[Channel Service] Error incrementing view count:', error);
    // Don't throw error, this is not critical
  }
};

// --- ADMIN FUNCTIONS ---

/**
 * Sync channels from M3U (Admin only)
 */
export const syncChannels = async (token: string, m3uUrl?: string): Promise<SyncResult> => {
  try {
    const response = await axios.post(
      `${CHANNELS_BASE_URL}/sync`,
      { m3uUrl },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error syncing channels:', error);
    throw new Error(error.response?.data?.message || 'Failed to sync channels');
  }
};

/**
 * Get all channels including inactive (Admin only)
 */
export const getAllChannels = async (token: string): Promise<Channel[]> => {
  try {
    const response = await axios.get(`${CHANNELS_BASE_URL}/admin/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error fetching all channels:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch all channels');
  }
};

/**
 * Update channel (Admin only)
 */
export const updateChannel = async (
  token: string,
  id: string,
  data: Partial<Channel>
): Promise<Channel> => {
  try {
    const response = await axios.put(
      `${CHANNELS_BASE_URL}/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error updating channel:', error);
    throw new Error(error.response?.data?.message || 'Failed to update channel');
  }
};

/**
 * Delete channel (Admin only)
 */
export const deleteChannel = async (token: string, id: string): Promise<void> => {
  try {
    await axios.delete(`${CHANNELS_BASE_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch (error: any) {
    console.error('[Channel Service] Error deleting channel:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete channel');
  }
};

/**
 * Get channel statistics (Admin only)
 */
export const getChannelStats = async (token: string): Promise<ChannelStats> => {
  try {
    const response = await axios.get(`${CHANNELS_BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error: any) {
    console.error('[Channel Service] Error fetching channel stats:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch channel stats');
  }
};
