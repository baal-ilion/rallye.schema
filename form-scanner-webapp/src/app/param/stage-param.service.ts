import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StageParamService {

  public host = 'http://192.168.3.50:8080';

  constructor(private http: HttpClient) { }

  getStageParams(): Observable<any> {
    return this.http.get(this.host + '/stageParams');
  }

  updateStageParam(stageParam): Observable<any> {
    console.log(stageParam);
    return this.http.patch(this.host + '/stageParam', stageParam);
  }
}
