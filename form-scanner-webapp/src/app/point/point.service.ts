import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PointService {

  public host = 'http://192.168.3.50:8080';

  constructor(private http: HttpClient) { }

  getPoints(): Observable<any> {
    return this.http.get(this.host + '/teamPoints');
  }

  recomputePoints(): Observable<any> {
    return this.http.get(this.host + '/teamPoints/recompute');
  }
}
