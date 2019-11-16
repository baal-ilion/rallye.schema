import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResponseFileParamService {

  public host = 'http://192.168.3.50:8080';

  constructor(private http: HttpClient) { }

  getResponseFileParams(): Observable<any> {
    return this.http.get(this.host + '/responseFileParams');
  }

  createResponseFileParam(param): Observable<any> {
    return this.http.post(this.host + '/responseFileParam', param);
  }

  updateResponseFileParam(param): Observable<any> {
    return this.http.put(this.host + '/responseFileParam', param);
  }
}
