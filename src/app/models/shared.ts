export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}