export type ColumnType = 'numeric' | 'categorical' | 'temporal' | 'text';

export interface ColumnMeta {
  type: ColumnType;
  uniqueCount: number;
  nullCount: number;
  missingRate: number;
  sampleValues: any[];
}

export type Schema = Record<string, ColumnMeta>;

export interface NumericStats {
  type: 'numeric';
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  variance: number;
  stdDev: number;
  range: number;
}

export interface CategoricalStats {
  type: 'categorical' | 'text';
  count: number;
  uniqueCount: number;
  topCategories: { value: string; count: number; percentage: number }[];
  mode: string | null;
}

export interface TemporalStats {
  type: 'temporal';
  count: number;
  minDate: string;
  maxDate: string;
  rangeDays: number;
}

export type ColumnStats = NumericStats | CategoricalStats | TemporalStats;

export type Statistics = Record<string, ColumnStats>;

export type Correlations = Record<string, Record<string, number | null>>;

export interface Anomaly {
  rowIndex: number;
  column: string;
  value: any;
  mean: number;
  stdDev: number;
  zScore: number;
  row: Record<string, any>;
}

export interface RegressionPoint {
  x: any;
  xNum: number;
  actual: number | null;
  predicted: number;
  label: string;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  isDate: boolean;
  fittedPoints: RegressionPoint[];
  forecastPoints: RegressionPoint[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'ai-loading';
  text: string;
  timestamp: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  userEmail: string;
  actionType: string;
  details: string;
  timestamp: any; // Firestore Timestamp
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: any;
}
