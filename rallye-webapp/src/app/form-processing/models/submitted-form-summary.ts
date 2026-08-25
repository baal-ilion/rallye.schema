export interface SubmittedFormSummary {
  id: string;
  challenge?: number;
  page?: number;
  team?: number;
  processingStatus?: string;
  processingError?: string;
  manualReviewRequired?: boolean;
  availableForVerification: boolean;
  leasedByCurrentDevice: boolean;
}

export interface SubmittedFormSummaryPage {
  content: SubmittedFormSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
