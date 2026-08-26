import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { SubmittedFormMetadata } from './models/submitted-form-metadata';
import { HalCollection } from '../models/hal-collection';
import { SubmittedFormSummaryPage } from './models/submitted-form-summary';

@Injectable({
  providedIn: 'root'
})
export class SubmittedFormService {
  readonly verificationOwner = this.getOrCreateVerificationOwner();

  constructor(private http: HttpClient) { }

  createUploadId(): string {
    return 'upload-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
      + '-' + Math.random().toString(36).slice(2);
  }

  uploadSubmittedForm(file: File, uploadId?: string) {
    const formdata = new FormData();
    formdata.append('file', file);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/submittedForms', formdata, {
      headers: uploadId ? new HttpHeaders().set('X-Upload-Id', uploadId) : undefined,
      reportProgress: true,
      observe: 'events'
    });
  }

  getFiles(pageNumber = 0, pageSize = 20): Observable<HalCollection<SubmittedFormMetadata, 'submittedFormMetadatas'>> {
    const params = new HttpParams().set('page', pageNumber.toString()).set('size', pageSize.toString())
      .set('leaseOwner', this.verificationOwner);
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/submittedFormsMetadata/search/findByCheckedIsFalse', { params });
  }

  updateSubmittedFormMetadataCorners(submittedFormMetadata: SubmittedFormMetadata): Observable<SubmittedFormMetadata> {
    return this.http.patch<SubmittedFormMetadata>(AppConfigService.settings.apiUrl.rallyeSchema + '/submittedFormsMetadata', submittedFormMetadata);
  }

  deleteSubmittedForm(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/submittedForms/' + id);
  }

  getProcessingQueue(pageNumber = 0, pageSize = 100, status?: string): Observable<SubmittedFormSummaryPage> {
    let params = new HttpParams().set('page', pageNumber.toString()).set('size', pageSize.toString())
      .set('sort', 'processingCreatedAt,asc').set('owner', this.verificationOwner);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<SubmittedFormSummaryPage>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/submittedFormsMetadata/processing-queue', { params });
  }

  retryProcessing(id: string): Observable<SubmittedFormMetadata> {
    return this.http.post<SubmittedFormMetadata>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/submittedForms/' + id + '/retry', {});
  }

  claimForVerification(id: string): Observable<SubmittedFormMetadata> {
    const params = new HttpParams().set('owner', this.verificationOwner);
    return this.http.post<SubmittedFormMetadata>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/submittedFormsMetadata/' + id + '/verification-lease', {}, { params });
  }

  renewVerificationLease(id: string): Observable<SubmittedFormMetadata> {
    const params = new HttpParams().set('owner', this.verificationOwner);
    return this.http.patch<SubmittedFormMetadata>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/submittedFormsMetadata/' + id + '/verification-lease', {}, { params });
  }

  releaseVerificationLease(id: string): Observable<void> {
    const params = new HttpParams().set('owner', this.verificationOwner);
    return this.http.delete<void>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/submittedFormsMetadata/' + id + '/verification-lease', { params });
  }

  private getOrCreateVerificationOwner(): string {
    const key = 'rallye-schema.verification-device-id';
    let owner = localStorage.getItem(key);
    if (!owner) {
      owner = 'device-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(key, owner);
    }
    return owner;
  }

  getResource<T = any>(url: string): Observable<T> {
    // Route les URLs absolues HAL via le proxy /api pour éviter le mixed-content en HTTPS.
    try {
      const parsed = new URL(url, window.location.origin);
      const proxied = `/api${parsed.pathname}${parsed.search}`;
      return this.http.get<T>(proxied);
    } catch {
      return this.http.get<T>(url);
    }
  }
}
