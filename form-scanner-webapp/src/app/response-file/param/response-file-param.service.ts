import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ResponseFileParamService {
  constructor(private http: HttpClient) { }

  getResponseFileParams(): Observable<any> {
    return this.http.get(environment.apiUrl + '/responseFileParams');
  }

  getResponseFileParamByResource(url): Observable<any> {
    return this.http.get(url);
  }

  createResponseFileParam(param): Observable<any> {
    return this.http.post(environment.apiUrl + '/responseFileParams', param);
  }

  updateResponseFileParam(param): Observable<any> {
    return this.http.put(environment.apiUrl + '/responseFileParams', param);
  }

  deleteResponseFileParam(id: any): Observable<any> {
    return this.http.delete(environment.apiUrl + '/responseFileParams/' + id);
  }
}
