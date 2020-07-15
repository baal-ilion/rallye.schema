import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';

@Injectable({
  providedIn: 'root'
})
export class LogFileService {
  constructor(private http: HttpClient) { }

  findTeams(): Observable<number[]> {
    return this.http.get<number[]>(AppConfigService.settings.apiUrl.rallyeSchema + '/logFiles/mobileStage');
  }
}
