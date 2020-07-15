import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { HalCollection } from '../models/hal-collection';
import { TeamInfo } from './models/team-info';

@Injectable({
  providedIn: 'root'
})
export class TeamInfoService {
  constructor(private http: HttpClient) { }

  getTeamInfos(): Observable<HalCollection<TeamInfo>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos');
  }

  addTeamInfo(teamInfo: TeamInfo): Observable<TeamInfo> {
    console.log(teamInfo);
    return this.http.post<TeamInfo>(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos', teamInfo);
  }

  updateTeamInfo(teamInfo: TeamInfo): Observable<TeamInfo> {
    console.log(teamInfo);
    return this.http.put<TeamInfo>(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos', teamInfo);
  }

  findById(id: string): Observable<TeamInfo> {
    return this.http.get<TeamInfo>(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos/' + id);
  }

  deleteTeamInfo(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/teamInfos/' + id);
  }
}
