import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';

@Injectable({
  providedIn: 'root'
})
export class TeamInfoService {
  constructor(private http: HttpClient) { }

  getTeamInfos(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos');
  }

  addTeamInfo(teamInfo): Observable<any> {
    console.log(teamInfo);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos', teamInfo);
  }

  updateTeamInfo(teamInfo): Observable<any> {
    console.log(teamInfo);
    return this.http.put(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos', teamInfo);
  }

  findById(id: any): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos/' + id);
  }
}
