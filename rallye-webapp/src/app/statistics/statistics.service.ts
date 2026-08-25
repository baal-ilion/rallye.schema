import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';
import { StatisticsResponse } from './statistics.types';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  constructor(private http: HttpClient) {}

  getStatistics(): Observable<StatisticsResponse> {
    return this.http.get<StatisticsResponse>(AppConfigService.settings.apiUrl.rallyeSchema + '/statistics');
  }
}
