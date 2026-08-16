import { FormTemplate } from './form-template';
import { HalLinks } from 'src/app/models/hal-links';

export interface ResponseFileInfo {
  id?: string;

  stage?: number;
  page?: number;
  team?: number;
  identificationManuallyLocked?: boolean;

  checked?: boolean;
  processingStatus?: 'QUEUED' | 'PROCESSING' | 'READY' | 'READY_WITH_WARNINGS' | 'MANUAL_REVIEW_REQUIRED' | 'ERROR';
  processingError?: string;
  verificationLeaseOwner?: string;
  verificationLeaseExpiresAt?: string;

  filledForm?: FormTemplate;
  _links?: HalLinks;
}
