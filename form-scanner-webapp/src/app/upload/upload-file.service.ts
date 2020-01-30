import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';

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

  getFiles(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos/search/findByCheckedIsFalse');
  }

  updateResponseFileInfoCorners(responseFileInfo): Observable<any> {
    return this.http.patch(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileInfos', responseFileInfo);
  }

  deleteResponseFile(id): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFiles/' + id);
  }

  getResource(url): Observable<any> {
    return this.http.get(url);
  }

}
