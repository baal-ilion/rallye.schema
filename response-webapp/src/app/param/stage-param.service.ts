import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';

@Injectable({
  providedIn: 'root'
})
export class StageParamService {

  constructor(private http: HttpClient) { }

  getStageParams(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams');
  }

  updateStageParam(stageParam): Observable<any> {
    console.log(stageParam);
    return this.http.patch(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams', stageParam);
  }

  addStageParam(stageParam): Observable<any> {
    console.log(stageParam);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams', stageParam);
  }

  findByStage(stage: any): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString());
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams/search/findByStage', { params });
  }

  findById(id: any): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams/' + id);
  }

  deleteStageParam(id: any): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams/' + id);
  }
}
