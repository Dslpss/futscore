export interface Channel {
  _id: string;
  name: string;
  url: string;
  logo: string | null;
  category: string;
  country: string | null;
  language: string | null;
  groupTitle: string | null;
  isActive: boolean;
  viewCount: number;
  lastAccessed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChannelStats {
  totalChannels: number;
  activeChannels: number;
  sportsChannels: number;
  inactiveChannels: number;
  mostViewed: Channel[];
}

export interface SyncResult {
  message: string;
  synced: number;
  new: number;
  updated: number;
  total: number;
}
