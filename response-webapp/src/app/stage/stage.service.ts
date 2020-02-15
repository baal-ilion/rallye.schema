import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';

@Injectable({
  providedIn: 'root'
})
export class StageService {

  constructor(private http: HttpClient) { }

  getStages(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults');
  }

  getStagesByTeam(team): Observable<any> {
    const params = new HttpParams().set('team', team.toString());
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/search/findByTeam', { params });
  }

  updateStage(stage): any {
    console.log(stage);
    this.http.patch(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults', stage).subscribe(data => {
      console.log(data);
      return data;
    }, error => {
      console.log(error);
    });
  }

  beginStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/begin', null, { params });
  }

  endStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/end', null, { params });
  }

  cancelStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/begin', { params });
  }

  undoStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/stageResults/end', { params });
  }

  getResource(url): Observable<any> {
    return this.http.get(url);
  }
}
