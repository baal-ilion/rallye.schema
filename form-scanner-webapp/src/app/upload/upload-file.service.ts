import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadFileService {
  constructor(private http: HttpClient) { }

  pushFileToStorage(file: File) {
    const formdata = new FormData();
    formdata.append('file', file);
    return this.http.post(environment.apiUrl + '/responseFiles', formdata, {
      reportProgress: true,
      observe: 'events'
    });
  }

  getFiles(): Observable<any> {
    return this.http.get(environment.apiUrl + '/responseFileInfos/search/findByCheckedIsFalse');
  }

  findByStageAndTeam(stage: number, team: number): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.get(environment.apiUrl + '/responseFileInfos/search/findByStageAndTeam', { params });
  }

  updateResponseFileInfoCorners(responseFileInfo): Observable<any> {
    return this.http.patch(environment.apiUrl + '/responseFileInfos', responseFileInfo);
  }
}
