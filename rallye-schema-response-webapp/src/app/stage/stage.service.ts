import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { HalCollection } from '../models/hal-collection';
import { StageResult } from './models/stage-result';

@Injectable({
  providedIn: 'root'
})
export class StageService {

  constructor(private http: HttpClient) { }

  getStages(): Observable<HalCollection<StageResult>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults');
  }

  getStagesByTeam(team: number): Observable<HalCollection<StageResult>> {
    const params = new HttpParams().set('team', team.toString());
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/search/findByTeam', { params });
  }

  updateStage(stage: StageResult): Observable<StageResult> {
    console.log(stage);
    return this.http.patch<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults', stage);
  }

  beginStage(stage: number, team: number): Observable<StageResult> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.post<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/begin', null, { params });
  }

  endStage(stage: number, team: number): Observable<StageResult> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.post<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/end', null, { params });
  }

  cancelStage(stage: number, team: number): Observable<StageResult> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.delete<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/begin', { params });
  }

  undoStage(stage: number, team: number): Observable<StageResult> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.delete<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/end', { params });
  }

  findStage(stage: number, team: number): Observable<StageResult> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.get<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/stageResults/search/findByStageAndTeam', { params });
  }

  selectResponseFile(stage: number, team: number, responseFileId: string, del: boolean): Observable<StageResult> {
    const params = new HttpParams()
      .set('stage', stage.toString())
      .set('team', team.toString())
      .set('responseFileId', responseFileId)
      .set('delete', del.toString());
    return this.http.post<StageResult>(AppConfigService.settings.apiUrl.rallyeSchema +
      '/stageResults/responseFile', params);
  }

  getResource<T = any>(url: string): Observable<T> {
    return this.http.get<T>(url);
  }
}
