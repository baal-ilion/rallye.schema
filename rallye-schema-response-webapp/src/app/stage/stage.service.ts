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

  updateStage(stage: StageResult): StageResult {
    console.log(stage);
    this.http.patch(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults', stage).toPromise().then(data => {
      console.log(data);
      return data;
    }, error => {
      console.log(error);
    });
    return null;
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

  getResource<T = any>(url: string): Observable<T> {
    return this.http.get<T>(url);
  }
}
