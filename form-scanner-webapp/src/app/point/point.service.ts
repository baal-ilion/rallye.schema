import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PointService {
  constructor(private http: HttpClient) { }

  getPoints(): Observable<any> {
    return this.http.get(environment.apiUrl + '/teamPoints');
  }

  recomputePoints(): Observable<any> {
    return this.http.get(environment.apiUrl + '/teamPoints/recompute');
  }
}
