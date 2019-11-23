import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StageParamService {
  constructor(private http: HttpClient) { }

  getStageParams(): Observable<any> {
    return this.http.get(environment.apiUrl + '/stageParams');
  }

  updateStageParam(stageParam): Observable<any> {
    console.log(stageParam);
    return this.http.patch(environment.apiUrl + '/stageParam', stageParam);
  }

  findByStage(stage: any): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString());
    return this.http.get(environment.apiUrl + '/stageParam/search/findByStage', { params });
  }
}
