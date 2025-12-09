// Video types for MSN Sports API

export interface MsnVideo {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  videoType: "Highlight" | "Recap" | string;
  published: string;
  dataProvider: string;
  isEmbeddable: boolean;
  durationInSeconds: number;
}

export interface MsnVideosResponse {
  "@odata.context": string;
  value: {
    videos: MsnVideo[];
    version: string;
  }[];
}
