import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';

@Injectable({
  providedIn: 'root'
})
export class ResponseFileParamService {
  constructor(private http: HttpClient) { }

  getResponseFileParams(): Observable<any> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams');
  }

  getResponseFileParamByResource(url): Observable<any> {
    return this.http.get(url);
  }

  createResponseFileParam(param): Observable<any> {
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams', param);
  }

  updateResponseFileParam(param): Observable<any> {
    return this.http.put(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams', param);
  }

  deleteResponseFileParam(id: any): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams/' + id);
  }
}
