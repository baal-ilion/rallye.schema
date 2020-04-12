import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { HalCollection } from '../models/hal-collection';
import { StageParam } from './models/stage-param';

@Injectable({
  providedIn: 'root'
})
export class StageParamService {

  constructor(private http: HttpClient) { }

  getStageParams(): Observable<HalCollection<StageParam>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams');
  }

  updateStageParam(stageParam: StageParam): Observable<StageParam> {
    console.log(stageParam);
    return this.http.patch<StageParam>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams', stageParam);
  }

  addStageParam(stageParam: StageParam): Observable<StageParam> {
    console.log(stageParam);
    return this.http.post<StageParam>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams', stageParam);
  }

  findByStage(stage: number): Observable<StageParam> {
    const params = new HttpParams().set('stage', stage.toString());
    return this.http.get<StageParam>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams/search/findByStage', { params });
  }

  findById(id: string): Observable<StageParam> {
    return this.http.get<StageParam>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams/' + id);
  }

  deleteStageParam(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/stageParams/' + id);
  }
}
