import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {
  public host = 'http://192.168.3.50:8080';

  constructor(private http: HttpClient) { }

  pushFileToStorage(file: File) {
    const formdata = new FormData();
    formdata.append('file', file);
    return this.http.post(this.host + '/uploadResponseFile', formdata, {
      reportProgress: true,
      observe: 'events'
    });
  }

  getFiles(): Observable<any> {
    return this.http.get(this.host + '/responseFileInfos');
  }

  findByStageAndTeam(stage: number, team: number): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.get(this.host + '/responseFileInfos/search/findByStageAndTeam', { params });
  }

  updateResponseFileInfoCorners(responseFileInfo): Observable<any> {
    return this.http.patch(this.host + '/responseFileInfo', responseFileInfo);
  }
}
