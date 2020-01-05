import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StageService {

  constructor(private http: HttpClient) { }

  getStages(): Observable<any> {
    return this.http.get(environment.apiUrl + '/stageResults');
  }

  getStagesByTeam(team): Observable<any> {
    const params = new HttpParams().set('team', team.toString());
    return this.http.get(environment.apiUrl + '/stageResults/search/findByTeam', { params });
  }

  updateStage(stage): any {
    console.log(stage);
    this.http.patch(environment.apiUrl + '/stageResults', stage).subscribe(data => {
      console.log(data);
      return data;
    }, error => {
      console.log(error);
    });
  }

  beginStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.post(environment.apiUrl + '/stageResults/begin', null, { params });
  }

  endStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.post(environment.apiUrl + '/stageResults/end', null, { params });
  }

  cancelStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.delete(environment.apiUrl + '/stageResults/begin', { params });
  }

  undoStage(stage, team): Observable<any> {
    const params = new HttpParams().set('stage', stage.toString()).set('team', team.toString());
    return this.http.delete(environment.apiUrl + '/stageResults/end', { params });
  }
}
