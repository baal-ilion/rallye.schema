import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../app-config.service';

@Injectable({
  providedIn: 'root'
})
export class PointService {
  constructor(private http: HttpClient) { }

  getPoints(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/teamPoints');
  }

  recomputePoints(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/teamPoints/recompute');
  }
}
