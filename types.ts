export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  EXTRACTING = 'EXTRACTING',
  ANALYZING = 'ANALYZING', 
  RECONSTRUCTING = 'RECONSTRUCTING', 
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface FrameData {
  index: number;
  image: ImageData;
  timestamp: number;
}
