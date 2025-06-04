export interface AlertData {
  country: string;
  nThumbsUp?: number;
  city?: string;
  reportRating: number;
  reportByMunicipalityUser: string;
  reliability: number;
  type: string;
  fromNodeId: number;
  uuid: string;
  speed: number;
  reportMood: number;
  subtype?: string;
  street?: string;
  additionalInfo?: string;
  toNodeId: number;
  id: string;
  nComments?: number;
  inscale: boolean;
  confidence: number;
  roadType: number;
  magvar: number;
  wazeData: string;
  location: {
    x: number;
    y: number;
  };
  pubMillis: number;
  reportBy?: string;
  provider?: string;
  providerId?: string;
  reportDescription?: string;
  nearBy?: string;
}
