import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { filter, retry, switchMap, take } from 'rxjs/operators';
import { AppConfigService } from '../app-config.service';
import { ResponseFileInfo } from './models/response-file-info';
import { HalCollection } from '../models/hal-collection';
import { ResponseFileSummaryPage } from './models/response-file-summary';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {
  readonly verificationOwner = this.getOrCreateVerificationOwner();

  constructor(private http: HttpClient) { }

  createUploadId(): string {
    return 'upload-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
      + '-' + Math.random().toString(36).slice(2);
  }

  pushFileToStorage(file: File, uploadId?: string) {
    const formdata = new FormData();
    formdata.append('file', file);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFiles', formdata, {
      headers: uploadId ? new HttpHeaders().set('X-Upload-Id', uploadId) : undefined,
      reportProgress: true,
      observe: 'events'
    });
  }

  getFiles(pageNumber = 0, pageSize = 20): Observable<HalCollection<ResponseFileInfo>> {
    const params = new HttpParams().set('page', pageNumber.toString()).set('size', pageSize.toString())
      .set('leaseOwner', this.verificationOwner);
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/search/findByCheckedIsFalse', { params });
  }

  updateResponseFileInfoCorners(responseFileInfo: ResponseFileInfo): Observable<ResponseFileInfo> {
    return this.http.patch<ResponseFileInfo>(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos', responseFileInfo);
  }

  deleteResponseFile(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFiles/' + id);
  }

  getProcessingQueue(pageNumber = 0, pageSize = 100, status?: string): Observable<ResponseFileSummaryPage> {
    let params = new HttpParams().set('page', pageNumber.toString()).set('size', pageSize.toString())
      .set('sort', 'processingCreatedAt,asc').set('owner', this.verificationOwner);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ResponseFileSummaryPage>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/processing-queue', { params });
  }

  retryProcessing(id: string): Observable<ResponseFileInfo> {
    return this.http.post<ResponseFileInfo>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/responseFiles/' + id + '/retry', {});
  }

  waitForProcessing(id: string): Observable<ResponseFileInfo> {
    return timer(0, 1500).pipe(
      switchMap(() => this.http.get<ResponseFileInfo>(
        AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/' + id)),
      retry({ delay: 3000 }),
      filter(info => info.processingStatus === 'ERROR' || info.processingStatus?.startsWith('READY')),
      take(1)
    );
  }

  claimForVerification(id: string): Observable<ResponseFileInfo> {
    const params = new HttpParams().set('owner', this.verificationOwner);
    return this.http.post<ResponseFileInfo>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/' + id + '/verification-lease', {}, { params });
  }

  renewVerificationLease(id: string): Observable<ResponseFileInfo> {
    const params = new HttpParams().set('owner', this.verificationOwner);
    return this.http.patch<ResponseFileInfo>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/' + id + '/verification-lease', {}, { params });
  }

  releaseVerificationLease(id: string): Observable<void> {
    const params = new HttpParams().set('owner', this.verificationOwner);
    return this.http.delete<void>(
      AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/' + id + '/verification-lease', { params });
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
