import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AppConfigService } from 'src/app/app-config.service';
import { HalCollection } from 'src/app/models/hal-collection';
import { FormRecognitionConfiguration } from './models/form-recognition-configuration';

@Injectable({
  providedIn: 'root'
})
export class FormRecognitionConfigurationService {
  constructor(private http: HttpClient) { }

  getFormRecognitionConfigurations(): Observable<HalCollection<FormRecognitionConfiguration>> {
    return this.http.get(AppConfigService.settings.apiUrl.rallyeSchema + '/formRecognitionConfigurations');
  }

  getFormRecognitionConfigurationByResource(url: string): Observable<FormRecognitionConfiguration> {
    try {
      const parsed = new URL(url, window.location.origin);
      return this.http.get<FormRecognitionConfiguration>(`/api${parsed.pathname}${parsed.search}`);
    } catch {
      return this.http.get<FormRecognitionConfiguration>(url);
    }
  }

  createFormRecognitionConfiguration(configuration: FormData): Observable<FormRecognitionConfiguration> {
    return this.http.post<FormRecognitionConfiguration>(AppConfigService.settings.apiUrl.rallyeSchema + '/formRecognitionConfigurations', configuration);
  }

  updateFormRecognitionConfiguration(configuration: FormData): Observable<FormRecognitionConfiguration> {
    return this.http.put<FormRecognitionConfiguration>(AppConfigService.settings.apiUrl.rallyeSchema + '/formRecognitionConfigurations', configuration);
  }

  deleteFormRecognitionConfiguration(id: string): Observable<any> {
    return this.http.delete(AppConfigService.settings.apiUrl.rallyeSchema + '/formRecognitionConfigurations/' + id);
  }
}
