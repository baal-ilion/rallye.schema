import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResponceFileParamService {

  public host = 'http://192.168.3.50:8080';

  constructor(private http: HttpClient) { }

  getResponceFileParams(): Observable<any> {
    return this.http.get(this.host + '/responceFileParams');
  }

  updateResponceFileParam(param): Observable<any> {
    return this.http.post(this.host + '/responceFileParam', param);
  }
}
