export interface ResponseFileSummary {
  id: string;
  stage?: number;
  page?: number;
  team?: number;
  processingStatus?: string;
  processingError?: string;
  manualReviewRequired?: boolean;
  availableForVerification: boolean;
  leasedByCurrentDevice: boolean;
}

export interface ResponseFileSummaryPage {
  content: ResponseFileSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
