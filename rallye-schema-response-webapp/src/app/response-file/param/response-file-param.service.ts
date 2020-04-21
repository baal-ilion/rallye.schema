import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { HalCollection } from 'src/app/models/hal-collection';
import { ResponseFileParam } from './models/response-file-param';

@Injectable({
  providedIn: 'root'
})
export class ResponseFileParamService {
  constructor(private http: HttpClient) { }

  getResponseFileParams(): Observable<HalCollection<ResponseFileParam>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams');
  }

  getResponseFileParamByResource(url: string): Observable<ResponseFileParam> {
    return this.http.get<ResponseFileParam>(url);
  }

  createResponseFileParam(param: ResponseFileParam): Observable<ResponseFileParam> {
    return this.http.post<ResponseFileParam>(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams', param);
  }

  updateResponseFileParam(param: ResponseFileParam): Observable<ResponseFileParam> {
    return this.http.put<ResponseFileParam>(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams', param);
  }

  deleteResponseFileParam(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/responseFileParams/' + id);
  }
}
