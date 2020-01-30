import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable()
export class AppConfigService {
  static settings: IAppConfig;

  constructor(private http: HttpClient) { }
  load() {
    const jsonFile = './config/config.json';
    return new Promise<void>((resolve, reject) => {
      this.http.get(jsonFile).toPromise().then((response: IAppConfig) => {
        AppConfigService.settings = response;

        console.log('Config Loaded');
        console.log(AppConfigService.settings);
        resolve();

      }).catch((response: any) => {
        reject(`Could not load the config file`);
        AppConfigService.settings = { env: { name: 'default' }, apiUrl: { rallyeSchema: environment.apiUrl } };
      });
    });
  }
}

export interface IAppConfig {
  env: { name: string };
  apiUrl: { rallyeSchema: string };
}
