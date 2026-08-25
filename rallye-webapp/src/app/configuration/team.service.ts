import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { HalCollection } from '../models/hal-collection';
import { Team } from './models/team';

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  constructor(private http: HttpClient) { }

  getTeams(): Observable<HalCollection<Team>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/teams');
  }

  addTeam(team: Team): Observable<Team> {
    console.log(team);
    return this.http.post<Team>(AppConfigService.settings.apiUrl.rallyeSchema + '/teams', team);
  }

  updateTeam(team: Team): Observable<Team> {
    console.log(team);
    return this.http.put<Team>(AppConfigService.settings.apiUrl.rallyeSchema + '/teams', team);
  }

  setPresence(team: number, present: boolean): Observable<Team> {
    return this.http.put<Team>(
      `${AppConfigService.settings.apiUrl.rallyeSchema}/teams/${team}/presence?present=${present}`,
      {}
    );
  }

  findById(id: string): Observable<Team> {
    return this.http.get<Team>(AppConfigService.settings.apiUrl.rallyeSchema + '/teams/' + id);
  }

  findByTeam(team: number): Observable<Team> {
    const params = new HttpParams().set('team', team.toString());
    return this.http.get<Team>(AppConfigService.settings.apiUrl.rallyeSchema + '/teams/search/findByTeam', { params });
  }

  deleteTeam(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/teams/' + id);
  }
}
