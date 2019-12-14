import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamInfoService {
  constructor(private http: HttpClient) { }

  getTeamInfos(): Observable<any> {
    return this.http.get(environment.apiUrl + '/teamInfos');
  }

  addTeamInfo(teamInfo): Observable<any> {
    console.log(teamInfo);
    return this.http.post(environment.apiUrl + '/teamInfos', teamInfo);
  }

  updateTeamInfo(teamInfo): Observable<any> {
    console.log(teamInfo);
    return this.http.put(environment.apiUrl + '/teamInfos', teamInfo);
  }
}
