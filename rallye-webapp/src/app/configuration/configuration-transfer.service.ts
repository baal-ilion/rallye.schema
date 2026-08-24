import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfigService } from '../app-config.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationTransferService {

  constructor(private http: HttpClient) { }

  importConfigurationArchive(file: File) {
    const formdata = new FormData();
    formdata.append('file', file);
    return this.http.post(AppConfigService.settings.apiUrl.rallyeSchema + '/sharing/configuration', formdata, {
      reportProgress: true,
      observe: 'events'
    });
  }
}
