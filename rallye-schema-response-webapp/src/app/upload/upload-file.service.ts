import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { ResponseFileInfo } from './models/response-file-info';
import { HalCollection } from '../models/hal-collection';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {
  constructor(private http: HttpClient) { }

  pushFileToStorage(file: File) {
    const formdata = new FormData();
    formdata.append('file', file);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFiles', formdata, {
      reportProgress: true,
      observe: 'events'
    });
  }

  getFiles(pageNumber = 0, pageSize = 20): Observable<HalCollection<ResponseFileInfo>> {
    const params = new HttpParams().set('page', pageNumber.toString()).set('size', pageSize.toString());
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/search/findByCheckedIsFalse', { params });
  }

  updateResponseFileInfoCorners(responseFileInfo: ResponseFileInfo): Observable<ResponseFileInfo> {
    return this.http.patch<ResponseFileInfo>(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos', responseFileInfo);
  }

  deleteResponseFile(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFiles/' + id);
  }

  getResource<T = any>(url: string): Observable<T> {
    return this.http.get<T>(url);
  }
}
